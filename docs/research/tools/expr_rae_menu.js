(() => {
  const empty = [...document.querySelectorAll('a')].filter((a) => {
    const t = (a.textContent || '').trim();
    const lab = a.getAttribute('aria-label') || a.getAttribute('title');
    const img = a.querySelector('img[alt]:not([alt=""])');
    return !t && !lab && !img && a.getBoundingClientRect().width > 0;
  });
  const modal = document.querySelector('#siteMenu');
  return {
    unnamedCount: empty.length,
    unnamed: empty.slice(0, 8).map((a) => ({
      cls: (a.className || '').toString().slice(0, 30),
      href: a.getAttribute('href'),
      target: a.getAttribute('data-bs-target'),
      icon: (a.innerHTML || '').slice(0, 80),
    })),
    modal: modal
      ? {
          role: modal.getAttribute('role'),
          label: modal.getAttribute('aria-label'),
          labelledby: modal.getAttribute('aria-labelledby'),
          links: modal.querySelectorAll('a').length,
          h: Math.round(modal.getBoundingClientRect().height),
        }
      : null,
    headerFixed: [...document.querySelectorAll('.fixed-top')].length,
  };
})()
