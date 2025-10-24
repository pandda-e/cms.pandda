#!/usr/bin/env bash
# scripts/generate-env.sh
# Gera public/_env.js em tempo de build a partir de variáveis de ambiente.
# Defina SUPABASE_URL e SUPABASE_ANON_KEY nas Environment Variables do Cloudflare Pages.

cat > /_env.js <<EOF
// public/_env.js - gerado em build
window.__ENV = {
  SUPABASE_URL: "${SUPABASE_URL:-}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY:-}"
};
EOF
