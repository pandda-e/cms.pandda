// public/js/components/topbar.js
// Topbar ensures hamburger toggles sidebar and the topbar layout remains as requested.
// No structural change needed beyond ensuring left alignment of controls in markup here.

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
  // Left-aligned group: hamburger + brand
  const hamburger = createEl('button', {
    class: 'topbar-hamburger',
    'aria-label': 'Abrir menu',
    'data-sidebar-toggle': '1',
    type: 'button'
  }, ['☰']);

  const brand = createEl('div', { class: 'brand' }, [
    createEl('div', { class: 'logo', 'aria-hidden': 'true' }, []),
    createEl('div', { class: 'title', html: '<strong>Pandda</strong>' }, [])
  ]);

  const left = createEl('div', { class: 'left' }, [hamburger, brand]);

  // Actions are kept but visually placed to the right; item alignment in sidebar controlled separately.
  const themeBtn = createEl('button', { id: 'btn-theme-toggle', class: 'button', title: 'Alternar tema', type: 'button' }, ['🌓']);
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

  async function ensureSidebarAndToggle() {
    if (typeof window.togglePanddaSidebar === 'function') {
      try { window.togglePanddaSidebar(); return true; } catch(e){ /* fallback */ }
    }
    try {
      const mod = await import('/js/components/sidebar.js').catch(err => { throw err; });
      if (mod && typeof mod.setupSidebar === 'function') {
        try { await mod.setupSidebar(); } catch(_) {}
        await new Promise(r => setTimeout(r, 30));
        if (typeof window.togglePanddaSidebar === 'function') {
          try { window.togglePanddaSidebar(); return true; } catch(e){}
        }
      }
    } catch (err) {
      console.warn('topbar: failed to lazy-load sidebar module', err);
    }
    return false;
  }

  function bindHandlers() {
    hamburger.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const ok = await ensureSidebarAndToggle();
        if (!ok) console.warn('topbar: sidebar toggle did not run');
      } catch (err) {
        console.warn('topbar: error toggling sidebar', err);
      }
    });

    themeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const theme = await import('/src/core/theme.js').catch(()=>null);
        if (theme && typeof theme.toggleTheme === 'function') { theme.toggleTheme(); return; }
      } catch(_) {}
      try {
        if (typeof window.toggleTheme === 'function') { window.toggleTheme(); return; }
      } catch(_) {}
      try {
        const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
        const next = cur === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        document.body.classList.remove('theme-dark','theme-light');
        document.body.classList.add(next === 'light' ? 'theme-light' : 'theme-dark');
      } catch (err) { console.warn('theme toggle failed', err); }
    });

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

    (async () => {
      try {
        const sessionMod = await import('/js/auth/session.js');
        const state = sessionMod.getState ? sessionMod.getState() : {};
        const email = state?.user?.email ?? '—';
        userEmail.textContent = email;
        sessionMod.onChange && sessionMod.onChange((st) => {
          const e = st?.user?.email ?? '—';
          userEmail.textContent = e;
        });
      } catch (_) {}
    })();
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

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try { mountTopbar('#topbar-container').catch(()=>{}); } catch(_) {}
  });
}
