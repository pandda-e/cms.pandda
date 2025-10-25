// public/js/auth/session.js
// Integração com src/core/supabase.js (usa createSupabaseClient in caller)
// Exporta: initialize(supabaseClient), signIn(email,password), signOut(), getState(), getUser(), isSuperAdmin(), getAdminId(), onChange(), setSession(), clearSession()

import {
  getProfile as coreGetProfile,
  signIn as coreSignIn,
  signOut as coreSignOut
} from '/src/core/supabase.js';

const STORAGE_KEY = 'pandda_session_v1';
const listeners = new Set();

let _supabase = null;
let _state = {
  token: null,
  user: null,
  adminId: null,
  isSuper: false,
  permissions: []
};

function notify(){ for(const fn of listeners) try{ fn(getState()); } catch(e){ console.error(e); } }
function save(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch(_){} }
function load(){ try { const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return; const parsed = JSON.parse(raw); _state = {..._state, ...parsed}; } catch(_){} }

export function getState(){ return { ..._state }; }
export function isAuthenticated(){ return !!_state.user; }
export function getUser(){ return _state.user; }
export function getAdminId(){ return _state.adminId; }
export function isSuperAdmin(){ return !!_state.isSuper; }
export function hasPermission(p){ return _state.permissions?.includes(p); }
export function getToken(){ return _state.token; }
export function onChange(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }

export async function initialize(supabaseClient){
  if(!supabaseClient) throw new Error('initialize requires supabaseClient');
  _supabase = supabaseClient;
  load();

  try {
    const { data } = await _supabase.auth.getUser();
    const user = data?.user ?? null;
    if(user) await populateFromUser(user);
  } catch (err) {
    console.warn('session.initialize: erro ao recuperar user', err);
  }

  _supabase.auth.onAuthStateChange(async (event, authSession) => {
    try {
      if(event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        await clearSession();
      } else if(event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const user = authSession?.user ?? null;
        if(user) await populateFromUser(user, authSession?.session);
      }
    } catch(e){
      console.error('onAuthStateChange handler error', e);
    }
  });

  notify();
  return getState();
}

export async function signIn(email, password){
  if(!_supabase) throw new Error('session not initialized. call initialize(supabaseClient) first.');
  const res = await coreSignIn(_supabase, email, password);
  const user = res?.user ?? null;
  const sessionObj = res?.session ?? null;
  if(!user) throw new Error(res?.error?.message || 'Autenticação falhou');
  await populateFromUser(user, sessionObj);
  return getState();
}

export async function signOut(){
  if(!_supabase) throw new Error('session not initialized. call initialize(supabaseClient) first.');
  try { await coreSignOut(_supabase); } catch(_) {}
  await clearSession();
}

export function setSession({ token=null, user=null, adminId=null, isSuper=false, permissions=[] } = {}) {
  _state = { token, user, adminId, isSuper, permissions };
  save();
  notify();
}

export async function clearSession(){
  try { if(_supabase) await _supabase.auth.signOut(); } catch(_) {}
  _state = { token:null, user:null, adminId:null, isSuper:false, permissions:[] };
  try { localStorage.removeItem(STORAGE_KEY); } catch(_) {}
  notify();
}

async function populateFromUser(user, sessionObj = null){
  _state.user = user;
  _state.token = sessionObj?.access_token ?? (await tryGetAccessToken()) ?? _state.token;

  try {
    const profile = await coreGetProfile(_supabase, user.id);
    _state.isSuper = profile?.role === 'superadmin';
    _state.adminId = profile?.administrador_id || profile?.admin_id || profile?.administrador || null;
    _state.permissions = Array.isArray(profile?.permissions) ? profile.permissions : (profile?.permissions || []);
    if(!_state.permissions) _state.permissions = [];
    if(_state.isSuper && !_state.permissions.includes('admin.manage')) _state.permissions.push('admin.manage');
  } catch (err) {
    console.warn('populateFromUser: não foi possível obter profile do DB', err);
    _state.isSuper = false;
    if(!_state.adminId) _state.adminId = null;
    _state.permissions = _state.permissions || [];
  }

  save();
  notify();
}

async function tryGetAccessToken(){
  try {
    const { data } = await _supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch (_) { return null; }
}

// auto-init if legacy window client is set (optional)
(async function autoInitIfPossible(){
  try {
    if(typeof window !== 'undefined' && window.__SUPABASE_CLIENT && !(_supabase)) {
      // do not await here to avoid blocking module load; caller should still call initialize explicitly
      // await initialize(window.__SUPABASE_CLIENT);
    }
  } catch(_) {}
})();
