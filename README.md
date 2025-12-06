Fallout 2 [Restoration Project](https://github.com/BGforgeNet/Fallout2_Restoration_Project) [walkthrough](https://f2rp.bgforge.net/).

## Development

Requires [Hugo Extended](https://gohugo.io/installation/) v0.152.2+.

```bash
# Run local server
hugo server -D

# Build
hugo --gc --minify
```

## Interactive Map

The `/map/` directory contains a standalone world map encounter viewer. To regenerate map data:

1. Copy `worldmap.txt` from Fallout 2 `data` folder to `static/map/`
2. Run `python3 static/map/worldmapparser.py`
