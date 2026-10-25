(() => {
  const tags = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
    tag: h.tagName,
    text: (h.textContent || '').trim().slice(0, 60),
    h: Math.round(h.getBoundingClientRect().height),
    cls: (h.className || '').toString().slice(0, 40),
  }));
  return {
    count: tags.length,
    tags,
    countsByTag: tags.reduce((a, t) => ((a[t.tag] = (a[t.tag] || 0) + 1), a), {}),
  };
})()
