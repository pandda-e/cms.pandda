// src/core/supabase.js
// Compatível com SDK via CDN (window.supabase)
const SUPABASE_URL = window.__ENV?.SUPABASE_URL || window?.SUPABASE_URL || process.env?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.__ENV?.SUPABASE_ANON_KEY || window?.SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase config. Ensure public/_env.js or env vars are set.');
}

const createClientFn = window?.supabase?.createClient;
if (!createClientFn) {
  throw new Error('Supabase SDK not found on window.supabase. Include CDN script before this module.');
}

export const supabase = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUser() {
  const res = await supabase.auth.getUser();
  return res?.data?.user ?? null;
}

export async function getProfile(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) throw error;
  return data ?? null;
}

export async function isSuperadmin(id) {
  const profile = await getProfile(id);
  return profile?.role === 'superadmin';
}

export async function signIn(email, password) {
  const res = await supabase.auth.signInWithPassword({ email, password });
  if (res.error) throw res.error;
  return { user: res?.data?.user ?? null, session: res?.data?.session ?? null };
}

export async function signUp(email, password) {
  const res = await supabase.auth.signUp({ email, password });
  if (res.error) throw res.error;
  return { user: res?.data?.user ?? null, session: res?.data?.session ?? null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(cb) {
  const sub = supabase.auth.onAuthStateChange((event, session) => {
    try { cb(event, session); } catch (_) {}
  });
  return () => {
    try { sub?.data?.subscription?.unsubscribe?.(); } catch (_) {}
  };
}

