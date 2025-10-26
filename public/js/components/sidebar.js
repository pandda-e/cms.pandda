// public/js/components/sidebar.js
// Overlay-on-desktop behavior: overlay aligns to content top, rounded corners, height=contentHeight (capped).
// When overlay active we set .sidebar-container.sidebar-overlay-active and inline CSS vars for top and max-height.

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

  // helpers
  function isMobile() { return window.matchMedia('(max-width: 991px)').matches; }
  const COLLAPSED_KEY = 'pandda_sidebar_collapsed';

  function applyCollapsed(collapsed) {
    if (collapsed) sidebar.classList.add('collapsed'); else sidebar.classList.remove('collapsed');
    try { localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); } catch(_) {}
    updateTooltips();
  }

  function readStoredCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch(_) { return false; }
  }

  function openSidebarOverlay(desktopOverlay = false) {
    container.classList.add('open');
    if (desktopOverlay) container.classList.add('sidebar-overlay-active');
    try { sessionStorage.setItem('pandda_sidebar_open', '1'); } catch(_) {}
    document.documentElement.classList.add('no-scroll');
    document.body.style.overflow = 'hidden';
    // If overlay-desktop, compute position/size
    if (desktopOverlay) applyDesktopOverlaySizing();
  }

  function closeSidebarOverlay() {
    container.classList.remove('open');
    container.classList.remove('sidebar-overlay-active');
    try { sessionStorage.removeItem('pandda_sidebar_open'); } catch(_) {}
    document.documentElement.classList.remove('no-scroll');
    document.body.style.overflow = '';
    // remove inline sizing vars
    try {
      container.style.removeProperty('--sidebar-overlay-max-height');
      container.style.removeProperty('--sidebar-overlay-top');
      sidebar.style.removeProperty('top');
      sidebar.style.removeProperty('max-height');
    } catch(_) {}
  }

  function toggleSidebarMobile() {
    if (container.classList.contains('open')) closeSidebarOverlay();
    else openSidebarOverlay(false);
  }

  function toggleCollapsedDesktop() {
    const collapsedNow = sidebar.classList.toggle('collapsed');
    try { localStorage.setItem(COLLAPSED_KEY, collapsedNow ? '1' : '0'); } catch(_) {}
    // If toggled from collapsed -> expanded, open overlay on desktop
    if (!isMobile()) {
      if (!collapsedNow) {
        // expanded: open overlay-desktop
        openSidebarOverlay(true);
      } else {
        // collapsed: close overlay-desktop if present
        closeSidebarOverlay();
      }
    }
    updateTooltips();
  }

  // item builder
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

    iconEl.setAttribute('data-tooltip', text);

    a.appendChild(iconEl);
    a.appendChild(labelEl);

    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
      for (const k in attrs) {
        try { a.setAttribute(k, String(attrs[k])); } catch(_) {}
      }
    }

    a.addEventListener('click', (e) => {
      setActiveRoute(a.getAttribute('data-route') || href);
      if (isMobile()) closeSidebarOverlay();
      else {
        // if overlay-desktop was open, close it after navigation
        if (container.classList.contains('sidebar-overlay-active')) closeSidebarOverlay();
      }
    });

    li.appendChild(a);
    return li;
  }

  function updateTooltips() {
    const icons = sidebar.querySelectorAll('.sidebar-link .icon');
    icons.forEach(ic => {
      const txt = ic.getAttribute('data-tooltip') || ic.nextElementSibling?.textContent || '';
      if (txt) ic.setAttribute('data-tooltip', txt);
      else ic.removeAttribute('data-tooltip');
    });
  }

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
    } catch (_) {}

    updateTooltips();
    setActiveRoute(getCurrentRoute());
  }

  // active-route helpers
  function getCurrentRoute() {
    const h = location.hash || '';
    if (h.startsWith('#/')) return h.replace('#/','');
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

  // overlay sizing helpers (desktop overlay)
  function applyDesktopOverlaySizing() {
    try {
      // find the top of the main content (#view-root) relative to viewport
      const viewRoot = document.querySelector('#view-root') || document.querySelector('main') || document.querySelector('.main-area');
      const contentTop = viewRoot ? viewRoot.getBoundingClientRect().top + window.scrollY : (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-offset')) || 64);
      const topbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-offset')) || 64;

      // desired top (px) for the overlay sidebar: align with viewRoot top (under topbar)
      const desiredTop = contentTop;
      // measure height required by sidebar content
      const list = sidebar.querySelector('.sidebar-list');
      const header = sidebar.querySelector('.sidebar-header');
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const listH = list ? Array.from(list.children).reduce((acc, li)=> acc + li.getBoundingClientRect().height, 0) : 0;
      const contentHeight = Math.ceil(headerH + listH + 24); // padding bottom

      // max height available: from desiredTop to bottom of viewport minus gap
      const available = Math.max(120, window.innerHeight - desiredTop - 24);

      const finalHeight = Math.min(contentHeight, available);

      // set inline styles / CSS vars
      container.style.setProperty('--sidebar-overlay-top', `${desiredTop}px`);
      const maxH = Math.min(available, Math.max(finalHeight, 120));
      container.style.setProperty('--sidebar-overlay-max-height', `${maxH}px`);

      // apply to sidebar styles: position it at desiredTop (relative to viewport via top)
      sidebar.style.top = `${desiredTop}px`;
      sidebar.style.maxHeight = `${maxH}px`;
      sidebar.style.left = `16px`;

      // ensure overlay classes are set (done by caller)
    } catch (e) {
      console.warn('applyDesktopOverlaySizing failed', e);
    }
  }

  // overlay handlers for mobile and desktop
  overlay.addEventListener('click', () => {
    if (isMobile()) closeSidebarOverlay();
    else {
      // if desktop overlay active, close it
      if (container.classList.contains('sidebar-overlay-active')) closeSidebarOverlay();
    }
  });

  document.addEventListener('click', (e) => {
    if (!container.classList.contains('sidebar-overlay-active') && !isMobile()) return;
    if (!sidebar) return;
    if (sidebar.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-toggle]')) return;
    if (container.classList.contains('open')) closeSidebarOverlay();
  }, { capture: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) closeSidebarOverlay();
  });

  // init collapsed state
  try {
    const stored = readStoredCollapsed();
    if (!isMobile()) applyCollapsed(stored);
    window.addEventListener('resize', () => {
      if (isMobile()) applyCollapsed(false);
      else applyCollapsed(readStoredCollapsed());
      // if overlay active, recompute sizing
      if (container.classList.contains('sidebar-overlay-active')) applyDesktopOverlaySizing();
    });
  } catch(_) {}

  // expose global toggle used by topbar hamburger
  window.togglePanddaSidebar = function(source = 'topbar') {
    if (isMobile()) toggleSidebarMobile();
    else toggleCollapsedDesktop();
  };

  // delegation from topbar
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sidebar-toggle]');
    if (!btn) return;
    e.preventDefault();
    if (isMobile()) toggleSidebarMobile(); else toggleCollapsedDesktop();
  });

  window.addEventListener('hashchange', () => setActiveRoute(getCurrentRoute()));
  window.addEventListener('popstate', () => setActiveRoute(getCurrentRoute()));

  // initial
  buildList().catch(()=>{});

  const api = {
    openSidebar: openSidebarOverlay,
    closeSidebar: closeSidebarOverlay,
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
