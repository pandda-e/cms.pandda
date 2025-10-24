#!/usr/bin/env bash
set -euo pipefail

# Diretório onde este script está localizado
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# PROJECT_ROOT = pasta pai do diretório do script (por exemplo: .../repo/public)
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Validar variáveis de ambiente obrigatórias
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "Erro: SUPABASE_URL e SUPABASE_ANON_KEY devem estar definidas no ambiente."
  exit 1
fi

mkdir -p "${PROJECT_ROOT}"

cat > "${PROJECT_ROOT}/_env.js" <<EOF
window.__ENV = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}"
};
EOF

echo "_env.js gerado em ${PROJECT_ROOT}/_env.js"
