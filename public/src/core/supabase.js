// src/core/supabase.js
// Safe lazy check for window.__ENV so modules can be imported before _env.js is executed.

export function createSupabaseClient(createClientFn) {
  if (!createClientFn) {
    throw new Error('Supabase createClient function not provided.');
  }

  const SUPABASE_URL = window.__ENV && window.__ENV.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.__ENV && window.__ENV.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase config. Ensure public/_env.js is present and defines window.__ENV.SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  return createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Backwards-compatible helpers that expect a supabase client to be passed.
// Keep these lightweight and non-throwing when no client is provided.

export const supabase = null;

export async function getCurrentUser(supabaseClient) {
  if (!supabaseClient) return null;
  const res = await supabaseClient.auth.getUser();
  return res?.data?.user ?? null;
}

export async function getProfile(supabaseClient, id) {
  if (!supabaseClient) throw new Error('getProfile requires a supabaseClient');
  const { data, error } = await supabaseClient.from('users').select('*').eq('id', id).single();
  if (error) throw error;
  return data ?? null;
}

export async function isSuperadmin(supabaseClient, id) {
  if (!supabaseClient) return false;
  const profile = await getProfile(supabaseClient, id);
  return profile?.role === 'superadmin';
}

export async function signIn(supabaseClient, email, password) {
  if (!supabaseClient) throw new Error('signIn requires a supabaseClient');
  const res = await supabaseClient.auth.signInWithPassword({ email, password });
  if (res.error) throw res.error;
  return { user: res?.data?.user ?? null, session: res?.data?.session ?? null };
}

export async function signUp(supabaseClient, email, password) {
  if (!supabaseClient) throw new Error('signUp requires a supabaseClient');
  const res = await supabaseClient.auth.signUp({ email, password });
  if (res.error) throw res.error;
  return { user: res?.data?.user ?? null, session: res?.data?.session ?? null };
}

export async function signOut(supabaseClient) {
  if (!supabaseClient) throw new Error('signOut requires a supabaseClient');
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}
