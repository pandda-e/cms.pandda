// public/js/components/sidebar.js
// Overlay-on-desktop behavior with improved alignment and mobile fix.
// Ensures overlay is placed slightly right, sized to content up to max, and backdrop click closes.
// Desktop: toggle will dock/undock the sidebar and update the layout by toggling a 'collapsed' marker
// on the sidebar-container so CSS can push the main-area correctly.

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
    updateTooltips();
    const main = document.querySelector('.main-area');
    if (main) {
      if (collapsed) main.classList.add('collapsed-fallback'); else main.classList.remove('collapsed-fallback');
    }
  }

  function readStoredCollapsed() {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch(_) { return false; }
  }

  function openSidebarOverlay(desktopOverlay = false) {
    container.classList.add('open');
    container.classList.add('sidebar-overlay-active');

    try { sessionStorage.setItem('pandda_sidebar_open', '1'); } catch(_) {}

    const topbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 64;
    overlay.style.top = `${topbarH}px`;
    overlay.style.height = `calc(100vh - ${topbarH}px)`;

    const gap = 8;
    sidebar.style.top = `${topbarH + gap}px`;
    sidebar.style.left = `18px`;

    document.documentElement.classList.add('no-scroll');
    document.body.style.overflow = 'hidden';

    if (!isMobile()) applyDesktopOverlaySizing();

    requestAnimationFrame(() => {
      overlay.style.opacity = '';
      sidebar.style.transform = 'translateX(0)';
    });
  }

  function closeSidebarOverlay() {
    container.classList.remove('open');
    container.classList.remove('sidebar-overlay-active');
    try { sessionStorage.removeItem('pandda_sidebar_open'); } catch(_) {}

    document.documentElement.classList.remove('no-scroll');
    document.body.style.overflow = '';

    overlay.style.top = '';
    overlay.style.height = '';
    sidebar.style.top = '';
    sidebar.style.maxHeight = '';
    sidebar.style.left = '';

    container.style.removeProperty('--sidebar-overlay-max-height');
  }

  function toggleSidebarMobile() {
    if (container.classList.contains('open')) {
      closeSidebarOverlay();
    } else {
      openSidebarOverlay(false);
    }
  }

  function toggleCollapsedDesktop() {
    const collapsedNow = !sidebar.classList.contains('collapsed');
    applyCollapsed(collapsedNow);

    if (container.classList.contains('sidebar-overlay-active')) {
      container.classList.remove('sidebar-overlay-active');
      overlay.style.top = '';
      overlay.style.height = '';
      sidebar.style.top = '';
      sidebar.style.left = '';
      sidebar.style.maxHeight = '';
      container.style.removeProperty('--sidebar-overlay-max-height');
    }

    container.classList.remove('open');

    updateTooltips();
  }

  function makeItem(href, icon, text, attrs = {}) {
    const li = document.createElement('li');
    li.className = 'sidebar-item';
    const a = document.createElement('a');
    a.href = href;
    a.className = 'sidebar-link';
    a.setAttribute('data-route', href.startsWith('#/') ? href.replace('#/','') : href);
    a.setAttribute('role', 'button');
    a.setAttribute('tabindex', '0');

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
      else if (container.classList.contains('sidebar-overlay-active')) closeSidebarOverlay();
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

  function applyDesktopOverlaySizing() {
    try {
      const viewRoot = document.querySelector('#view-root') || document.querySelector('main') || document.querySelector('.main-area');
      const viewRect = viewRoot ? viewRoot.getBoundingClientRect() : null;
      const topbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 64;
      let desiredTop = topbarH + 8;
      if (viewRect) desiredTop = Math.max(topbarH + 8, viewRect.top + window.scrollY);

      const header = sidebar.querySelector('.sidebar-header');
      const list = sidebar.querySelector('.sidebar-list');
      const headerH = header ? header.getBoundingClientRect().height : 0;
      const items = list ? Array.from(list.children) : [];
      const listH = items.reduce((acc, el) => acc + el.getBoundingClientRect().height, 0);
      const contentHeight = Math.ceil(headerH + listH + 24);

      const available = Math.max(160, window.innerHeight - (desiredTop + 28));
      const finalH = Math.min(contentHeight, available);

      sidebar.style.top = `${desiredTop}px`;
      sidebar.style.left = `18px`;
      sidebar.style.maxHeight = `${finalH}px`;
      container.style.setProperty('--sidebar-overlay-max-height', `${finalH}px`);
    } catch (e) {
      console.warn('applyDesktopOverlaySizing failed', e);
    }
  }

  overlay.addEventListener('click', () => {
    if (container.classList.contains('sidebar-overlay-active') || isMobile()) closeSidebarOverlay();
  });

  document.addEventListener('click', (e) => {
    if (!container.classList.contains('open')) return;
    if (!sidebar) return;
    if (sidebar.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-toggle]')) return;
    closeSidebarOverlay();
  }, { capture: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) closeSidebarOverlay();
  });

  try {
    const stored = readStoredCollapsed();
    if (!isMobile()) applyCollapsed(stored);
    window.addEventListener('resize', () => {
      if (isMobile()) {
        applyCollapsed(false);
      } else {
        applyCollapsed(readStoredCollapsed());
      }
      if (container.classList.contains('sidebar-overlay-active')) applyDesktopOverlaySizing();
    });
  } catch(_) {}

  window.togglePanddaSidebar = function(source = 'topbar') {
    if (isMobile()) toggleSidebarMobile();
    else toggleCollapsedDesktop();
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sidebar-toggle]');
    if (!btn) return;
    e.preventDefault();
    if (isMobile()) toggleSidebarMobile(); else toggleCollapsedDesktop();
  });

  window.addEventListener('hashchange', () => setActiveRoute(getCurrentRoute()));
  window.addEventListener('popstate', () => setActiveRoute(getCurrentRoute()));

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
