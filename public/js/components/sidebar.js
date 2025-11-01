// public/js/components/sidebar.js
// Sidebar reescrita do zero: apenas lista de entidades + session-driven "Admins" entry.
// Overlay on mobile; desktop collapse shows icons; click-outside closes overlay.
// Exposes simple API via container.__sidebar_api.

export async function setupSidebar(containerSelector = 'sidebar-container') {
  const id = typeof containerSelector === 'string' ? containerSelector : (containerSelector.id || 'sidebar-container');
  const container = document.getElementById(id);
  if (!container) return null;
  if (container.__sidebar_api) return container.__sidebar_api;

  // ensure container is empty / prepared
  container.innerHTML = '';
  container.classList.remove('open', 'sidebar-overlay-active', 'collapsed');

  // create overlay and sidebar
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';
  overlay.className = 'sidebar-overlay';
  overlay.tabIndex = -1;

  const sidebar = document.createElement('nav');
  sidebar.id = 'sidebar';
  sidebar.className = 'sidebar';
  sidebar.setAttribute('role', 'navigation');
  sidebar.setAttribute('aria-label', 'Sidebar');

  // header (logo + title)
  const header = document.createElement('div');
  header.className = 'sidebar-header';
  const brand = document.createElement('div');
  brand.className = 'brand';
  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.setAttribute('aria-hidden', 'true');
  const brandTitle = document.createElement('div');
  brandTitle.className = 'brand-title';
  brandTitle.innerHTML = '<div style="font-weight:700">Pandda</div><div class="small">Painel</div>';
  brand.appendChild(logo);
  brand.appendChild(brandTitle);
  header.appendChild(brand);
  sidebar.appendChild(header);

  // list
  const list = document.createElement('ul');
  list.id = 'sidebar-list';
  list.className = 'sidebar-list';
  sidebar.appendChild(list);

  container.appendChild(overlay);
  container.appendChild(sidebar);

  // helpers
  const COLLAPSED_KEY = 'pandda_sidebar_collapsed';
  function isMobile() { return window.matchMedia('(max-width: 991px)').matches; }

  function applyCollapsed(collapsed) {
    if (collapsed) {
      sidebar.classList.add('collapsed');
      container.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
      container.classList.remove('collapsed');
    }
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch(_) {}
    dispatchState();
  }

  function readCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch(_) { return false; }
  }

  function openOverlay() {
    container.classList.add('open', 'sidebar-overlay-active');
    // position below topbar using CSS var --topbar-height (set by topbar)
    const topH = getTopbarHeight();
    overlay.style.top = `${topH}px`;
    overlay.style.height = `calc(100vh - ${topH}px)`;
    sidebar.style.top = `${topH + 8}px`;
    // focus management: move focus to first link
    const f = sidebar.querySelector('a, button, [tabindex]');
    try { f && f.focus(); } catch(_) {}
    document.documentElement.classList.add('no-scroll');
    document.body.style.overflow = 'hidden';
    dispatchState();
  }

  function closeOverlay() {
    container.classList.remove('open', 'sidebar-overlay-active');
    overlay.style.top = '';
    overlay.style.height = '';
    sidebar.style.top = '';
    document.documentElement.classList.remove('no-scroll');
    document.body.style.overflow = '';
    dispatchState();
  }

  function toggleOverlay() { if (container.classList.contains('open')) closeOverlay(); else openOverlay(); }
  function toggleCollapsed() { applyCollapsed(!sidebar.classList.contains('collapsed')); }

  // Build items (minimal: names + icons)
  function makeItem(href, icon, text, attrs = {}) {
    const li = document.createElement('li');
    li.className = 'sidebar-item';
    const a = document.createElement('a');
    a.className = 'sidebar-link';
    a.href = href;
    a.setAttribute('data-route', href.startsWith('#/') ? href.replace('#/','') : href);
    a.setAttribute('role', 'button');
    a.tabIndex = 0;
    a.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span><span class="label">${text}</span>`;
    for (const k in attrs) try { a.setAttribute(k, attrs[k]); } catch(_) {}
    a.addEventListener('click', (e) => {
      // set active and close overlay on mobile
      setActive(a.getAttribute('data-route') || href);
      if (isMobile()) closeOverlay();
    });
    a.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); a.click(); }});
    li.appendChild(a);
    return li;
  }

  async function buildList() {
    list.innerHTML = '';
    const base = [
      { href: '#/dashboard', icon: '🏠', text: 'Dashboard' },
      { href: '#/clientes', icon: '👥', text: 'Clientes' },
      { href: '#/servidores', icon: '🖥️', text: 'Servidores' },
      { href: '#/aplicativos', icon: '📱', text: 'Aplicativos' },
      { href: '#/planos', icon: '📦', text: 'Planos' }
    ];
    base.forEach(it => list.appendChild(makeItem(it.href, it.icon, it.text)));
    // session-based admin link
    try {
      const sessionMod = await import('/js/auth/session.js').catch(() => null);
      if (sessionMod) {
        const st = sessionMod.getState ? sessionMod.getState() : {};
        if (st?.isSuper) list.appendChild(makeItem('#/admins', '🛠️', 'Admins', { 'data-admin': '1' }));
        sessionMod.onChange && sessionMod.onChange((s) => {
          const present = !!list.querySelector('[data-admin="1"]');
          if (s?.isSuper && !present) list.appendChild(makeItem('#/admins', '🛠️', 'Admins', { 'data-admin': '1' }));
          if (!s?.isSuper && present) {
            const el = list.querySelector('[data-admin="1"]');
            el && el.parentNode && el.parentNode.removeChild(el);
          }
        });
      }
    } catch(_) {}
    setActive(getCurrentRoute());
  }

  function getCurrentRoute() {
    const h = location.hash || '';
    if (h.startsWith('#/')) return h.replace('#/','');
    return location.pathname.replace(/^\//, '');
  }

  function setActive(route) {
    const normalized = (route || '').toString().replace(/^\//, '').replace(/\/$/, '');
    list.querySelectorAll('.sidebar-link.active').forEach(x => x.classList.remove('active'));
    const candidate = list.querySelector(`.sidebar-link[data-route="${normalized}"], .sidebar-link[href="#/${normalized}"]`);
    if (candidate) {
      candidate.classList.add('active');
      candidate.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function getTopbarHeight() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--topbar-height') || '';
    const n = Number(String(raw).replace('px','')) || 0;
    if (n > 0) return n;
    const tb = document.querySelector('.topbar');
    if (tb) return Math.round(tb.getBoundingClientRect().height || 64);
    return 64;
  }

  // clicking overlay or outside sidebar closes when overlay open
  overlay.addEventListener('click', () => { if (container.classList.contains('sidebar-overlay-active') || isMobile()) closeOverlay(); });

  document.addEventListener('click', (e) => {
    if (!container.classList.contains('open')) return;
    if (sidebar.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-toggle]')) return;
    closeOverlay();
  }, { capture: true });

  // Escape closes
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && container.classList.contains('open')) closeOverlay(); });

  // toggle binding on delegated buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sidebar-toggle]');
    if (!btn) return;
    e.preventDefault();
    if (isMobile()) toggleOverlay(); else toggleCollapsed();
  });

  // respond to hash changes
  window.addEventListener('hashchange', () => setActive(getCurrentRoute()));

  // react to topbar resize event to reposition overlay
  window.addEventListener('pandda:topbar:resized', () => {
    if (container.classList.contains('open') || container.classList.contains('sidebar-overlay-active')) {
      const topH = getTopbarHeight();
      overlay.style.top = `${topH}px`;
      overlay.style.height = `calc(100vh - ${topH}px)`;
      sidebar.style.top = `${topH + 8}px`;
    }
  });

  // expose minimal API
  const api = {
    open: openOverlay,
    close: closeOverlay,
    toggle: () => { if (isMobile()) toggleOverlay(); else toggleCollapsed(); },
    rebuild: buildList,
    isOpen: () => container.classList.contains('open'),
    isCollapsed: () => sidebar.classList.contains('collapsed'),
    container, sidebar
  };
  container.__sidebar_api = api;

  // initial state
  try { if (!isMobile()) applyCollapsed(readCollapsed()); else applyCollapsed(false); } catch(_) {}
  buildList().catch(() => {});
  // ensure topbar height applied if available
  setTimeout(() => {
    const topH = getTopbarHeight();
    document.documentElement.style.setProperty('--topbar-height', `${topH}px`);
  }, 40);

  return api;
}

// auto-setup on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { setupSidebar(); } catch (_) {}
  });
}
