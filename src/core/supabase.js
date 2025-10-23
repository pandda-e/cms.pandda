// src/core/supabase.js
// Inicializa e exporta o cliente Supabase para todo o app.
// Compatível com window.__ENV (gerado em build) ou import.meta.env (Vite).

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Tenta ler variáveis da janela gerada em build
const urlFromWindow = (typeof window !== 'undefined' && window.__ENV && window.__ENV.SUPABASE_URL) ? window.__ENV.SUPABASE_URL : null;
const keyFromWindow = (typeof window !== 'undefined' && window.__ENV && window.__ENV.SUPABASE_ANON_KEY) ? window.__ENV.SUPABASE_ANON_KEY : null;

// Tenta ler variáveis do ambiente (Vite)
const urlFromVite = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ? import.meta.env.VITE_SUPABASE_URL : null;
const keyFromVite = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? import.meta.env.VITE_SUPABASE_ANON_KEY : null;

// Prioridade: window.__ENV -> import.meta.env -> string vazia
const SUPABASE_URL = urlFromWindow || urlFromVite || '';
const SUPABASE_ANON_KEY = keyFromWindow || keyFromVite || '';

// Exporta cliente Supabase para uso pelos módulos de entidade
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
