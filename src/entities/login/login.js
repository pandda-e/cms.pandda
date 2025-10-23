// src/entities/login/login.js
import { supabase } from '/src/core/supabase.js';
import { initTheme, toggleTheme } from '/src/core/theme.js';

initTheme();

const form = document.getElementById('loginForm');
const themeBtn = document.getElementById('themeToggle');

themeBtn.addEventListener('click', () => toggleTheme());

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Usa Supabase Auth para login com email e senha
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Erro no login: ' + error.message);
    return;
  }

  // Ao logar, redireciona para dashboard principal
  window.location.href = '/';
});
