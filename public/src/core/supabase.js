// src/core/supabase.js
// Compatível com SDK via ESM import; não usa process.env no browser.
const SUPABASE_URL = window.__ENV?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.__ENV?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase config. Ensure public/_env.js is present and defines window.__ENV.SUPABASE_URL and SUPABASE_ANON_KEY.');
}

// window.supabase may not exist if you import SDK as module; provide helper to create client.
export function createSupabaseClient(createClientFn) {
  if (!createClientFn) {
    throw new Error('Supabase createClient function not provided.');
  }
  return createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Placeholder export for callers that import the SDK separately and then call createSupabaseClient
export const supabase = null;

export async function getCurrentUser(supabaseClient) {
  const res = await supabaseClient.auth.getUser();
  return res?.data?.user ?? null;
}

// Alterado para consultar a tabela 'users'
export async function getProfile(supabaseClient, id) {
  const { data, error } = await supabaseClient.from('users').select('*').eq('id', id).single();
  if (error) throw error;
  return data ?? null;
}

export async function isSuperadmin(supabaseClient, id) {
  const profile = await getProfile(supabaseClient, id);
  return profile?.role === 'superadmin';
}

export async function signIn(supabaseClient, email, password) {
  const res = await supabaseClient.auth.signInWithPassword({ email, password });
  if (res.error) throw res.error;
  return { user: res?.data?.user ?? null, session: res?.data?.session ?? null };
}

export async function signUp(supabaseClient, email, password) {
  const res = await supabaseClient.auth.signUp({ email, password });
  if (res.error) throw res.error;
  return { user: res?.data?.user ?? null, session: res?.data?.session ?? null };
}

export async function signOut(supabaseClient) {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}
