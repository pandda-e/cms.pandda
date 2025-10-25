// public/js/components/topbar.js
// Builds the topbar using DOM methods only (no innerHTML fetch or template injection).
// Exports: mountTopbar(container = '#topbar-container')
// Safe to import multiple times; idempotent mount.

function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') el.className = attrs[k];
    else if (k === 'text') el.textContent = attrs[k];
    else if (k === 'html') el.innerHTML = attrs[k]; // reserved but not used by our code
    else if (k.startsWith('data-')) el.setAttribute(k, attrs[k]);
    else el.setAttribute(k, attrs[k]);
  }
  children.forEach(c => {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else if (c instanceof Node) el.appendChild(c);
  });
  return el;
}

function createTopbarStructure() {
  // left area: hamburger + brand
  const hamburger = createEl('button', {
    class: 'topbar-hamburger',
    'aria-label': 'Abrir menu',
    'data-sidebar-toggle': '1',
    type: 'button'
  }, ['☰']);
  const brand = createEl('span', { class: 'brand', text: 'Pandda' });

  const left = createEl('div', { class: 'topbar-left' }, [hamburger, brand]);

  // right area: search (optional) + profile button
  const profileBtn = createEl('button', { id: 'topbar-profile-btn', class: 'topbar-btn', type: 'button' }, ['Conta']);
  const right = createEl('div', { class: 'topbar-right' }, [profileBtn]);

  const topbar = createEl('div', { class: 'topbar' }, [left, right]);
  return { topbar, hamburger, profileBtn };
}

export async function mountTopbar(containerSelector = '#topbar-container', opts = {}) {
  const container = typeof containerSelector === 'string'
    ? document.querySelector(containerSelector)
    : containerSelector;

  if (!container) {
    console.warn('mountTopbar: container not found:', containerSelector);
    return null;
  }

  // idempotent: if already mounted, return existing api
  if (container.__topbar_mounted) return container.__topbar_api || null;
  container.__topbar_mounted = true;

  // Clear any existing children to ensure single topbar
  while (container.firstChild) container.removeChild(container.firstChild);

  const { topbar, hamburger, profileBtn } = createTopbarStructure();
  container.appendChild(topbar);

  // Bind handlers
  function bindHandlers() {
    // Hamburger: toggle sidebar (exposed global or lazy-load)
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.togglePanddaSidebar === 'function') {
        window.togglePanddaSidebar();
        return;
      }
      import('/js/components/sidebar.js').then(m => {
        if (m && typeof m.setupSidebar === 'function') {
          m.setupSidebar(); // ensures sidebar exists and sets window.togglePanddaSidebar
        }
        if (typeof window.togglePanddaSidebar === 'function') window.togglePanddaSidebar();
      }).catch(err => console.warn('topbar: failed to lazy-load sidebar module', err));
    });

    // Profile button: open account page or menu (non-destructive)
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // try to toggle an existing account menu inside container
      const existingMenu = container.querySelector('.topbar-account-menu');
      if (existingMenu) {
        existingMenu.classList.toggle('open');
        return;
      }
      // fallback: navigate to account page without reload loop
      try { window.location.href = '/account.html'; } catch(_) {}
    });
  }

  try { bindHandlers(); } catch (err) { console.warn('mountTopbar: bindHandlers failed', err); }

  const api = {
    container,
    refresh: async () => {
      container.__topbar_mounted = false;
      return mountTopbar(containerSelector, opts);
    }
  };

  container.__topbar_api = api;
  return api;
}

// Auto-mount on load if container exists
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { mountTopbar('#topbar-container').catch(()=>{}); } catch(_) {}
  });
}
