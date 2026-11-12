import { drawScene } from './visuals'

// Asset registry. Scenes are procedural (no files), titles are vector text,
// imported images/videos live only for the session and are dropped on reload.

export const SCENE_ASSETS = [
  { id: 'salt', name: 'Salt Flats', scene: 'salt', palette: ['#ffd24a', '#2a1030', '#ff5a36'] },
  { id: 'city', name: 'Downtown', scene: 'city', palette: ['#7c5cff', '#050512', '#3ee0ff'] },
  { id: 'studio', name: 'Studio 808', scene: 'studio', palette: ['#c6ff2e', '#0a1512', '#2ee6a8'] },
  { id: 'stage', name: 'Neon Room', scene: 'stage', palette: ['#ff3ea5', '#0b0614', '#4be0ff'] },
  { id: 'tape', name: 'The Vault', scene: 'tape', palette: ['#ffb26b', '#140f0a', '#ffd8a8'] },
  { id: 'aurora', name: 'Aurora', scene: 'aurora', palette: ['#58ffd0', '#050b12', '#8b7cff'] },
  { id: 'grid', name: 'Synth Grid', scene: 'grid', palette: ['#ff6b3d', '#12040f', '#ffd24a'] },
  { id: 'rain', name: 'Rain Window', scene: 'rain', palette: ['#5aa9ff', '#050a12', '#2ee6a8'] },
  { id: 'freight', name: 'Cargo Hall', scene: 'freight', palette: ['#ffc44a', '#0b0d0c', '#7cff9e'] },
  { id: 'orbit', name: 'Orbit', scene: 'orbit', palette: ['#b48cff', '#06060f', '#c6ff2e'] },
]

export const MUSIC_STYLES = [
  { style: 'phonk', name: 'V8 Idle', bpm: 84, mood: 'phonk' },
  { style: 'trap', name: 'Midnight Freight', bpm: 140, mood: 'trap' },
  { style: 'rnb', name: 'Studio 808', bpm: 92, mood: 'rnb' },
  { style: 'lofi', name: 'Tape Hiss', bpm: 76, mood: 'lofi' },
  { style: 'house', name: 'Neon Room', bpm: 124, mood: 'house' },
  { style: 'cinematic', name: 'Skyline Score', bpm: 100, mood: 'cinematic' },
]

const registry = {}

SCENE_ASSETS.forEach((s) => {
  registry[s.id] = {
    id: s.id,
    kind: 'scene',
    name: s.name,
    duration: 12,
    scene: s.scene,
    palette: s.palette,
    swatch: s.palette,
  }
})

registry['title'] = {
  id: 'title',
  kind: 'title',
  name: 'Title card',
  duration: 4,
  variant: 'center',
  swatch: ['#c6ff2e', '#0b100e', '#f2f5ef'],
}

registry['lower'] = {
  id: 'lower',
  kind: 'title',
  name: 'Lower third',
  duration: 4,
  variant: 'lower',
  swatch: ['#2ee6a8', '#0b100e', '#f2f5ef'],
}

MUSIC_STYLES.forEach((m) => {
  registry[`music-${m.style}`] = {
    id: `music-${m.style}`,
    kind: 'music',
    name: m.name,
    duration: 16,
    style: m.style,
    bpm: m.bpm,
    swatch: ['#c6ff2e', '#0b100e', '#2ee6a8'],
  }
})

export function getAsset(id) {
  return registry[id]
}

export function sceneAssets() {
  return SCENE_ASSETS.map((s) => registry[s.id])
}

export function titleAssets() {
  return [registry.title, registry.lower]
}

export function musicAssets() {
  return MUSIC_STYLES.map((m) => registry[`music-${m.style}`])
}

export function mediaAssets() {
  return Object.values(registry).filter((a) => a.kind === 'image' || a.kind === 'video')
}

let mediaSeq = 0

export function addMediaAsset({ kind, name, el, url, width, height, duration }) {
  const id = `media-${Date.now().toString(36)}-${mediaSeq++}`
  registry[id] = {
    id,
    kind,
    name,
    el,
    url,
    width,
    height,
    duration: kind === 'video' ? Math.max(1, duration || el.duration || 8) : 6,
    swatch: ['#3ee0ff', '#0b100e', '#c6ff2e'],
  }
  return registry[id]
}

export function removeMediaAsset(id) {
  const asset = registry[id]
  if (asset && asset.url) URL.revokeObjectURL(asset.url)
  delete registry[id]
}

export function dropMissingMedia(project) {
  const valid = (clip) => !!registry[clip.assetId]
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter(valid),
    })),
  }
}

function drawCover(ctx, el, w, h) {
  const iw = el.videoWidth || el.naturalWidth || el.width || 16
  const ih = el.videoHeight || el.naturalHeight || el.height || 9
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(el, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

function drawTitle(ctx, clip, w, h) {
  const text = (clip.text || 'TITLE').toUpperCase()
  const size = Math.max(16, w * (clip.textSize || 0.085))
  const lower = clip.variant === 'lower'
  const x = w / 2
  const y = lower ? h * 0.76 : h * 0.5
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${size}px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif`
  try {
    ctx.letterSpacing = `${Math.round(size * 0.1)}px`
  } catch {
    /* older canvas: no tracking */
  }
  if (clip.shadow !== false) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = size * 0.4
    ctx.shadowOffsetY = size * 0.06
  }
  ctx.fillStyle = clip.textColor || '#f6f8f2'
  ctx.fillText(text, x, y)
  ctx.shadowColor = 'transparent'
  const barW = Math.min(w * 0.14, size * 2.2)
  ctx.fillStyle = clip.accent || '#c6ff2e'
  ctx.fillRect(x - barW / 2, y + size * 0.66, barW, Math.max(2, size * 0.055))
  if (clip.subtitle) {
    ctx.font = `500 ${Math.round(size * 0.26)}px ui-monospace, Menlo, monospace`
    ctx.fillStyle = 'rgba(242,245,239,0.8)'
    try {
      ctx.letterSpacing = `${Math.round(size * 0.06)}px`
    } catch {
      /* noop */
    }
    ctx.fillText(clip.subtitle.toUpperCase(), x, y + size * 1.1)
  }
  ctx.restore()
}

export function drawAsset(ctx, asset, localTime, w, h, clip) {
  if (!asset) return
  switch (asset.kind) {
    case 'scene':
      drawScene(ctx, asset.scene, localTime, asset.palette, w, h)
      break
    case 'image':
      if (asset.el) drawCover(ctx, asset.el, w, h)
      break
    case 'video':
      // a video can report readyState 0 while it is still decoding
      if (asset.el && asset.el.readyState >= 2) drawCover(ctx, asset.el, w, h)
      break
    case 'title':
      drawTitle(ctx, clip || {}, w, h)
      break
    default:
      break
  }
}

export function assetLabel(clip) {
  const asset = registry[clip.assetId]
  if (!asset) return 'Missing media'
  if (asset.kind === 'title') return clip.text ? `“${clip.text}”` : asset.name
  return asset.name
}
