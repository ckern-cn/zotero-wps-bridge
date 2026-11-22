#!/usr/bin/env bash
set -euo pipefail

# Deploy the static site to the Alibaba Cloud Hong Kong server.
#
# Required:
#   DEPLOY_HOST=47.243.7.75
#
# Optional:
#   DEPLOY_USER=root
#   DEPLOY_PORT=22
#   DEPLOY_PATH=/webapps/zw.ckern.cn
#   DEPLOY_RELOAD="sudo nginx -t && sudo systemctl reload nginx"
#
# The release build must use the real update URL. This script rebuilds and
# copies site/ (including downloads) to the server.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-/webapps/zw.ckern.cn}"
DEPLOY_RELOAD="${DEPLOY_RELOAD:-nginx -t && systemctl reload nginx}"
: "${DEPLOY_HOST:?Set DEPLOY_HOST, for example DEPLOY_HOST=47.243.7.75}"

cd "$ROOT"
UPDATE_URL='https://zw.ckern.cn/updates.json' \
UPDATE_LINK_BASE='https://zw.ckern.cn/downloads/' \
npm run build
npm run build:site

rsync -az --delete \
    --exclude='.well-known/' \
    --exclude='.user.ini' \
    -e "ssh -p ${DEPLOY_PORT}" \
    site/ "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}/"

ssh -p "${DEPLOY_PORT}" "${DEPLOY_USER}@${DEPLOY_HOST}" "${DEPLOY_RELOAD}"
echo "[deploy-site] published to https://zw.ckern.cn/"
