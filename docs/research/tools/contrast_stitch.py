def lum(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    l1, l2 = lum(a), lum(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return round((hi + 0.05) / (lo + 0.05), 2)

def verdict(r, large=False):
    if r >= 7: return 'AAA'
    if r >= 4.5: return 'AA'
    if r >= 3: return 'AA-large/UI only'
    return 'FAIL'

pairs = [
    # Stitch V2 actual palette (app/stitch-landing-v2/stitch-landing.css)
    ('white on brand-primary #005C3B', '#FFFFFF', '#005C3B'),
    ('white on brand-dark #003F2A', '#FFFFFF', '#003F2A'),
    ('white on brand-forest #014D35', '#FFFFFF', '#014D35'),
    ('stitch-text #1F2937 on white', '#1F2937', '#FFFFFF'),
    ('stitch-muted #6B7280 on white', '#6B7280', '#FFFFFF'),
    ('stitch-text on brand-ivory #F7F3EA', '#1F2937', '#F7F3EA'),
    ('gold #D8A01A on white (text)', '#D8A01A', '#FFFFFF'),
    ('white on gold #D8A01A (CTA)', '#FFFFFF', '#D8A01A'),
    ('brand-dark on gold #D8A01A', '#003F2A', '#D8A01A'),
    ('stitch-border #E5E7EB on white (divider)', '#E5E7EB', '#FFFFFF'),
    ('placeholder #9CA3AF on white', '#9CA3AF', '#FFFFFF'),
    # tokens.css institutional palette
    ('maejo-gold #FFDE00 on green #005C3B', '#FFDE00', '#005C3B'),
    ('maejo-gold #FFDE00 on white', '#FFDE00', '#FFFFFF'),
    ('maejo-green #005C3B on gold #FFDE00', '#005C3B', '#FFDE00'),
    ('text #0F1F18 on bg #F6F8F7', '#0F1F18', '#F6F8F7'),
    ('muted #4C4C4C on #F6F8F7', '#4C4C4C', '#F6F8F7'),
    ('white on green-muted #0A7A52', '#FFFFFF', '#0A7A52'),
    ('green #005C3B on green-light #E8F5EF', '#005C3B', '#E8F5EF'),
    ('line #D4E0DA on white', '#D4E0DA', '#FFFFFF'),
    ('line-strong #B8CFC4 on white', '#B8CFC4', '#FFFFFF'),
    ('line-strong #B8CFC4 on #F6F8F7', '#B8CFC4', '#F6F8F7'),
    # legacy RAE site (audit evidence)
    ('legacy white on #017F3F', '#FFFFFF', '#017F3F'),
]
for name, fg, bg in pairs:
    r = ratio(fg, bg)
    print(f'{name:44s} {r:>6}  {verdict(r)}')
