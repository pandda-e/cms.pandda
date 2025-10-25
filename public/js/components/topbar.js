// public/js/components/topbar.js
import { getState, onChange, clearSession } from '/js/auth/session.js';

const container = document.getElementById('topbar-container');

async function loadTemplate() {
  const tpl = await fetch('/views/layout/topbar.html').then(r=>r.text());
  container.innerHTML = tpl;
  wire();
  renderUser();
}

function wire(){
  const btnTheme = container.querySelector('#btn-theme-toggle');
  const btnSidebar = container.querySelector('#btn-sidebar-toggle');
  const btnLogout = container.querySelector('#btn-logout');

  btnTheme?.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') || (document.body.classList.contains('theme-dark') ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    if(next === 'light'){ document.body.classList.remove('theme-dark'); document.body.classList.add('theme-light'); }
    else { document.body.classList.remove('theme-light'); document.body.classList.add('theme-dark'); }
    localStorage.setItem('cms_pandda_theme', next);
  });

  btnSidebar?.addEventListener('click', () => {
    const evt = new CustomEvent('pandda:toggleSidebar');
    window.dispatchEvent(evt);
  });

  btnLogout?.addEventListener('click', async () => {
    await clearSession();
    window.location.href = '/login.html';
  });
}

function renderUser(){
  const emailEl = container.querySelector('#user-email');
  const s = getState();
  emailEl.textContent = s.user?.email || '—';
}

onChange(()=> renderUser());

loadTemplate();
