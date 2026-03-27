#!/usr/bin/env sh
set -eu

# Production deploy script
# - Pulls latest code
# - Installs dependencies
# - Builds the Next.js app
# - Starts/reloads PM2 cluster using ecosystem.config.js

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed or not in PATH" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed or not in PATH" >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERROR: pm2 is not installed (try: npm i -g pm2)" >&2
  exit 1
fi

echo "==> Pulling latest changes"
git pull origin production

echo "==> Installing dependencies"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "==> Building"
npm run build

echo "==> Starting/reloading PM2 cluster"
pm2 startOrReload ecosystem.config.js --env production
pm2 save

echo "==> Done"
