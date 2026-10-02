#!/bin/bash
# Compile models/*.ts and copy resulting .js/.d.ts back to models/
#
# models/ is the ONE directory whose .js/.d.ts are committed: `index.js` re-exports every model,
# so consumers (and the type surface of the published package) resolve them without a TS loader.
# Everything else — libs/, adapters/, hook/ — is TS-first and runs through tsx (the app starts via
# `npx tsx`, the tests through `mocha --import=tsx`); those .js files that do exist under libs/ are
# leftovers of the older build, and several models already require TS-only siblings
# (libs/NotificationService, libs/AuthService, libs/helpers/OrderHelper …), so a pure-node
# `require("@webresto/core")` has not been the supported path for a while.
#
# Rule of thumb, so the artifacts stop drifting (review1 §4): touch models/*.ts → run this script
# and commit the regenerated .js/.d.ts in the same commit. Do NOT hand-edit models/*.js.
# `npm run check:models` (CI, review2 §3) rebuilds and fails on any diff under models/.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
npx tsc -p tsconfig.models.json 2>&1 || true
cp .tsc-models-out/models/*.js .tsc-models-out/models/*.d.ts models/
rm -rf .tsc-models-out
echo "Models compiled successfully"
