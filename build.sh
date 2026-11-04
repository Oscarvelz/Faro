#!/bin/sh
set -e
# Lazy on-use files stay out of precache.json (the SW keeps them after first use): pdf.js (pdftext + worker) and the OCR (ocrrun chunk + ocr/ folder).
cd "$(dirname "$0")"
npx vite build -c vite.spa.config.ts
cd dist
rm -rf __grok og.jpg
ls | grep -v -e '^sw.js$' -e '^precache.json$' -e '^pdftext-' -e '^pdf\.worker' -e '^ocr$' -e '^ocrrun-' | python3 -c "import sys,json;print(json.dumps(['./'+l.strip() for l in sys.stdin if l.strip()]))" > precache.json
touch .nojekyll
ls -la
