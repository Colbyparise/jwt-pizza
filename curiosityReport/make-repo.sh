#!/usr/bin/env bash
# Usage: bash make-repo.sh <dirname> <total commits> <bug commit number> [broken]
set -euo pipefail

DIR=${1:?Usage: bash make-repo.sh <dirname> <total commits> <bug commit number> [broken]}
N=${2:?Missing total commit count}
BUG=${3:?Missing bug commit number}
BROKEN=${4:-}

if [[ -e "$DIR" ]]; then
  echo "Refusing to overwrite existing path: $DIR" >&2
  exit 2
fi
if (( N < 2 || BUG < 2 || BUG > N )); then
  echo "N must be >= 2 and BUG must be between 2 and N" >&2
  exit 2
fi

mkdir "$DIR"
cd "$DIR"
git init -q
git config user.email "me@example.com"
git config user.name "Me"

cat > price.js <<'EOF'
function total(price, qty) {
  if (qty >= 10) return price * qty * 0.9;
  return price * qty;
}
module.exports = { total };
EOF

cat > test.js <<'EOF'
const assert = require('assert');
const { total } = require('./price');
assert.strictEqual(total(10, 10), 90);
assert.strictEqual(total(10, 2), 20);
console.log('ok');
EOF

git add -A && git commit -qm "commit 1"
for ((i=2; i<=N; i++)); do
  echo "// change $i" >> notes.js
  if (( i == BUG )); then
    sed -i.bak 's/qty >= 10/qty > 10/' price.js
    rm price.js.bak
  fi
  if [[ "$BROKEN" == "broken" ]] && (( i >= 15 && i <= 17 )); then
    echo "{{{ broken" >> notes.js
  fi
  if [[ "$BROKEN" == "broken" ]] && (( i == 18 )); then
    sed -i.bak '/broken/d' notes.js
    rm notes.js.bak
  fi
  git add -A && git commit -qm "commit $i"
done
echo "Built $DIR with $N commits (bug introduced in commit $BUG)"
