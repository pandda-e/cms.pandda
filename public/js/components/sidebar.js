// /js/components/sidebar.js
// Setup and control for responsive sidebar with overlay and desktop collapse (icons-only) mode.
// Exports: setupSidebar({ sidebarContainerId = 'sidebar-container' })

import('/js/auth/session.js').catch(()=>{}); // lazy import inside functions to avoid startup ordering

export function setupSidebar({ sidebarContainerId = 'sidebar-container' } = {}) {
  const container = document.getElementById(sidebarContainerId);
  if (!container) return null;

  if (container.__sidebar_inited) return container.__sidebar_api || null;
  container.__sidebar_inited = true;

  // create overlay and sidebar if missing
  let overlay = container.querySelector('#sidebar-overlay');
  let sidebar = container.querySelector('#sidebar');
  let closeBtn = container.querySelector('#sidebar-close-btn');

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

    // header with minimize control
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    const brand = document.createElement('h2');
    brand.className = 'brand';
    brand.textContent = 'Pandda';

    // minimize toggle (desktop)
    const minBtn = document.createElement('button');
    minBtn.id = 'sidebar-min-btn';
    minBtn.className = 'sidebar-close-btn';
    minBtn.setAttribute('aria-label', 'Minimizar menu');
    minBtn.textContent = '⟨⟩';

    // close for mobile
    closeBtn = document.createElement('button');
    closeBtn.id = 'sidebar-close-btn';
    closeBtn.className = 'sidebar-close-btn';
    closeBtn.setAttribute('aria-label', 'Fechar menu');
    closeBtn.textContent = '✕';

    header.appendChild(brand);
    header.appendChild(minBtn);
    header.appendChild(closeBtn);
    sidebar.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'sidebar-list';
    list.id = 'sidebar-list';
    sidebar.appendChild(list);

    container.appendChild(sidebar);
  } else {
    closeBtn = closeBtn || sidebar.querySelector('#sidebar-close-btn');
  }

  // helper to render items (shows icon and label; label hidden on collapsed desktop)
  function makeItem(href, icon, text, attrs = {}) {
    const li = document.createElement('li');
    li.className = 'sidebar-item';
    const a = document.createElement('a');
    a.href = href;
    a.className = 'sidebar-link';
    a.setAttribute('data-route', href.startsWith('#/') ? href.replace('#/','') : href);
    a.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span><span class="label">${text}</span>`;
    for (const k in attrs) a.setAttribute(k, attrs[k]);
    li.appendChild(a);
    return li;
  }

  // build default items; visibility of admins depends on session isSuper
  async function buildList() {
    const list = sidebar.querySelector('#sidebar-list');
    if (!list) return;
    list.innerHTML = '';

    // always-available entities
    const base = [
      { href: '#/dashboard', icon: '🏠', text: 'Dashboard' },
      { href: '#/clientes', icon: '👥', text: 'Clientes' },
      { href: '#/servidores', icon: '🖥️', text: 'Servidores' },
      { href: '#/aplicativos', icon: '📱', text: 'Aplicativos' },
      { href: '#/planos', icon: '📦', text: 'Planos' }
    ];
    base.forEach(it => list.appendChild(makeItem(it.href, it.icon, it.text)));

    // admins only for superadmin
    try {
      const sessionMod = await import('/js/auth/session.js');
      const isSuper = sessionMod?.getState ? sessionMod.getState().isSuper : false;
      if (isSuper) {
        list.appendChild(makeItem('#/admins', '🛠️', 'Admins', 'data-admin="1"'));
      }
      // listen for session changes to re-render list if role changes
      sessionMod.onChange && sessionMod.onChange((st) => {
        const nowSuper = st?.isSuper ?? false;
        const hasAdminLink = !!list.querySelector('[data-admin="1"]');
        if (nowSuper && !hasAdminLink) list.appendChild(makeItem('#/admins', '🛠️', 'Admins', 'data-admin="1"'));
        if (!nowSuper && hasAdminLink) {
          const el = list.querySelector('[data-admin="1"]');
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }
      });
    } catch (err) {
      // if session module not available, skip admins link
    }
  }

  // collapse state persisted to localStorage
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

  function toggleSidebar() {
    if (container.classList.contains('open')) closeSidebar();
    else openSidebar();
  }

  // initialize collapsed state for desktop
  try {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    const collapsed = stored === '1';
    if (!isMobile()) applyCollapsed(collapsed);
    // when viewport changes, restore appropriate state
    window.addEventListener('resize', () => {
      if (isMobile()) applyCollapsed(false);
      else applyCollapsed(localStorage.getItem(COLLAPSED_KEY) === '1');
    });
  } catch(_) {}

  // handlers
  // overlay click closes on mobile
  overlay.addEventListener('click', (e) => {
    if (isMobile()) closeSidebar();
  });

  // close button
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

  // minimize button
  const minBtn = sidebar.querySelector('#sidebar-min-btn');
  if (minBtn) {
    minBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const collapsed = sidebar.classList.toggle('collapsed');
      try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch(_) {}
    });
  }

  // click outside to close on mobile
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!sidebar) return;
    if (sidebar.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-toggle]')) return;
    if (container.classList.contains('open')) closeSidebar();
  }, { capture: true });

  // ESC closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) closeSidebar();
  });

  // restore open state on mobile
  try {
    if (sessionStorage.getItem('pandda_sidebar_open') === '1' && isMobile()) openSidebar();
  } catch(_) {}

  // expose global toggle
  window.togglePanddaSidebar = toggleSidebar;

  // initial render
  buildList().catch(()=>{});

  const api = { openSidebar, closeSidebar, toggleSidebar, rebuild: buildList };
  container.__sidebar_api = api;
  return api;
}

// Auto-init on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { setupSidebar(); } catch (_) {}
  });
}
