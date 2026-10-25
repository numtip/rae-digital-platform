# Requires EVIDENCE/raw_html/ (rae_home.html) from the research workspace — that capture is excluded from this repo, so this script cannot run here as shipped.
import re
h = open('EVIDENCE/raw_html/rae_home.html', encoding='utf-8', errors='replace').read()
inputs = re.findall(r'<input[^>]*>', h, re.I)
print('INPUTS', len(inputs))
for i in inputs:
    name = re.search(r'name=["\']([^"\']+)', i)
    typ = re.search(r'type=["\']([^"\']+)', i)
    ph = re.search(r'placeholder=["\']([^"\']*)', i)
    print('  ', typ.group(1) if typ else '?', name.group(1) if name else '-', '|', (ph.group(1) if ph else ''))
print('SEARCH TOKEN on home:', 'search' in h.lower())
a = open('EVIDENCE/raw_html/rae_about.html', encoding='utf-8', errors='replace').read()
idx = a.lower().find('search')
print('ABOUT search context:', re.sub(r'\s+', ' ', a[max(0, idx-260):idx+260]) if idx > 0 else 'none')
print('ABOUT inputs:', re.findall(r'<input[^>]*name=["\']([^"\']+)', a, re.I)[:12])
d = open('EVIDENCE/raw_html/rae_news_detail.html', encoding='utf-8', errors='replace').read()
print('DETAIL share tokens:', [t for t in ('facebook', 'line.me', 'twitter', 'share', 'copy') if t in d.lower()])
print('DETAIL breadcrumb:', re.sub(r'\s+', ' ', d[d.lower().find('breadcrumb')-100:d.lower().find('breadcrumb')+200]) if 'breadcrumb' in d.lower() else 'none')
print('DETAIL "ข่าวล่าสุด" related?', 'ข่าวล่าสุด' in d)
