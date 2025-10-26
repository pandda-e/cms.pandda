// public/js/components/sidebar.js
// Re-implementação com comportamento:
// - collapsed permanent toggle (via localStorage)
// - collapsed hover expand temporary (desktop)
// - mobile overlay close on outside click / ESC
// - active item management
// - exposes window.togglePanddaSidebar()

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
  }

  function readStoredCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch(_) { return false; }
  }

  function openSidebarOverlay() {
    container.classList.add('open');
    overlay.style.pointerEvents = 'auto';
    document.documentElement.classList.add('no-scroll');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebarOverlay() {
    container.classList.remove('open');
    overlay.style.pointerEvents = 'none';
    document.documentElement.classList.remove('no-scroll');
    document.body.style.overflow = '';
  }

  // toggle behaviors
  function toggleCollapsedDesktop() {
    const collapsedNow = sidebar.classList.toggle('collapsed');
    try { localStorage.setItem(COLLAPSED_KEY, collapsedNow ? '1' : '0'); } catch(_) {}
  }

  function toggleSidebarMobile() {
    if (container.classList.contains('open')) closeSidebarOverlay(); else openSidebarOverlay();
  }

  // Build items
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
        try { a.setAttribute(k, String(attrs[k])); } catch(_) {}
      }
    }

    a.addEventListener('click', (e) => {
      setActiveRoute(a.getAttribute('data-route') || href);
      if (isMobile()) closeSidebarOverlay();
    });

    li.appendChild(a);
    return li;
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

    setActiveRoute(getCurrentRoute());
  }

  // Active-route helpers
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

  // Event handlers for mobile overlay clicks and ESC
  overlay.addEventListener('click', () => { if (isMobile()) closeSidebarOverlay(); });

  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!sidebar) return;
    if (sidebar.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-toggle]')) return;
    if (container.classList.contains('open')) closeSidebarOverlay();
  }, { capture: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) closeSidebarOverlay();
  });

  // Hover expand: only on desktop, only temporary
  let hoverTimeout = null;
  sidebar.addEventListener('mouseenter', () => {
    if (isMobile()) return;
    if (sidebar.classList.contains('collapsed')) {
      // temporary expand on hover
      sidebar.classList.add('hover-expanding');
      // small delay to avoid flicker
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => sidebar.classList.add('expanded-temp'), 40);
    }
  });
  sidebar.addEventListener('mouseleave', () => {
    if (isMobile()) return;
    if (sidebar.classList.contains('collapsed')) {
      clearTimeout(hoverTimeout);
      sidebar.classList.remove('expanded-temp');
      setTimeout(() => { sidebar.classList.remove('hover-expanding'); }, 160);
    }
  });

  // maintain collapsed state across resizes
  try {
    const stored = readStoredCollapsed();
    if (!isMobile()) applyCollapsed(stored);
    window.addEventListener('resize', () => {
      if (isMobile()) applyCollapsed(false);
      else applyCollapsed(readStoredCollapsed());
    });
  } catch (_) {}

  // expose global toggle used by topbar hamburger
  window.togglePanddaSidebar = function() {
    if (isMobile()) toggleSidebarMobile();
    else toggleCollapsedDesktop();
  };

  // delegation from topbar (data-sidebar-toggle)
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
