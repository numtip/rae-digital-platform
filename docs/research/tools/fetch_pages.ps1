param(
  [string]$OutDir = "EVIDENCE\raw_html"
)
$ErrorActionPreference = 'Continue'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$targets = @(
  @{ slug='rae';  url='https://rae.mju.ac.th/wtms_index.aspx?&lang=th-TH' },
  @{ slug='spu';  url='https://www.spu.ac.th/' },
  @{ slug='utcc'; url='https://www.utcc.ac.th/' },
  @{ slug='dpu';  url='https://www.dpu.ac.th/th' }
)
$rows = @()
foreach ($t in $targets) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $r = Invoke-WebRequest -Uri $t.url -UseBasicParsing -TimeoutSec 45 -Headers @{ 'User-Agent'='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36'; 'Accept-Language'='th-TH,th;q=0.9,en;q=0.8' }
    $sw.Stop()
    [System.IO.File]::WriteAllText((Join-Path $OutDir "$($t.slug)_home.html"), $r.Content, [System.Text.Encoding]::UTF8)
    $headers = ($r.Headers.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }) -join "`n"
    Set-Content -Path (Join-Path $OutDir "$($t.slug)_home.headers.txt") -Value ("URL: $($t.url)`nSTATUS: $($r.StatusCode)`nELAPSED_MS: $($sw.ElapsedMilliseconds)`nSERVER: $($r.Headers['Server'])`n" + $headers) -Encoding UTF8
    $rows += [pscustomobject]@{ slug=$t.slug; status=$r.StatusCode; ms=$sw.ElapsedMilliseconds; bytes=[System.Text.Encoding]::UTF8.GetByteCount($r.Content); server=$r.Headers['Server']; poweredBy=$r.Headers['X-Powered-By']; contentType=$r.Headers['Content-Type'] }
    Write-Output "$($t.slug) OK $($r.StatusCode) $($sw.ElapsedMilliseconds)ms $([System.Text.Encoding]::UTF8.GetByteCount($r.Content))B"
  } catch {
    $sw.Stop()
    Write-Output "$($t.slug) FAIL $($_.Exception.Message)"
    $rows += [pscustomobject]@{ slug=$t.slug; status='ERR'; ms=$sw.ElapsedMilliseconds; bytes=0; server=$_.Exception.Message; poweredBy=''; contentType='' }
  }
}
$rows | ConvertTo-Json | Set-Content (Join-Path $OutDir 'fetch_summary.json') -Encoding UTF8

# robots.txt and sitemap probes (single request each, polite)
$probes = @(
  @{ slug='rae';  base='https://rae.mju.ac.th' },
  @{ slug='spu';  base='https://www.spu.ac.th' },
  @{ slug='utcc'; base='https://www.utcc.ac.th' },
  @{ slug='dpu';  base='https://www.dpu.ac.th' }
)
$rr = @()
foreach ($p in $probes) {
  foreach ($path in @('/robots.txt','/sitemap.xml','/wp-sitemap.xml','/sitemap_index.xml')) {
    try {
      $resp = Invoke-WebRequest -Uri ($p.base + $path) -UseBasicParsing -TimeoutSec 25 -MaximumRedirection 3 -Headers @{ 'User-Agent'='Mozilla/5.0 (compatible; REA-blueprint-audit/1.0)' }
      $body = $resp.Content
      Set-Content -Path (Join-Path $OutDir "$($p.slug)$($path.Replace('/','_')).txt") -Value $body -Encoding UTF8
      $rr += [pscustomobject]@{ slug=$p.slug; path=$path; status=$resp.StatusCode; bytes=$body.Length; type=$resp.Headers['Content-Type']; first=($body -split "`n" | Select-Object -First 1) }
    } catch {
      $code = ''
      if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
      $rr += [pscustomobject]@{ slug=$p.slug; path=$path; status=$code; bytes=0; type=''; first=$_.Exception.Message.Split([Environment]::NewLine)[0] }
    }
    Start-Sleep -Milliseconds 400
  }
}
$rr | ConvertTo-Json | Set-Content (Join-Path $OutDir 'robots_sitemap_summary.json') -Encoding UTF8
$rr | Format-Table -AutoSize | Out-String -Width 160
