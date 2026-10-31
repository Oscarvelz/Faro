#!/bin/bash
cd /workspace/work/faro && ./build.sh >/tmp/fbuild.log 2>&1 || { tail -30 /tmp/fbuild.log; exit 1; }
mkdir -p /tmp/site/Faro && rm -rf /tmp/site/Faro/* && cp -r dist/. /tmp/site/Faro/ && echo built
