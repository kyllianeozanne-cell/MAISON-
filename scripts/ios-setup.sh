#!/usr/bin/env bash
# À lancer sur un Mac avec Xcode installé : ./scripts/ios-setup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
npm install
npm run build
[ -d ios ] || npx cap add ios
PLIST=ios/App/App/Info.plist
add() { /usr/libexec/PlistBuddy -c "Delete :$1" "$PLIST" 2>/dev/null || true; /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$PLIST"; }
add NSCameraUsageDescription "MAISON utilise l'appareil photo pour photographier tes vêtements."
add NSPhotoLibraryUsageDescription "MAISON importe des photos de ta galerie pour ajouter tes vêtements."
add NSLocationWhenInUseUsageDescription "MAISON utilise ta position uniquement pour afficher la météo locale."
npx cap sync ios
npx cap open ios
echo "Dans Xcode : choisis ton iPhone, onglet Signing & Capabilities > ton compte Apple, puis Run."
