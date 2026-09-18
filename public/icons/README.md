# PWA Icons

Place these image files in this folder for the PWA to work correctly:

| File | Size | Used by |
|---|---|---|
| `icon-192x192.png` | 192×192 px | Android home screen, manifest |
| `icon-512x512.png` | 512×512 px | Android splash screen, maskable |
| `apple-touch-icon.png` | 180×180 px | iOS Safari "Add to Home Screen" |

## How to generate

1. Start with your logo as a high-res square PNG (at least 512×512)
2. Use one of these free tools:
   - https://favicon.io/favicon-converter/
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net
3. Download the generated files and place them here

## Design notes

- Use a square design with some padding (safe zone) for the maskable icon
- Background color should match `theme_color` in manifest.ts (`#8b5cf6`)
- The icon should be recognizable at small sizes (192×192)
