def lum(hex_):
    hex_ = hex_.lstrip('#')
    r, g, b = (int(hex_[i:i+2], 16) / 255 for i in (0, 2, 4))
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    l1, l2 = lum(a), lum(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return round((hi + 0.05) / (lo + 0.05), 2)

pairs = [
    ('white on brand green', '#FFFFFF', '#017F3F'),
    ('white on green-800', '#FFFFFF', '#076B35'),
    ('white on green-900', '#FFFFFF', '#043D1F'),
    ('white on green-600 (#0A8F45)', '#FFFFFF', '#0A8F45'),
    ('white on #0E9A50', '#FFFFFF', '#0E9A50'),
    ('ink on white', '#111827', '#FFFFFF'),
    ('ink on green-50', '#111827', '#F3FAF6'),
    ('ink on green-100', '#111827', '#E6F4EC'),
    ('muted on white', '#5B6470', '#FFFFFF'),
    ('muted on green-50', '#5B6470', '#F3FAF6'),
    ('green-700 link on white', '#017F3F', '#FFFFFF'),
    ('green-800 link on white', '#076B35', '#FFFFFF'),
    ('green-700 on green-50', '#017F3F', '#F3FAF6'),
    ('amber text on white', '#8A5A00', '#FFFFFF'),
    ('amber badge ink', '#3D2A00', '#FFE9A8'),
    ('ink on amber-100', '#111827', '#FFE9A8'),
    ('info blue on white', '#1E5AA8', '#FFFFFF'),
    ('danger on white', '#A4232B', '#FFFFFF'),
    ('white on danger', '#FFFFFF', '#A4232B'),
    ('white on info blue', '#FFFFFF', '#1E5AA8'),
    ('line-strong #84978C vs white', '#84978C', '#FFFFFF'),
    ('line #DCEFE3 vs white (decorative)', '#DCEFE3', '#FFFFFF'),
    ('footer text on green-900', '#E6F4EC', '#043D1F'),
    ('focus amber on green-900', '#FFE9A8', '#043D1F'),
]
for name, fg, bg in pairs:
    r = ratio(fg, bg)
    verdict = 'AA-normal' if r >= 4.5 else ('AA-large/UI' if r >= 3 else 'FAIL')
    print(f'{name:32s} {fg} on {bg}  {r:>5}  {verdict}')

print()
print('Proposed neutral ramp contrast vs white:')
for c in ['#111827', '#374151', '#5B6470', '#6B7280', '#8A929E']:
    print(' ', c, ratio(c, '#FFFFFF'))
