// public/js/auth/session.js
// Robust session manager that requires explicit initialize(supabaseClient).

import {
  getProfile as coreGetProfile,
  signIn as coreSignIn,
  signOut as coreSignOut
} from '/src/core/supabase.js';

const STORAGE_KEY = 'pandda_session_v1';
const listeners = new Set();
let _supabase = null;
let _initialized = false;
let _initializing = false;
let _state = {
  token: null,
  user: null,
  adminId: null,
  isSuper: false,
  permissions: []
};

function log(...args){ try { console.info('[session]', ...args); } catch(_){} }
function warn(...args){ try { console.warn('[session]', ...args); } catch(_){} }

function notify(){ for(const fn of listeners) try{ fn(getState()); } catch(e){ console.error(e); } }
function save(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); } catch(e){ warn('save failed', e); } }
function load(){ try { const raw = localStorage.getItem(STORAGE_KEY); if(!raw) return; const parsed = JSON.parse(raw); _state = {..._state, ...parsed}; } catch(e){ warn('load failed', e); } }

export function getState(){ return { ..._state }; }
export function getUser(){ return _state.user; }
export function getAdminId(){ return _state.adminId; }
export function isSuperAdmin(){ return !!_state.isSuper; }
export function hasPermission(p){ return _state.permissions?.includes(p); }
export function getToken(){ return _state.token; }
export function onChange(fn){ listeners.add(fn); return ()=>listeners.delete(fn); }

export async function initialize(supabaseClient, opts = { retries: 1, retryDelayMs: 200 }) {
  if (_initialized) {
    log('initialize: already initialized');
    return getState();
  }
  if (_initializing) {
    log('initialize: already initializing, waiting...');
    const start = Date.now();
    while (_initializing && Date.now() - start < 5000) {
      await new Promise(r => setTimeout(r, 50));
    }
    return getState();
  }

  if (!supabaseClient) throw new Error('initialize requires supabaseClient');
  _supabase = supabaseClient;
  _initializing = true;

  load();

  const { retries, retryDelayMs } = opts;
  let attempt = 0;
  let sdkSession = null;
  while (attempt <= retries) {
    try {
      log('calling sup.auth.getSession (attempt)', attempt);
      const gs = await _supabase.auth.getSession();
      sdkSession = gs?.data?.session ?? null;
      log('sup.auth.getSession result', !!sdkSession);
      break;
    } catch (err) {
      warn('sup.auth.getSession failed on attempt', attempt, err);
      attempt++;
      if (attempt <= retries) await new Promise(r => setTimeout(r, retryDelayMs));
    }
  }

  let sdkUser = null;
  try {
    const gu = await _supabase.auth.getUser();
    sdkUser = gu?.data?.user ?? null;
    log('sup.auth.getUser result', !!sdkUser);
  } catch (err) {
    warn('sup.auth.getUser failed', err);
  }

  const userFromSdk = sdkSession?.user ?? sdkUser ?? _state.user ?? null;

  if (!userFromSdk) {
    log('no user found in supabase SDK; clearing local state and returning');
    _state = { token: null, user: null, adminId: null, isSuper: false, permissions: [] };
    try { localStorage.removeItem(STORAGE_KEY); } catch(_) {}
    _initialized = true;
    _initializing = false;
    notify();
    return getState();
  }

  try {
    await populateFromUser(userFromSdk, sdkSession);
    log('populateFromUser succeeded');
  } catch (err) {
    warn('populateFromUser failed', err);
    notify();
  }

  _initialized = true;
  _initializing = false;
  notify();
  return getState();
}

export async function signIn(email, password) {
  if (!_supabase) throw new Error('session not initialized. call initialize(supabaseClient) first.');
  const res = await coreSignIn(_supabase, email, password);
  const user = res?.user ?? null;
  const sessionObj = res?.session ?? null;
  if (!user) throw new Error(res?.error?.message || 'Autenticação falhou');
  await populateFromUser(user, sessionObj);
  return getState();
}

export async function signOut() {
  if (!_supabase) throw new Error('session not initialized. call initialize(supabaseClient) first.');
  try { await coreSignOut(_supabase); } catch (err) { warn('coreSignOut failed', err); }
  await clearSession();
}

export function setSession({ token=null, user=null, adminId=null, isSuper=false, permissions=[] } = {}) {
  _state = { token, user, adminId, isSuper, permissions };
  save();
  notify();
}

export async function clearSession() {
  try {
    if (_supabase && _supabase.auth && typeof _supabase.auth.signOut === 'function') {
      await _supabase.auth.signOut();
      log('clearSession: signed out via internal _supabase');
    } else if (window.__SUPABASE_CLIENT && window.__SUPABASE_CLIENT.auth && typeof window.__SUPABASE_CLIENT.auth.signOut === 'function') {
      await window.__SUPABASE_CLIENT.auth.signOut();
      log('clearSession: signed out via window.__SUPABASE_CLIENT fallback');
    } else {
      log('clearSession: no supabase client available to sign out remotely');
    }
  } catch (err) {
    warn('clearSession: signOut attempt failed', err);
  }

  _state = { token:null, user:null, adminId:null, isSuper:false, permissions:[] };
  try { localStorage.removeItem(STORAGE_KEY); } catch(e){ warn('localStorage remove failed', e); }
  notify();
}

async function populateFromUser(user, sessionObj = null) {
  if (!user) throw new Error('populateFromUser requires a user object');

  _state.user = user;
  _state.token = sessionObj?.access_token ?? await tryGetAccessToken() ?? _state.token;

  try {
    if (!_supabase) throw new Error('populateFromUser needs _supabase client');
    const profile = await coreGetProfile(_supabase, user.id);
    _state.isSuper = profile?.role === 'superadmin';
    _state.adminId = profile?.administrador_id || profile?.admin_id || profile?.administrador || null;
    _state.permissions = Array.isArray(profile?.permissions) ? profile.permissions : (profile?.permissions || []);
    if (!_state.permissions) _state.permissions = [];
    if (_state.isSuper && !_state.permissions.includes('admin.manage')) _state.permissions.push('admin.manage');
    log('profile loaded', { isSuper: _state.isSuper, adminId: _state.adminId, permissionsCount: _state.permissions.length });
  } catch (err) {
    warn('populateFromUser: could not load profile, using fallback state', err);
    _state.isSuper = false;
    if (!_state.adminId) _state.adminId = null;
    _state.permissions = _state.permissions || [];
  }

  save();
  notify();
}

async function tryGetAccessToken(){
  try {
    if (!_supabase) return null;
    const { data } = await _supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch (err) {
    warn('tryGetAccessToken failed', err);
    return null;
  }
}
