#!/bin/bash

VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')

zip -r shiftgen_schedule_exporter_v${VERSION}.zip public/icons/ src/ manifest.json package-lock.json package.json README.md -x **/.DS_Store
unzip -l shiftgen_schedule_exporter_v${VERSION}.zip