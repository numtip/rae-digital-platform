import re
h = open('EVIDENCE/raw_html/rae_home.html', encoding='utf-8', errors='replace').read()

# 1. header "บุคลากรตามโครงสร้าง" anchor
m = re.search(r'<a[^>]*>(?:(?!</a>).){0,400}?บุคลากรตามโครงสร้าง', h, re.S)
print('PERSON LINK:', re.sub(r'\s+', ' ', m.group(0))[:400] if m else 'not found')

# 2. mobile menu mechanism
for pat in ['data-bs-toggle="collapse"', "data-bs-toggle='collapse'", 'data-toggle="collapse"',
            'offcanvas', 'navbar-toggler', 'data-bs-target']:
    print(f'  {pat!r}:', h.count(pat))
mm = re.search(r'class="[^"]*menu-icon-mju[^"]*"', h)
print('menu icon block:', mm.group(0) if mm else None)
# find the element wrapping the mobile header
i = h.find('web-header-sm')
print('mobile header markup:', re.sub(r'\s+', ' ', h[max(0, i-300):i+700])[:900])

# 3. tables and th
print('table open tags:', h.count('<table'), ' th tags:', h.count('<th'))
