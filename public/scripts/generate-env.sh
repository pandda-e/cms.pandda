#!/usr/bin/env bash

# Caminho absoluto para a pasta onde o script está
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/../public"

mkdir -p "$PROJECT_ROOT"

cat > "${PROJECT_ROOT}/_env.js" <<EOF
window.__ENV = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}"
};
EOF

echo "_env.js gerado em ${PROJECT_ROOT}/_env.js"
