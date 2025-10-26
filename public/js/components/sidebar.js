// public/js/components/sidebar.js
// Responsive sidebar with desktop collapse/expand (icons-only).
// - Removed sidebar-close-btn entirely
// - Items mark themselves active on click and on navigation changes
// - Exposes window.togglePanddaSidebar for topbar to call
// - Idempotent setup via container.__sidebar_inited

export function setupSidebar({ sidebarContainerId = 'sidebar-container' } = {}) {
  const container = document.getElementById(sidebarContainerId);
  if (!container) return null;

  if (container.__sidebar_inited) return container.__sidebar_api || null;
  container.__sidebar_inited = true;

  let overlay = container.querySelector('#sidebar-overlay');
  let sidebar = container.querySelector('#sidebar');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    container.appendChild(overlay);
  }

  if (!sidebar) {
    sidebar = document.createElement('nav');
    sidebar.id = 'sidebar';
    sidebar.className = 'sidebar';
    sidebar.setAttribute('role', 'navigation');
    sidebar.setAttribute('aria-label', 'Sidebar');

    // header: brand only (no close/minimize buttons here)
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    const brandWrap = document.createElement('div');
    brandWrap.className = 'brand';
    const logo = document.createElement('div');
    logo.className = 'logo';
    logo.setAttribute('aria-hidden', 'true');
    brandWrap.appendChild(logo);
    const title = document.createElement('div');
    title.className = 'brand-title';
    title.innerHTML = '<div style="font-weight:700">Pandda</div><div class="small">Painel</div>';
    brandWrap.appendChild(title);

    header.appendChild(brandWrap);
    sidebar.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'sidebar-list';
    list.id = 'sidebar-list';
    sidebar.appendChild(list);

    container.appendChild(sidebar);
  }

  // helper to create items (attrs must be plain object)
  function makeItem(href, icon, text, attrs = {}) {
    const li = document.createElement('li');
    li.className = 'sidebar-item';
    const a = document.createElement('a');
    a.href = href;
    a.className = 'sidebar-link';
    a.setAttribute('data-route', href.startsWith('#/') ? href.replace('#/','') : href);
    a.setAttribute('role', 'button');

    const iconEl = document.createElement('span');
    iconEl.className = 'icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = text;

    a.appendChild(iconEl);
    a.appendChild(labelEl);

    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
      for (const k in attrs) {
        try { a.setAttribute(k, String(attrs[k])); } catch(_) { /* ignore invalid names */ }
      }
    }

    // clicking an item marks it active and closes on mobile
    a.addEventListener('click', (e) => {
      // allow normal anchor navigation; set active class
      setActiveRoute(a.getAttribute('data-route') || href);
      if (isMobile()) {
        closeSidebar();
      }
    });

    li.appendChild(a);
    return li;
  }

  // build list with admins conditional
  async function buildList() {
    const list = sidebar.querySelector('#sidebar-list');
    if (!list) return;
    list.innerHTML = '';

    const base = [
      { href: '#/dashboard', icon: '🏠', text: 'Dashboard' },
      { href: '#/clientes', icon: '👥', text: 'Clientes' },
      { href: '#/servidores', icon: '🖥️', text: 'Servidores' },
      { href: '#/aplicativos', icon: '📱', text: 'Aplicativos' },
      { href: '#/planos', icon: '📦', text: 'Planos' }
    ];
    base.forEach(it => list.appendChild(makeItem(it.href, it.icon, it.text)));

    try {
      const sessionMod = await import('/js/auth/session.js');
      const isSuper = sessionMod?.getState ? sessionMod.getState().isSuper : false;
      if (isSuper) list.appendChild(makeItem('#/admins', '🛠️', 'Admins', { 'data-admin': '1' }));

      sessionMod.onChange && sessionMod.onChange((st) => {
        const nowSuper = !!st?.isSuper;
        const hasAdmin = !!list.querySelector('[data-admin="1"]');
        if (nowSuper && !hasAdmin) list.appendChild(makeItem('#/admins', '🛠️', 'Admins', { 'data-admin': '1' }));
        if (!nowSuper && hasAdmin) {
          const el = list.querySelector('[data-admin="1"]');
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }
      });
    } catch (_) {
      // session module not available; skip admins link
    }

    // after building, set active based on current hash/route
    setActiveRoute(getCurrentRoute());
  }

  // collapsed state
  const COLLAPSED_KEY = 'pandda_sidebar_collapsed';
  function isMobile() { return window.matchMedia('(max-width: 991px)').matches; }

  function applyCollapsed(collapsed) {
    if (collapsed) sidebar.classList.add('collapsed');
    else sidebar.classList.remove('collapsed');
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch(_) {}
  }

  function openSidebar() {
    container.classList.add('open');
    try { sessionStorage.setItem('pandda_sidebar_open', '1'); } catch(_) {}
    document.documentElement.classList.add('no-scroll');
  }

  function closeSidebar() {
    container.classList.remove('open');
    try { sessionStorage.removeItem('pandda_sidebar_open'); } catch(_) {}
    document.documentElement.classList.remove('no-scroll');
  }

  function toggleSidebarMobile() {
    if (container.classList.contains('open')) closeSidebar();
    else openSidebar();
  }

  function toggleCollapsedDesktop() {
    const collapsed = sidebar.classList.toggle('collapsed');
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch(_) {}
  }

  // initialize collapsed according to saved state and viewport
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    const collapsed = stored === '1';
    if (!isMobile()) applyCollapsed(collapsed);
    window.addEventListener('resize', () => {
      if (isMobile()) applyCollapsed(false);
      else applyCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    });
  } catch(_) {}

  // overlay click closes on mobile
  overlay.addEventListener('click', () => { if (isMobile()) closeSidebar(); });

  // click outside to close on mobile (delegation)
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!sidebar) return;
    if (sidebar.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-toggle]')) return;
    if (container.classList.contains('open')) closeSidebar();
  }, { capture: true });

  // ESC closes on mobile
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) closeSidebar();
  });

  // restore open state on mobile
  try {
    if (sessionStorage.getItem('pandda_sidebar_open') === '1' && isMobile()) openSidebar();
  } catch(_) {}

  // expose global toggle used by topbar hamburger
  window.togglePanddaSidebar = function() {
    if (isMobile()) toggleSidebarMobile();
    else toggleCollapsedDesktop();
  };

  // delegation from topbar (ensures clicks on elements with data-sidebar-toggle also work)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sidebar-toggle]');
    if (!btn) return;
    e.preventDefault();
    if (isMobile()) toggleSidebarMobile();
    else toggleCollapsedDesktop();
  });

  // Active-route helpers -------------------------------------------------
  function getCurrentRoute() {
    const h = location.hash || '';
    if (h.startsWith('#/')) return h.replace('#/', '');
    return location.pathname.replace(/^\//, '');
  }

  function setActiveRoute(route) {
    const list = sidebar.querySelector('#sidebar-list');
    if (!list) return;
    const normalized = (route || '').toString().replace(/^\//, '').replace(/\/$/, '');
    list.querySelectorAll('.sidebar-link.active').forEach(el => el.classList.remove('active'));
    const candidate = list.querySelector(`.sidebar-link[data-route="${normalized}"], .sidebar-link[href="#/${normalized}"], .sidebar-link[href="/${normalized}"]`);
    if (candidate) {
      candidate.classList.add('active');
      candidate.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  // update active on hashchange/navigation
  window.addEventListener('hashchange', () => setActiveRoute(getCurrentRoute()));
  window.addEventListener('popstate', () => setActiveRoute(getCurrentRoute()));

  // initial render
  buildList().catch(()=>{});

  const api = {
    openSidebar,
    closeSidebar,
    toggleSidebar: window.togglePanddaSidebar,
    rebuild: buildList
  };
  container.__sidebar_api = api;
  return api;
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { setupSidebar(); } catch (_) {}
  });
}
