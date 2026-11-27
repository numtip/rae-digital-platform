def lum(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    l1, l2 = lum(a), lum(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return round((hi + 0.05) / (lo + 0.05), 2)

def v(r):
    if r >= 7: return 'AAA'
    if r >= 4.5: return 'AA'
    if r >= 3: return 'UI/large only'
    return 'FAIL'

print('--- gold on dark surfaces ---')
for g in ('#D8A01A', '#FFDE00', '#E6C800'):
    for bg in ('#003F2A', '#005C3B', '#014D35'):
        print(f'{g} on {bg}: {ratio(g,bg)} {v(ratio(g,bg))}')

print('\n--- border / UI boundary candidates on white ---')
for c in ('#9CA3AF', '#8A94A3', '#7C8794', '#6B7280', '#D4E0DA', '#B8CFC4', '#A3B3AA'):
    r = ratio(c, '#FFFFFF')
    print(f'{c} on white: {r} {v(r)}')

print('\n--- muted text candidates ---')
for fg, bg in (('#6B7280', '#F7F3EA'), ('#5B6470', '#F7F3EA'), ('#4C4C4C', '#F7F3EA'),
               ('#6B7280', '#FFFFFF'), ('#4C4C4C', '#FFFFFF')):
    r = ratio(fg, bg)
    print(f'{fg} on {bg}: {r} {v(r)}')

print('\n--- CTA combinations ---')
for fg, bg in (('#003F2A', '#D8A01A'), ('#FFFFFF', '#D8A01A'), ('#FFFFFF', '#C79318'),
               ('#003F2A', '#FFDE00'), ('#005C3B', '#FFDE00'), ('#FFFFFF', '#005C3B')):
    r = ratio(fg, bg)
    print(f'{fg} on {bg}: {r} {v(r)}')

print('\n--- focus rings ---')
for c, bg in (('#0A7A52', '#FFFFFF'), ('#D8A01A', '#FFFFFF'), ('#FFDE00', '#003F2A'), ('#FFDE00', '#005C3B')):
    r = ratio(c, bg)
    print(f'{c} on {bg}: {r} {v(r)}')
