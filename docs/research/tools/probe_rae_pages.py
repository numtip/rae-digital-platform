import subprocess, json, re, io, urllib.request, time
from html.parser import HTMLParser

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
      'Accept-Language': 'th-TH,th;q=0.9,en;q=0.8'}

targets = [
    ('rae_news_list', 'https://rae.mju.ac.th/wtms_news.aspx?lang=th-TH'),
    ('rae_news_detail', 'https://rae.mju.ac.th/wtms_newsDetail.aspx?nID=38764&lang=th-TH'),
    ('rae_about', 'https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=2022'),
    ('rae_org', 'https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=2387'),
    ('rae_contact', 'https://rae.mju.ac.th/wtms_contact.aspx?lang=th-TH'),
    ('rae_person', 'https://rae.mju.ac.th/wtms_personStructure.aspx?lang=th-TH'),
    ('rae_home_en', 'https://rae.mju.ac.th/wtms_index.aspx?lang=en-US'),
]

class Probe(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title=''; self.in_title=False; self.h=[]; self.cur=None
        self.meta={}; self.tables=0; self.forms=0; self.br=0; self.imgs=0; self.noalt=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='title': self.in_title=True
        if tag in ('h1','h2','h3'): self.cur=[tag,[]]
        if tag=='meta':
            k=a.get('name') or a.get('property')
            if k: self.meta[k]=a.get('content','')
        if tag=='table': self.tables+=1
        if tag=='form': self.forms+=1
        if tag=='img':
            self.imgs+=1
            if 'alt' not in a: self.noalt+=1
        c=(a.get('class') or '').lower()
        if 'breadcrumb' in c: self.br+=1
    def handle_endtag(self, tag):
        if tag=='title': self.in_title=False
        if self.cur and tag==self.cur[0]:
            self.h.append((self.cur[0], re.sub(r'\s+',' ',''.join(self.cur[1]))[:90])); self.cur=None
    def handle_data(self, d):
        if self.in_title: self.title+=d
        if self.cur: self.cur[1].append(d)

out=[]
for slug,url in targets:
    t0=time.time()
    try:
        req=urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=40) as r:
            body=r.read(); code=r.status; hdr=dict(r.headers)
        el=int((time.time()-t0)*1000)
        html=body.decode('utf-8','replace')
        open(f'EVIDENCE/raw_html/{slug}.html','w',encoding='utf-8').write(html)
        p=Probe(); p.feed(html)
        rec={'slug':slug,'url':url,'status':code,'ms':el,'bytes':len(body),
             'title':re.sub(r'\s+',' ',p.title).strip()[:120],
             'meta_desc':p.meta.get('description'),'og':{k:v for k,v in p.meta.items() if k.startswith('og:')},
             'viewport':p.meta.get('viewport'),'lang':re.findall(r'<html([^>]*)>',html)[:1],
             'headings':p.h[:8],'tables':p.tables,'forms':p.forms,'breadcrumb_hits':p.br,
             'img':p.imgs,'img_no_alt':p.noalt,
             'has_jsonld':'application/ld+json' in html,
             'server':hdr.get('Server'),'powered':hdr.get('X-Powered-By'),'cache':hdr.get('Cache-Control') or hdr.get('cache-control'),
             'x_aspnet':hdr.get('X-AspNet-Version'),'set_cookie_count':(hdr.get('Set-Cookie') or '').count('='),
             'has_search_input':bool(re.search(r'type=[\"\']search|name=[\"\']?(search|q|keyword)', html, re.I)),
             'canonical':bool(re.search(r'rel=[\"\']canonical', html, re.I)),
             'h1_count':len([h for h in p.h if h[0]=='h1'])}
        out.append(rec)
        print(json.dumps(rec, ensure_ascii=False))
    except Exception as e:
        out.append({'slug':slug,'url':url,'error':str(e)[:200]})
        print(slug,'ERR',str(e)[:160])
    time.sleep(1.2)

json.dump(out, open('EVIDENCE/notes/rae_subpage_probe.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
