// public/js/components/topbar.js
// Topbar built with DOM methods only. Adds theme toggle and logout button.
// Exports: mountTopbar(container = '#topbar-container')
// Idempotent mount.

import('/src/core/theme.js').catch(()=>{}); // optional; theme functions may be accessible via global or module
// We lazily import session and theme inside mount to avoid startup ordering issues.

function createEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') el.className = attrs[k];
    else if (k === 'text') el.textContent = attrs[k];
    else if (k === 'html') el.innerHTML = attrs[k];
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
  const hamburger = createEl('button', {
    class: 'topbar-hamburger',
    'aria-label': 'Abrir menu',
    'data-sidebar-toggle': '1',
    type: 'button'
  }, ['☰']);

  const brand = createEl('div', { class: 'brand' }, [
    createEl('div', { class: 'logo', 'aria-hidden': 'true' }, []),
    createEl('div', { class: 'title', text: 'Pandda' }, [])
  ]);

  const left = createEl('div', { class: 'left' }, [hamburger, brand]);

  // theme toggle
  const themeBtn = createEl('button', { id: 'btn-theme-toggle', class: 'button', title: 'Alternar tema', type: 'button' }, ['🌓']);
  // user area: email and logout
  const userEmail = createEl('div', { id: 'topbar-user-email', class: 'small', text: '—' });
  const logoutBtn = createEl('button', { id: 'btn-logout', class: 'button', type: 'button' }, ['Sair']);

  const userMenu = createEl('div', { id: 'user-menu', class: 'row' }, [userEmail, logoutBtn]);

  const actions = createEl('div', { class: 'actions row' }, [themeBtn, userMenu]);

  const topbar = createEl('div', { class: 'topbar' }, [left, actions]);
  return { topbar, hamburger, themeBtn, logoutBtn, userEmail };
}

export async function mountTopbar(containerSelector = '#topbar-container', opts = {}) {
  const container = typeof containerSelector === 'string'
    ? document.querySelector(containerSelector)
    : containerSelector;

  if (!container) {
    console.warn('mountTopbar: container not found:', containerSelector);
    return null;
  }

  if (container.__topbar_mounted) return container.__topbar_api || null;
  container.__topbar_mounted = true;

  while (container.firstChild) container.removeChild(container.firstChild);

  const { topbar, hamburger, themeBtn, logoutBtn, userEmail } = createTopbarStructure();
  container.appendChild(topbar);

  // Bind handlers (lazy import for session/theme)
  async function bindHandlers() {
    // sidebar toggle
    hamburger.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.togglePanddaSidebar === 'function') {
        window.togglePanddaSidebar();
        return;
      }
      import('/js/components/sidebar.js').then(m => {
        if (m && typeof m.setupSidebar === 'function') m.setupSidebar();
        if (typeof window.togglePanddaSidebar === 'function') window.togglePanddaSidebar();
      }).catch(err => console.warn('topbar: failed to lazy-load sidebar module', err));
    });

    // theme toggle (try module then fallback to window.toggleTheme)
    themeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const theme = await import('/src/core/theme.js').catch(()=>null);
        if (theme && typeof theme.toggleTheme === 'function') {
          theme.toggleTheme();
          return;
        }
      } catch(_) {}
      try {
        if (typeof window.toggleTheme === 'function') window.toggleTheme();
        else {
          // simple toggle fallback using data-theme on documentElement
          const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
          const next = cur === 'light' ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', next);
          document.body.classList.remove('theme-dark','theme-light');
          document.body.classList.add(next === 'light' ? 'theme-light' : 'theme-dark');
        }
      } catch (err) { console.warn('theme toggle failed', err); }
    });

    // logout button: prefer session module signOut/clearSession
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const sessionMod = await import('/js/auth/session.js');
        if (sessionMod && typeof sessionMod.signOut === 'function') {
          await sessionMod.signOut();
          return;
        }
        if (sessionMod && typeof sessionMod.clearSession === 'function') {
          await sessionMod.clearSession();
          return;
        }
      } catch (err) {
        console.warn('logout via session module failed', err);
      }
      try { location.replace('/login.html'); } catch(_) {}
    });

    // populate user email if available
    try {
      const sessionMod = await import('/js/auth/session.js');
      const state = sessionMod.getState ? sessionMod.getState() : {};
      const email = state?.user?.email ?? '—';
      userEmail.textContent = email;
      // keep listener to update when session changes
      sessionMod.onChange && sessionMod.onChange((st) => {
        const e = st?.user?.email ?? '—';
        userEmail.textContent = e;
      });
    } catch (err) {
      // ignore
    }
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
