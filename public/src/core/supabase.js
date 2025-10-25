// public/src/core/supabase.js
// Memoized createSupabaseClient to avoid multiple GoTrueClient instances
export function createSupabaseClient(createClientFn) {
  if (!createClientFn) throw new Error('Supabase createClient function not provided.');

  // reuse global client if already created
  if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT) {
    return window.__SUPABASE_CLIENT;
  }

  const SUPABASE_URL = window.__ENV && window.__ENV.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.__ENV && window.__ENV.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase config. Ensure public/_env.js is present and defines window.__ENV.SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  const client = createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);

  // store on window for reuse across modules/pages
  try { window.__SUPABASE_CLIENT = client; } catch (_){}

  return client;
}

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
