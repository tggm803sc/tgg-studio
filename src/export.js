import { drawProjectFrame } from './render'
import { pauseAllVideos, syncVideoElements } from './media'
import { projectDuration } from './editor'
import { getAsset } from './assets'
import { scheduleSpan } from './audio'

const CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) || ''
}

export function canExport() {
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    !!HTMLCanvasElement.prototype.captureStream
  )
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Record the timeline to a downloadable video by drawing frames in real time
 * onto a canvas and capturing it together with the synthesized soundtrack.
 */
export async function exportProject(project, options = {}) {
  const fps = options.fps || project.fps || 30
  const bitrate = options.bitrate || 8_000_000
  const withAudio = options.audio !== false
  const onProgress = options.onProgress || (() => {})
  const isCancelled = options.isCancelled || (() => false)

  if (!canExport()) throw new Error('This browser cannot record a canvas')

  const duration = Math.max(0.5, projectDuration(project))
  const canvas = document.createElement('canvas')
  canvas.width = project.width
  canvas.height = project.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')

  const stream = canvas.captureStream(fps)
  const videoTrack = stream.getVideoTracks()[0]

  let audioCtx = null
  let audioIncluded = false
  if (withAudio) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (Ctx) {
      audioCtx = new Ctx()
      if (audioCtx.state !== 'running') {
        try {
          await audioCtx.resume()
        } catch {
          /* handled by the state check below */
        }
      }
      // A suspended context emits no audio frames, which stalls the muxer and
      // yields an empty recording. Only attach audio when it is really running.
      if (audioCtx.state === 'running') {
        const audioDestination = audioCtx.createMediaStreamDestination()
        project.tracks
          .filter((t) => t.type === 'audio')
          .forEach((track) => {
            track.clips.forEach((clip) => {
              const asset = getAsset(clip.assetId)
              if (!asset || asset.kind !== 'music' || clip.muted) return
              scheduleSpan(
                audioCtx,
                audioDestination,
                { style: asset.style, bpm: asset.bpm },
                audioCtx.currentTime + 0.08 + clip.start,
                clip.duration,
                clip.volume == null ? 0.8 : clip.volume,
              )
            })
          })
        const audioTrack = audioDestination.stream.getAudioTracks()[0]
        if (audioTrack) {
          stream.addTrack(audioTrack)
          audioIncluded = true
        }
      }
    }
  }

  const mimeType = pickMimeType()
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: bitrate,
  })
  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data)
  }
  const stopped = new Promise((resolve) => {
    recorder.onstop = resolve
  })
  recorder.onerror = (event) => {
    console.warn('[export] recorder error', event && event.error && event.error.name)
  }

  drawProjectFrame(ctx, project, 0, canvas.width, canvas.height)
  recorder.start(200)

  const frames = Math.max(1, Math.round(duration * fps))
  const frameMs = 1000 / fps
  const startedAt = performance.now()

  // never let a stuck decoder keep the recorder alive forever
  const watchdog = setTimeout(() => {
    try {
      if (recorder.state !== 'inactive') recorder.stop()
    } catch {
      /* already stopped */
    }
  }, duration * 1000 + 20000)

  for (let i = 0; i < frames; i += 1) {
    if (isCancelled()) break
    const t = i / fps
    // imported videos play muted in real time and get drift-corrected here
    try {
      syncVideoElements(project, t, true)
    } catch {
      /* drawing continues with the last decoded frame */
    }
    drawProjectFrame(ctx, project, t, canvas.width, canvas.height)
    onProgress(Math.min(0.99, (i + 1) / frames))
    const target = startedAt + (i + 1) * frameMs
    const wait = target - performance.now()
    if (wait > 0) await sleep(wait)
    else await sleep(0)
  }

  onProgress(1)
  await sleep(220)
  clearTimeout(watchdog)
  if (recorder.state !== 'inactive') recorder.stop()
  pauseAllVideos(project)
  await stopped
  stream.getTracks().forEach((t) => t.stop())
  if (audioCtx) {
    try {
      await audioCtx.close()
    } catch {
      /* already closed */
    }
  }

  const blob = new Blob(chunks, { type: mimeType || 'video/webm' })

  // Some browsers stall the muxer when a silent audio track is attached. Rather
  // than hand back an empty file, re-record without audio and say so.
  if (blob.size === 0 && audioIncluded && !options._audioRetry) {
    return exportProject(project, {
      ...options,
      audio: false,
      audioRequested: true,
      _audioRetry: true,
    })
  }

  console.info('[export] done', {
    chunks: chunks.length,
    size: blob.size,
    frames,
    duration,
    mimeType: mimeType || 'video/webm',
    audio: audioIncluded,
    recorded: Math.round((performance.now() - startedAt) / 1000),
  })
  return {
    blob,
    duration,
    mimeType: mimeType || 'video/webm',
    size: blob.size,
    audioIncluded,
    audioRequested: options.audioRequested || withAudio,
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function safeFilename(name) {
  const base = (name || 'tgg-cut').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${base || 'tgg-cut'}.webm`
}
