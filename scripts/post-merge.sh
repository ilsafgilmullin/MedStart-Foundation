#!/bin/bash
set -e

pnpm install --frozen-lockfile

if pnpm --filter @workspace/db exec true >/dev/null 2>&1; then
  pnpm --filter @workspace/db run push
fi
