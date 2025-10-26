// public/js/components/sidebar.js
// Responsive sidebar with desktop collapse/expand (icons-only) and no extra mobile positioning button.

export function setupSidebar({ sidebarContainerId = 'sidebar-container' } = {}) {
  const container = document.getElementById(sidebarContainerId);
  if (!container) return null;

  if (container.__sidebar_inited) return container.__sidebar_api || null;
  container.__sidebar_inited = true;

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

    // header: brand + collapse control (desktop) + close (mobile)
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    const brandWrap = document.createElement('div');
    brandWrap.className = 'brand';
    brandWrap.textContent = 'Pandda';

    // collapse toggle (desktop)
    const minBtn = document.createElement('button');
    minBtn.id = 'sidebar-min-btn';
    minBtn.className = 'sidebar-min-btn';
    minBtn.setAttribute('aria-label', 'Alternar minimizado');
    minBtn.type = 'button';
    minBtn.textContent = '⟨⟩';

    // close for mobile
    closeBtn = document.createElement('button');
    closeBtn.id = 'sidebar-close-btn';
    closeBtn.className = 'sidebar-close-btn';
    closeBtn.setAttribute('aria-label', 'Fechar menu');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';

    header.appendChild(brandWrap);
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

  // helper to create items
  function makeItem(href, icon, text, attrs = {}) {
    const li = document.createElement('li');
    li.className = 'sidebar-item';
    const a = document.createElement('a');
    a.href = href;
    a.className = 'sidebar-link';
    a.setAttribute('data-route', href.startsWith('#/') ? href.replace('#/','') : href);
    const iconEl = document.createElement('span');
    iconEl.className = 'icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.innerHTML = icon;
    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = text;
    a.appendChild(iconEl);
    a.appendChild(labelEl);
    for (const k in attrs) a.setAttribute(k, attrs[k]);
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
      if (isSuper) list.appendChild(makeItem('#/admins', '🛠️', 'Admins', 'data-admin="1"'));

      sessionMod.onChange && sessionMod.onChange((st) => {
        const nowSuper = !!st?.isSuper;
        const hasAdmin = !!list.querySelector('[data-admin="1"]');
        if (nowSuper && !hasAdmin) list.appendChild(makeItem('#/admins', '🛠️', 'Admins', 'data-admin="1"'));
        if (!nowSuper && hasAdmin) {
          const el = list.querySelector('[data-admin="1"]');
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }
      });
    } catch (_) {}
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

  function toggleSidebar() {
    if (container.classList.contains('open')) closeSidebar();
    else openSidebar();
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

  // event bindings
  overlay.addEventListener('click', () => { if (isMobile()) closeSidebar(); });

  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

  const minBtn = sidebar.querySelector('#sidebar-min-btn');
  if (minBtn) {
    minBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // toggle collapsed only on desktop
      if (isMobile()) return;
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) closeSidebar();
  });

  try { if (sessionStorage.getItem('pandda_sidebar_open') === '1' && isMobile()) openSidebar(); } catch(_) {}

  window.togglePanddaSidebar = toggleSidebar;

  buildList().catch(()=>{});

  const api = { openSidebar, closeSidebar, toggleSidebar, rebuild: buildList };
  container.__sidebar_api = api;
  return api;
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { setupSidebar(); } catch (_) {}
  });
}
