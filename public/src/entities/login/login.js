// src/entities/login/login.js
import { signIn, getProfile, supabase } from '/src/core/supabase.js';

const form = document.getElementById('login-form');
const errEl = document.getElementById('login-error');
const submitBtn = document.getElementById('submit-btn');
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const THEME_KEY = 'cms-pandda-theme';

function applyTheme(theme){
  if(theme === 'light') body.classList.remove('theme-dark'), body.classList.add('theme-light'), themeToggle.querySelector('.icon').textContent = '☀️';
  else body.classList.remove('theme-light'), body.classList.add('theme-dark'), themeToggle.querySelector('.icon').textContent = '🌙';
  localStorage.setItem(THEME_KEY, theme);
}
function initTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved) return applyTheme(saved);
  applyTheme('dark');
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const newTheme = body.classList.contains('theme-dark') ? 'light' : 'dark';
    applyTheme(newTheme);
  });
}
initTheme();

function setLoading(on){
  if (submitBtn) {
    submitBtn.disabled = on;
    submitBtn.textContent = on ? 'Entrando...' : 'Entrar';
  }
}
function showError(message){
  if (errEl) errEl.textContent = message || '';
}

async function handlePostLogin(user){
  const profile = await getProfile(user.id);
  if(!profile){
    showError('Perfil não encontrado. Contate o administrador.');
    await supabase.auth.signOut();
    return;
  }
  if(profile.role === 'superadmin') window.location.href = '/admin.html';
  else window.location.href = '/user.html';
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    setLoading(true);
    const email = form.email.value.trim();
    const password = form.password.value;
    if(!email || !password){
      showError('Preencha email e senha.');
      setLoading(false);
      return;
    }
    try{
      const res = await signIn(email, password);
      const user = res?.user ?? null;
      if(!user) throw new Error('Resposta de autenticação inválida');
      await handlePostLogin(user);
    }catch(err){
      showError(err?.message || 'Falha no login');
    }finally{
      setLoading(false);
    }
  });
}

(async function checkSession(){
  try{
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    if(user) await handlePostLogin(user);
  }catch(_){}
})();
