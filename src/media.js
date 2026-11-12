import { getAsset } from './assets'

// Per-video seek bookkeeping. Blob videos without an index (for example a
// MediaRecorder capture) can never satisfy a seek, so we (a) never queue more
// than one seek per element and (b) give up instead of piling up listeners.
const pendingSeek = new WeakMap()

/**
 * Keep imported <video> elements aligned with the timeline. Playing clips run
 * and get drift-corrected; paused clips are seeked to the exact source frame.
 * `onReady` fires when a seek settles so the canvas can repaint.
 */
export function syncVideoElements(project, time, playing, onReady) {
  project.tracks.forEach((track) => {
    if (track.type !== 'video') return
    track.clips.forEach((clip) => {
      const asset = getAsset(clip.assetId)
      if (!asset || asset.kind !== 'video' || !asset.el) return
      const video = asset.el
      const active = time >= clip.start && time < clip.start + clip.duration && clip.visible !== false
      const local = Math.max(0, (clip.inPoint || 0) + (time - clip.start))

      if (video.muted !== true) video.muted = true
      if (video.playsInline !== true) video.playsInline = true

      if (!active) {
        if (!video.paused) video.pause()
        return
      }

      if (playing) {
        if (video.paused) {
          try {
            video.currentTime = local
          } catch {
            /* not seekable yet */
          }
          const attempt = video.play()
          if (attempt && attempt.catch) attempt.catch(() => {})
        } else if (Math.abs(video.currentTime - local) > 0.3 && !video.seeking) {
          try {
            video.currentTime = local
          } catch {
            /* ignore */
          }
        }
        return
      }

      if (!video.paused) video.pause()
      if (pendingSeek.get(video) || video.seeking) return
      if (Math.abs(video.currentTime - local) <= 0.05) return
      // an unseekable source will never settle; leave the frame as it is
      if (video.seekable && video.seekable.length === 0) return

      pendingSeek.set(video, true)
      const settle = () => {
        pendingSeek.delete(video)
        video.removeEventListener('seeked', settle)
        video.removeEventListener('error', settle)
        if (onReady) onReady()
      }
      video.addEventListener('seeked', settle)
      video.addEventListener('error', settle)
      setTimeout(() => {
        if (!pendingSeek.get(video)) return
        pendingSeek.delete(video)
        video.removeEventListener('seeked', settle)
        video.removeEventListener('error', settle)
      }, 1500)
      try {
        video.currentTime = local
      } catch {
        settle()
      }
    })
  })
}

export function pauseAllVideos(project) {
  project.tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      const asset = getAsset(clip.assetId)
      if (asset && asset.kind === 'video' && asset.el && !asset.el.paused) asset.el.pause()
    })
  })
}

export function resetVideo(asset) {
  if (!asset || asset.kind !== 'video' || !asset.el) return
  try {
    asset.el.pause()
    asset.el.currentTime = 0
  } catch {
    /* ignore */
  }
}
