#!/bin/bash
set -e

# ================= CONFIG =================
PLATFORMS="${1:-all}"   # all | mac | win | linux
BUILD_DIR="dist"

echo "=========================================="
echo " BetterImgLauncher build script"
echo " Platform: $PLATFORMS"
echo "=========================================="

# ================= CLEAN =================
if [ "$2" == "--clean" ] || [ "$1" == "--clean" ]; then
  echo "[*] Cleaning $BUILD_DIR..."
  rm -rf "$BUILD_DIR"
  rm -rf ~/Library/Caches/electron-builder/fpm* 2>/dev/null || true
fi

# ================= CHECK DEPENDENCIES =================
if ! command -v node &> /dev/null; then
  echo "[!] Node.js is not installed. Install it first: https://nodejs.org"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "[*] node_modules not found, running npm install..."
  npm install
fi

if ! npx electron-builder --version &> /dev/null; then
  echo "[!] electron-builder not found. Run: npm install --save-dev electron-builder"
  exit 1
fi

# ================= BUILD FUNCTIONS =================
build_mac() {
  echo ""
  echo "=========================================="
  echo " [macOS] Building universal (x64 + arm64)"
  echo "=========================================="
  npx electron-builder --mac --universal
}

build_win() {
  echo ""
  echo "=========================================="
  echo " [Windows] Building x64"
  echo "=========================================="

  # Проверка Wine (нужен для NSIS-установщика на macOS)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! command -v wine &> /dev/null && ! command -v wine64 &> /dev/null; then
      echo "[!] Wine not found. Windows installer requires Wine on macOS."
      echo "    Install it with: brew install --cask wine-stable"
      echo "    Then re-run this script."
      echo ""
      read -p "Continue anyway (portable only, no installer)? [y/N] " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
      fi
    fi
  fi

  npx electron-builder --win --x64
}

build_linux() {
  echo ""
  echo "=========================================="
  echo " [Linux] Building x64 AppImage"
  echo "=========================================="
  npx electron-builder --linux --x64
}

# ================= RUN =================
case "$PLATFORMS" in
  all)
    build_mac
    build_linux
    build_win
    ;;
  mac)
    build_mac
    ;;
  win)
    build_win
    ;;
  linux)
    build_linux
    ;;
  *)
    echo "[!] Unknown platform: $PLATFORMS"
    echo "    Usage: ./build.sh [all|mac|win|linux] [--clean]"
    exit 1
    ;;
esac

# ================= SUMMARY =================
echo ""
echo "=========================================="
echo " Build complete!"
echo "=========================================="
echo ""
echo "Artifacts in $BUILD_DIR/:"
find "$BUILD_DIR" -maxdepth 1 -type f \( -name "*.dmg" -o -name "*.zip" -o -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" \) -exec ls -lh {} \; 2>/dev/null || echo "  (no files found)"
echo ""