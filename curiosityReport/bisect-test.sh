#!/usr/bin/env bash
# Exit 125 tells git bisect this commit cannot be tested.
node --check notes.js || exit 125
node test.js
