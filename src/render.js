import { drawAsset } from './assets'

export const FILTERS = {
  none: { label: 'None', css: 'none' },
  warm: { label: 'Warm', css: 'sepia(0.26) saturate(1.25) contrast(1.04)' },
  cool: { label: 'Cool', css: 'hue-rotate(-16deg) saturate(1.12) brightness(1.02)' },
  noir: { label: 'Noir', css: 'grayscale(1) contrast(1.18)' },
  punch: { label: 'Punch', css: 'contrast(1.22) saturate(1.35)' },
  dream: { label: 'Dream', css: 'blur(1.1px) saturate(1.2) brightness(1.06)' },
}

export const FADE = 0.45

/**
 * Composite the timeline at `time` into a 2D context. Pure enough to reuse in
 * the live preview, thumbnails and the exporter.
 */
export function drawProjectFrame(ctx, project, time, w, h) {
  ctx.save()
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#04060a'
  ctx.fillRect(0, 0, w, h)

  project.tracks.forEach((track) => {
    if (track.type !== 'video') return
    track.clips.forEach((clip) => {
      if (clip.visible === false) return
      const end = clip.start + clip.duration
      if (time < clip.start || time >= end) return
      const local = time - clip.start + (clip.inPoint || 0)
      let alpha = clip.opacity == null ? 1 : clip.opacity
      if (clip.fadeIn) alpha *= Math.min(1, (time - clip.start) / FADE)
      if (clip.fadeOut) alpha *= Math.min(1, (end - time) / FADE)
      if (alpha <= 0.001) return
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      ctx.filter = (FILTERS[clip.filter] || FILTERS.none).css
      drawAsset(ctx, assetOf(clip.assetId), local, w, h, clip)
      ctx.restore()
    })
  })

  ctx.restore()
}

let lookup = null

export function setAssetLookup(fn) {
  lookup = fn
}

function assetOf(id) {
  if (!lookup) return null
  return lookup(id)
}
