#!/bin/bash
# Generate worldmap.json from worldmap.txt
cd "$(dirname "$0")"
python3 worldmapparser.py
cp worldmap.json ../../static/map/
