#!/data/data/com.termux/files/usr/bin/bash
# NOPALRYZ.exe helper for Termux
# Usage:
#   bash run.sh           -> run with pairing (default)
#   bash run.sh qr        -> run with QR login
#   bash run.sh restart   -> run with auto restart loop

set -e
cd "$(dirname "$0")"

if [ "$1" = "qr" ]; then
  export LOGIN_METHOD=qr
  node index.js
elif [ "$1" = "restart" ]; then
  while true; do
    node index.js
    echo "Restarting in 3s..."
    sleep 3
  done
else
  export LOGIN_METHOD=pairing
  node index.js
fi
