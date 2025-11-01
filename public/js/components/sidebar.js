// public/js/components/sidebar.js
// Sidebar com overlay no mobile, docking e collapse no desktop (ícones apenas).
// Refinamentos: aria attributes, focus trap when overlay open, smoother transitions,
// destaque visível ao ativar item, persistência robusta, eventos customizados para sincronização.

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
    overlay.tabIndex = -1;
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
    dispatchChangedEvent();
  }

  function readStoredCollapsed() {
    try {
      const raw = localStorage.getItem(COLLAPSED_KEY);
      return raw === '1';
    } catch(_) { return false; }
  }

  function openSidebarOverlay() {
    container.classList.add('open');
    container.classList.add('sidebar-overlay-active');
    container.setAttribute('aria-hidden', 'false');

    try { sessionStorage.setItem('pandda_sidebar_open', '1'); } catch(_) {}

    // Place overlay and sidebar below topbar so topbar stays visible above overlay.
    const topbarH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--topbar-height')) || 64;
    overlay.style.top = `${topbarH}px`;
    overlay.style.height = `calc(100vh - ${topbarH}px)`;

    const gap = 8;
    sidebar.style.top = `${topbarH + gap}px`;
    sidebar.style.left = `18px`;
    sidebar.style.transform = 'translateX(0)';

    document.documentElement.classList.add('no-scroll');
    document.body.style.overflow = 'hidden';

    // focus management: move focus into first interactive element
    trapFocusInto(sidebar);

    if (!isMobile()) applyDesktopOverlaySizing();

    requestAnimationFrame(() => {
      overlay.style.opacity = '';
      sidebar.style.opacity = '';
    });

    dispatchChangedEvent();
  }

  function closeSidebarOverlay() {
    container.classList.remove('open');
    container.classList.remove('sidebar-overlay-active');
    container.setAttribute('aria-hidden', 'true');
    try { sessionStorage.removeItem('pandda_sidebar_open'); } catch(_) {}

    document.documentElement.classList.remove('no-scroll');
    document.body.style.overflow = '';

    overlay.style.top = '';
    overlay.style.height = '';
    sidebar.style.top = '';
    sidebar.style.maxHeight = '';
    sidebar.style.left = '';
    sidebar.style.transform = '';
    sidebar.style.opacity = '';

    container.style.removeProperty('--sidebar-overlay-max-height');

    releaseFocusTrap();

    dispatchChangedEvent();
  }

  function toggleSidebarMobile() {
    if (container.classList.contains('open')) {
      closeSidebarOverlay();
    } else {
      openSidebarOverlay();
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

    a.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        a.click();
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
      // visual focus highlight
      candidate.setAttribute('aria-current', 'page');
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

  // Click on backdrop closes overlay (mobile or overlay state)
  overlay.addEventListener('click', (e) => {
    if (container.classList.contains('sidebar-overlay-active') || isMobile()) closeSidebarOverlay();
  });

  // Click outside sidebar closes when overlay is open (capture)
  document.addEventListener('click', (e) => {
    if (!container.classList.contains('open')) return;
    if (!sidebar) return;
    if (sidebar.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-toggle]')) return;
    closeSidebarOverlay();
  }, { capture: true });

  // Escape closes overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) closeSidebarOverlay();
  });

  // Responsive persisted collapsed state
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

  // Toggle function exposed globally
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

  // focus trap utilities
  let lastFocusedBeforeTrap = null;
  let focusableElements = [];
  let focusTrapHandler = null;

  function getFocusableWithin(root) {
    const selectors = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll(selectors)).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
  }

  function trapFocusInto(root) {
    try {
      lastFocusedBeforeTrap = document.activeElement;
      focusableElements = getFocusableWithin(root);
      if (focusableElements.length) focusableElements[0].focus();
      focusTrapHandler = function(e) {
        if (e.key !== 'Tab') return;
        const nodes = focusableElements;
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', focusTrapHandler);
    } catch(_) {}
  }

  function releaseFocusTrap() {
    try {
      if (focusTrapHandler) document.removeEventListener('keydown', focusTrapHandler);
      focusTrapHandler = null;
      focusableElements = [];
      if (lastFocusedBeforeTrap && typeof lastFocusedBeforeTrap.focus === 'function') lastFocusedBeforeTrap.focus();
      lastFocusedBeforeTrap = null;
    } catch(_) {}
  }

  function dispatchChangedEvent() {
    try {
      document.dispatchEvent(new CustomEvent('pandda:sidebar:changed', { detail: { open: container.classList.contains('open'), collapsed: sidebar.classList.contains('collapsed') } }));
      // also set a general event
      try { window.dispatchEvent(new CustomEvent('pandda:sidebar:state', { detail: { open: container.classList.contains('open'), collapsed: sidebar.classList.contains('collapsed') } })); } catch(_) {}
    } catch(_) {}
  }

  function setActiveFromLocation() {
    setActiveRoute(getCurrentRoute());
  }

  // expose api
  const api = {
    openSidebar: openSidebarOverlay,
    closeSidebar: closeSidebarOverlay,
    toggleSidebar: window.togglePanddaSidebar,
    rebuild: buildList,
    setActiveFromLocation,
    isOpen: () => container.classList.contains('open'),
    isCollapsed: () => sidebar.classList.contains('collapsed')
  };
  container.__sidebar_api = api;

  // initial sync: trigger event so topbar updates aria-expanded
  setTimeout(() => dispatchChangedEvent(), 30);

  return api;
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { setupSidebar(); } catch (_) {}
  });
}
