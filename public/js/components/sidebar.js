// /js/components/sidebar.js
// Setup and control for responsive sidebar with overlay and click-outside handling.

export function setupSidebar({ sidebarContainerId = 'sidebar-container' } = {}) {
  const container = document.getElementById(sidebarContainerId);
  if (!container) return null;

  // prevent double initialization
  if (container.__sidebar_inited) return container.__sidebar_api || null;
  container.__sidebar_inited = true;

  // If markup isn't present, create baseline markup
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

    // Minimal default header (safe fallback)
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    const brand = document.createElement('h2');
    brand.className = 'brand';
    brand.textContent = 'Pandda';
    closeBtn = document.createElement('button');
    closeBtn.id = 'sidebar-close-btn';
    closeBtn.className = 'sidebar-close-btn';
    closeBtn.setAttribute('aria-label', 'Fechar menu');
    closeBtn.textContent = '✕';
    header.appendChild(brand);
    header.appendChild(closeBtn);
    sidebar.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'sidebar-list';
    // default items (replace/extend in your app)
    const items = [
      { href: '/dashboard', text: 'Dashboard' },
      { href: '/entities', text: 'Entidades' }
    ];
    items.forEach(it => {
      const li = document.createElement('li');
      li.className = 'sidebar-item';
      const a = document.createElement('a');
      a.href = it.href;
      a.textContent = it.text;
      li.appendChild(a);
      list.appendChild(li);
    });
    sidebar.appendChild(list);

    container.appendChild(sidebar);
  } else {
    // ensure we have closeBtn reference
    closeBtn = closeBtn || sidebar.querySelector('#sidebar-close-btn');
  }

  function isMobile() {
    return window.matchMedia('(max-width: 991px)').matches;
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

  // Overlay click closes on mobile
  overlay.addEventListener('click', (e) => {
    if (isMobile()) closeSidebar();
  });

  // Close button
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

  // Click outside fallback: on mobile, clicks outside sidebar close it
  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!sidebar) return;
    if (sidebar.contains(e.target)) return;
    if (e.target.closest('[data-sidebar-toggle]')) return;
    if (container.classList.contains('open')) closeSidebar();
  }, { capture: true });

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) closeSidebar();
  });

  // Restore state on load for mobile (optional)
  try {
    if (sessionStorage.getItem('pandda_sidebar_open') === '1' && isMobile()) {
      openSidebar();
    }
  } catch(_) {}

  // Auto-expose toggle for topbar/hamburger buttons
  window.togglePanddaSidebar = toggleSidebar;

  const api = { openSidebar, closeSidebar, toggleSidebar };
  container.__sidebar_api = api;
  return api;
}

// Auto-init on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { setupSidebar(); } catch (_) {}
  });
}
