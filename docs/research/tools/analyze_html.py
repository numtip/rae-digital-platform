# Requires EVIDENCE/raw_html/{rae,spu,utcc,dpu}_home.html from the research workspace — that capture is excluded from this repo, so this script cannot run here as shipped.
import sys, json, re, io
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from collections import Counter, OrderedDict

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Node:
    __slots__ = ('tag','attrs','children','parent','text')
    def __init__(self, tag, attrs, parent=None):
        self.tag=tag; self.attrs=dict(attrs); self.children=[]; self.parent=parent; self.text=[]
    def all_text(self):
        return re.sub(r'\s+',' ',''.join(self.text)+' '.join(c.all_text() for c in self.children)).strip()
    def find_all(self, tag):
        out=[]
        if self.tag==tag: out.append(self)
        for c in self.children: out.extend(c.find_all(tag))
        return out
    def classes(self):
        return (self.attrs.get('class') or '').split()

class Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root=Node('#doc',[]); self.stack=[self.root]
    def handle_starttag(self, tag, attrs):
        n=Node(tag,attrs,self.stack[-1]); self.stack[-1].children.append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self, tag, attrs):
        n=Node(tag,attrs,self.stack[-1]); self.stack[-1].children.append(n)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:
                del self.stack[i:]; break
    def handle_data(self, data):
        self.stack[-1].text.append(data)

def analyze(path, slug, base):
    html=open(path,encoding='utf-8',errors='replace').read()
    b=Builder(); b.feed(html)
    root=b.root
    metas=[m.attrs for m in root.find_all('meta')]
    title=(root.find_all('title')[0].all_text() if root.find_all('title') else '')
    def meta_get(name=None, prop=None):
        for m in metas:
            if name and m.get('name','').lower()==name.lower(): return m.get('content')
            if prop and m.get('property','').lower()==prop.lower(): return m.get('content')
        return None
    links=root.find_all('a')
    hrefs=[l.attrs.get('href','') or '' for l in links]
    internal=Counter(); external=Counter()
    host=urlparse(base).netloc
    for h in hrefs:
        u=urljoin(base,h)
        p=urlparse(u)
        if p.netloc==host or (not p.netloc and h):
            pathpart=p.path or '/'
            internal[pathpart]+=1
        elif p.netloc:
            external[p.netloc]+=1
    imgs=root.find_all('img')
    alt_missing=[i.attrs.get('src','') for i in imgs if 'alt' not in i.attrs]
    scripts=[s.attrs.get('src','') for s in root.find_all('script') if s.attrs.get('src')]
    inline_scripts=len([s for s in root.find_all('script') if not s.attrs.get('src')])
    css=[l.attrs.get('href','') for l in root.find_all('link') if 'stylesheet' in (l.attrs.get('rel') or '')]
    headings=[]
    for tag in ('h1','h2','h3','h4'):
        for h in root.find_all(tag):
            t=h.all_text()
            if t: headings.append((tag,t[:100]))
    tables=root.find_all('table')
    layout_tables=[t for t in tables if not t.find_all('th')]
    forms=[(f.attrs.get('action'), f.attrs.get('method'), len(f.find_all('input'))) for f in root.find_all('form')]
    jsonld=[s.all_text()[:400] for s in root.find_all('script') if 'ld+json' in (s.attrs.get('type') or '')]
    hreflangs=[(l.attrs.get('hreflang'), l.attrs.get('href')) for l in root.find_all('link') if l.attrs.get('hreflang')]
    iframes=[(i.attrs.get('src') or '')[:80] for i in root.find_all('iframe')]
    # nav-ish containers
    navs=[]
    for n in root.find_all('nav'):
        navs.append({'tag':'nav','cls':n.classes()[:6],'links':[(a.all_text()[:40], a.attrs.get('href')) for a in n.find_all('a')][:40]})
    # detect menu containers by class hints
    menu=[]
    for d in root.find_all('div')+root.find_all('ul'):
        cls=' '.join(d.classes()).lower()
        if any(k in cls for k in ('menu','nav','breadcrumb')) and d.tag in ('div','ul'):
            a=[(x.all_text()[:40], x.attrs.get('href')) for x in d.find_all('a')]
            if len(a)>=3: menu.append({'tag':d.tag,'id':d.attrs.get('id'),'cls':d.classes()[:5],'n':len(a),'sample':a[:18]})
    menu=sorted(menu,key=lambda m:-m['n'])[:6]
    inline_styles=len([e for e in root.find_all('div') if e.attrs.get('style')])
    return {
        'slug':slug,'base':base,'html_bytes':len(html.encode('utf-8')),
        'title':title,'title_len':len(title),
        'meta_description':meta_get(name='description'),'meta_description_len':len(meta_get(name='description') or ''),
        'meta_keywords':meta_get(name='keywords'),'viewport':meta_get(name='viewport'),
        'generator':meta_get(name='generator'),'robots':meta_get(name='robots'),
        'og':{k:meta_get(prop=k) for k in ('og:title','og:description','og:image','og:site_name','og:type')},
        'twitter':meta_get(name='twitter:card'),
        'canonical':next((l.attrs.get('href') for l in root.find_all('link') if 'canonical' in (l.attrs.get('rel') or '')),None),
        'hreflang':hreflangs,
        'html_lang':next((h.attrs.get('lang') for h in root.find_all('html')),None),
        'headings':headings[:45],'heading_counts':{t:len([h for h in headings if h[0]==t]) for t in ('h1','h2','h3','h4')},
        'link_total':len(links),'internal_paths':internal.most_common(35),'external_hosts':external.most_common(20),
        'img_total':len(imgs),'img_missing_alt':len(alt_missing),'img_missing_alt_sample':alt_missing[:5],
        'img_lazy':len([i for i in imgs if i.attrs.get('loading')=='lazy']),'img_srcset':len([i for i in imgs if i.attrs.get('srcset')]),
        'script_src_count':len(scripts),'script_src_sample':scripts[:14],'inline_script_count':inline_scripts,
        'css_count':len(css),'css_sample':css[:12],
        'tables':len(tables),'layout_tables':len(layout_tables),'forms':forms,'iframes':iframes,
        'jsonld_blocks':len(jsonld),'jsonld_types':[re.findall(r'"@type"\s*:\s*"([^"]+)"',j) for j in jsonld][:6],
        'navs':navs[:4],'menu_candidates':menu,
        'inline_style_attrs':inline_styles,
        'dom_nodes_estimate':html.count('<'),
        'has_skip_link':bool(re.search(r'skip-link|skip to (main|content)|ข้ามไป', html, re.I)),
        'hardcoded_hex':Counter(re.findall(r'#[0-9a-fA-F]{6}\b', html)).most_common(12),
    }

if __name__=='__main__':
    out={}
    for slug,base in [('rae','https://rae.mju.ac.th/'),('spu','https://www.spu.ac.th/'),('utcc','https://www.utcc.ac.th/'),('dpu','https://www.dpu.ac.th/th')]:
        p=f'EVIDENCE/raw_html/{slug}_home.html'
        try:
            out[slug]=analyze(p,slug,base)
        except FileNotFoundError:
            out[slug]={'error':'missing'}
    json.dump(out,open('EVIDENCE/notes/html_analysis.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
    for slug,d in out.items():
        print('='*80); print(slug.upper(), d.get('html_bytes'))
        for k in ('title','title_len','meta_description_len','generator','robots','canonical','html_lang','heading_counts','link_total','img_total','img_missing_alt','img_lazy','script_src_count','css_count','tables','layout_tables','forms','iframes','jsonld_blocks','jsonld_types','hreflang','has_skip_link'):
            v=d.get(k)
            if isinstance(v,str): v=v[:120]
            print(' ',k,'=',v)
        print('  heading outline:', [(t,x[:55]) for t,x in d.get('headings',[])[:16]])
        print('  external:', d.get('external_hosts',[])[:8])
        print('  menus:', json.dumps(d.get('menu_candidates',[]),ensure_ascii=False)[:900])
        print('  hex:', d.get('hardcoded_hex'))
