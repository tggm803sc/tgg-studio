# TGG Studio

A video studio editor that runs entirely in the browser: a media bin, a preview monitor, a
multi-track timeline, an inspector and an exporter — plus a Feed of published cuts.

All media is generated procedurally (canvas scenes, vector title cards, synthesised audio), so the
app needs no asset files and no network. You can drop your own images and videos in as well.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (http://localhost:5173 by default).

```bash
npm run build     # production build into dist/
npm run preview   # serve the build locally
```

Requires Node 18 or newer. React 18 + Vite 5, no other runtime dependencies.

## What's in it

- **Studio tab** — media bin (10 procedural scenes, title cards, 6 audio styles, image/video import
  via drag-and-drop), preview monitor with fit-to-output scaling, transport and scrubbing,
  multi-track timeline (V1/V2/A1) with drag-move across tracks, edge trim, split, snapping and zoom
- **Inspector** — per-clip filters, opacity, fades, title text, volume; project aspect (16:9, 9:16,
  1:1, 4:5), frame rate
- **Feed tab** — vertical reel feed with likes and comments, plus your own published cuts at the top.
  **Publish** turns the frame under the playhead into a 9:16 poster and drops the cut into the feed
- **Export** — records the timeline to WebM with MediaRecorder
- Undo/redo, autosave to `localStorage`, keyboard shortcuts (Space, S, D, Del, arrows, `+`/`-`, ⌘Z)

## Notes

- Use **Chrome** to export: the recorder writes WebM/VP9 via MediaRecorder, which Safari does not
  support. Editing, the feed and publishing work in Safari.
- Imported images and videos are session-only — they live as blob URLs and are dropped on reload.
  Published cut posters survive, because they are stored as data URLs in `localStorage`.
- The exported WebM has no duration header (browser recording), so some players will only play it
  start to finish.
