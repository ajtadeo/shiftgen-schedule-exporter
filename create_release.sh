#!/bin/bash

set -o pipefail

VERSION_CHROME=$(grep '"version"' manifest.chrome.json | sed 's/.*"version": "\(.*\)".*/\1/')
VERSION_FIREFOX=$(grep '"version"' manifest.firefox.json | sed 's/.*"version": "\(.*\)".*/\1/')
if [ "$VERSION_CHROME" -ne "$VERSION_FIREFOX" ]; then
  echo "Manifest versions do not match: chrome=$VERSION_CHROME firefox=$VERSION_FIREFOX"
fi
VERSION=$VERSION_CHROME

cp node_modules/webextension-polyfill/dist/browser-polyfill.js src/browser-polyfill.js

# Chrome
cp manifest.chrome.json manifest.json
zip -r shiftgen_schedule_exporter_chrome_v${VERSION}.zip public/icons/ src/ manifest.json package-lock.json package.json README.md -x **/.DS_Store
unzip -l shiftgen_schedule_exporter_chrome_v${VERSION}.zip

# Firefox
cp manifest.firefox.json manifest.json
zip -r shiftgen_schedule_exporter_firefox_v${VERSION}.zip public/icons/ src/ manifest.json package-lock.json package.json README.md -x **/.DS_Store
unzip -l shiftgen_schedule_exporter_firefox_v${VERSION}.zip

rm manifest.json