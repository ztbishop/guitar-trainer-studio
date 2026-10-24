#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 22 or newer from https://nodejs.org/ and try again."
  read -r -p "Press Return to close..."
  exit 1
fi
node local-web-server.cjs --open
if [ "$?" -ne 0 ]; then
  read -r -p "Press Return to close..."
fi
