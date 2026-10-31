#!/bin/sh
set -e
cd "$(dirname "$0")"
npx vite build -c vite.spa.config.ts
cd dist
rm -rf __grok og.jpg
ls | grep -v -e '^sw.js$' -e '^precache.json$' | python3 -c "import sys,json;print(json.dumps(['./'+l.strip() for l in sys.stdin if l.strip()]))" > precache.json
touch .nojekyll
ls -la
