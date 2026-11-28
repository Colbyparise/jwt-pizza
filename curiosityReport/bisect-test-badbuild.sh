#!/usr/bin/env bash
# Deliberately treat an unbuildable commit as bad (exit 1) for comparison.
node --check notes.js || exit 1
node test.js
