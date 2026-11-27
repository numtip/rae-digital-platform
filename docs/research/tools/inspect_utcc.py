# Requires EVIDENCE/raw_html/ (utcc_home.html) from the research workspace — that capture is excluded from this repo, so this script cannot run here as shipped.
import re
h = open('EVIDENCE/raw_html/utcc_home.html', encoding='utf-8', errors='replace').read()
arts = [m.start() for m in re.finditer(r'<article', h)]
print('articles', len(arts))
print('first article context:', re.sub(r'\s+', ' ', h[arts[0]:arts[0] + 500])[:500])
mid = arts[len(arts) // 2]
print('mid article context:', re.sub(r'\s+', ' ', h[mid:mid + 400])[:400])
# where do articles live? check whether inside nav/mega menu by looking backwards for 'menu'
before = h[max(0, arts[0] - 4000):arts[0]]
print('preceding classes:', re.findall(r'class="([^"]{0,60})"', before)[-6:])
# count images by src host
srcs = re.findall(r'<img[^>]+src="([^"]+)"', h)
from collections import Counter
print('img srcs', len(srcs), Counter([s.split('/')[2] if '://' in s else 'relative' for s in srcs]).most_common(5))
print('unique img srcs', len(set(srcs)))
# nav depth sample
nav = re.search(r'<nav.*?</nav>', h, re.S)
print('nav len', len(nav.group(0)) if nav else None)
print('duplicate ids', len(re.findall(r'id="([^"]+)"', h)) - len(set(re.findall(r'id="([^"]+)"', h))))
# json-ld presence
print('ld+json blocks', h.count('ld+json'))
print('h1 count', h.count('<h1'))
