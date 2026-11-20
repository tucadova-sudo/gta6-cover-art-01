# Neon Bay Cover Studio

A GTA-style cover art maker. Turn a photo and a caption into a multi-panel
poster cover — hero trio, four square, hero + four, or a single hero panel —
with a Vice City-style sunset or neon colour grade, and export it as a PNG in
1080 x 1080, 1080 x 1350 or 1920 x 1080.

## Use it

Serve `app/` with any static server and open `app/index.html` in desktop
Chrome. No network is needed and nothing is uploaded: photos are read on
your own machine.

```sh
node serve.ts   # then open http://localhost:8080
```

1. Add your photos (or use the two bundled samples).
2. Pick a panel layout and a colour grade.
3. Type a caption and a small line above it; pick a caption style.
4. Click a panel to select it, drag it to move its photo, scroll to zoom, or
   use the zoom / pan sliders. "Use in all panels" fills every panel with one
   photo.
5. Choose an export size and press Export PNG.

## Files

- `app/index.html`, `app/style.css` — the editor page.
- `app/src/cover.js` — the render engine: layouts, grades, the synthwave sun
  and the caption lettering.
- `app/src/main.js` — editor wiring, drag-to-position, PNG export.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=editor`,
  `?shot=cover`, `?shot=cover-wide`, `?shot=cover-portrait`).
- `app/samples/` — two sample photos, made with an image model and free to use.
- `main.ts` — hands the entry in: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json`.

Everything in the app is original: no game logo, artwork, character or font.
Lettering uses generic system font stacks only.
