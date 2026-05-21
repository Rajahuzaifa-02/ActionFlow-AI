#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

echo "=== Node version ==="
node --version
echo "=== NPM version ==="
npm --version

echo ""
echo "=== Installing server dependencies ==="
cd /home/umar/umar-workspace/umar-hackathon/server
npm install

echo ""
echo "=== Installing client dependencies ==="
cd /home/umar/umar-workspace/umar-hackathon/client
npm install

echo ""
echo "=== All done! ==="
