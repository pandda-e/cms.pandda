// public/js/components/topbar.js
import { getState, onChange, clearSession } from '/js/auth/session.js';

const container = document.getElementById('topbar-container');
let onChangeUnsub = null;

async function loadTemplate() {
  const tpl = await fetch('/views/layout/topbar.html').then(r=>r.text());
  if (!container) {
    console.warn('topbar: host element #topbar-container not found');
    return;
  }
  container.innerHTML = tpl;
  wire();
  renderUser();

  // subscribe after template is present
  if (!onChangeUnsub) {
    onChangeUnsub = onChange(() => {
      try { renderUser(); } catch(e){ console.error(e); }
    });
  }
}

function wire(){
  const btnTheme = container.querySelector && container.querySelector('#btn-theme-toggle');
  const btnSidebar = container.querySelector && container.querySelector('#btn-sidebar-toggle');
  const btnLogout = container.querySelector && container.querySelector('#btn-logout');

  if (btnTheme) {
    btnTheme.addEventListener('click', ()=>{
      const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      if(next === 'light'){ document.body.classList.remove('theme-dark'); document.body.classList.add('theme-light'); }
      else { document.body.classList.remove('theme-light'); document.body.classList.add('theme-dark'); }
      localStorage.setItem('cms_pandda_theme', next);
    });
  }

  if (btnSidebar) {
    btnSidebar.addEventListener('click', () => {
      const evt = new CustomEvent('pandda:toggleSidebar');
      window.dispatchEvent(evt);
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await clearSession();
      } finally {
        window.location.href = '/login.html';
      }
    });
  }
}

function renderUser(){
  const emailEl = container.querySelector && container.querySelector('#user-email');
  const s = getState();
  if (emailEl) emailEl.textContent = s.user?.email || '—';
}

loadTemplate().catch(err => {
  console.error('topbar.loadTemplate error', err);
});
