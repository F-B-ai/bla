#!/usr/bin/env bash
# Idempotent bootstrap for the two projects that live in this repository:
#   1. TeleightBots      -> Java 21 / Gradle library at the repo root (+ :demo)
#   2. fitness-app        -> Expo / React Native "ESSĒRE" app (+ Firebase functions)
# Runs after the source tree is checked out. Safe to re-run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> [1/3] Building TeleightBots Java library (gradle build + tests)"
chmod +x ./gradlew
./gradlew --no-daemon build

echo "==> [2/3] Installing fitness-app (Expo/React Native) dependencies"
if [ -d fitness-app ]; then
  ( cd fitness-app && npm ci )
fi

echo "==> [3/3] Installing Firebase functions dependencies"
if [ -d fitness-app/functions ]; then
  ( cd fitness-app/functions && npm ci )
fi

echo "==> Bootstrap complete."
