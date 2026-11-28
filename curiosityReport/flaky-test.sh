#!/usr/bin/env bash
# Set FAIL_MOD=5 (20%), 10 (10%), or 3 (about 33%) to change the rate.
FAIL_MOD=${FAIL_MOD:-5}
if (( RANDOM % FAIL_MOD == 0 )); then exit 1; fi
node test.js
