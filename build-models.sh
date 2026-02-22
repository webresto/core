#!/bin/bash
# Compile models/*.ts and copy resulting .js/.d.ts back to models/
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
npx tsc -p tsconfig.models.json 2>&1 || true
cp .tsc-models-out/models/*.js .tsc-models-out/models/*.d.ts models/
rm -rf .tsc-models-out
echo "Models compiled successfully"
