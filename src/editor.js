// Timeline model: plain data + pure helpers. Every helper returns a new project
// so the history stack can snapshot cheaply.

export const ASPECTS = [
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
]

export const MIN_CLIP = 0.2

let seq = 0
export function newId(prefix = 'c') {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`
}

export function emptyProject() {
  return {
    id: `proj-${Date.now()}`,
    name: 'Untitled cut',
    aspect: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    tracks: [
      { id: 'v1', type: 'video', name: 'V1', clips: [] },
      { id: 'v2', type: 'video', name: 'V2', clips: [] },
      { id: 'a1', type: 'audio', name: 'A1', clips: [] },
    ],
  }
}

export function makeClip(assetId, start, duration, extra = {}) {
  return {
    id: newId('clip'),
    assetId,
    start: Math.max(0, start),
    duration: Math.max(MIN_CLIP, duration),
    inPoint: 0,
    opacity: 1,
    filter: 'none',
    fadeIn: false,
    fadeOut: false,
    volume: 0.8,
    ...extra,
  }
}

export function seedProject() {
  const project = emptyProject()
  project.name = 'Salt Flats — first cut'
  project.tracks[0].clips = [
    makeClip('salt', 0, 7),
    makeClip('city', 7, 5.5),
    makeClip('studio', 12.5, 6),
    makeClip('stage', 18.5, 5.5),
  ]
  project.tracks[1].clips = [
    makeClip('title', 0.6, 4.4, { text: 'SALT FLATS', subtitle: 'a TGG studio cut', fadeIn: true, fadeOut: true }),
    makeClip('lower', 13, 4, { text: 'STUDIO 808', subtitle: 'take four', fadeIn: true, fadeOut: true }),
  ]
  project.tracks[2].clips = [makeClip('music-phonk', 0, 24)]
  return project
}

export function projectDuration(project) {
  let end = 0
  project.tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      end = Math.max(end, clip.start + clip.duration)
    })
  })
  return end
}

export function findClip(project, clipId) {
  for (const track of project.tracks) {
    const clip = track.clips.find((c) => c.id === clipId)
    if (clip) return { track, clip }
  }
  return null
}

export function trackOf(project, clipId) {
  return project.tracks.find((t) => t.clips.some((c) => c.id === clipId))
}

function withTracks(project, tracks) {
  return { ...project, tracks }
}

export function addClip(project, trackId, clip) {
  return withTracks(
    project,
    project.tracks.map((track) =>
      track.id === trackId
        ? { ...track, clips: [...track.clips, clip].sort((a, b) => a.start - b.start) }
        : track,
    ),
  )
}

export function updateClip(project, clipId, patch) {
  return withTracks(
    project,
    project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)),
    })),
  )
}

export function removeClip(project, clipId) {
  return withTracks(
    project,
    project.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((clip) => clip.id !== clipId),
    })),
  )
}

export function moveClip(project, clipId, toTrackId, start) {
  const found = findClip(project, clipId)
  if (!found) return project
  const { track, clip } = found
  const moved = { ...clip, start: Math.max(0, start) }
  if (track.id === toTrackId) return updateClip(project, clipId, { start: moved.start })
  return withTracks(
    project,
    project.tracks.map((t) => {
      if (t.id === track.id) return { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
      if (t.id === toTrackId) return { ...t, clips: [...t.clips, moved] }
      return t
    }),
  )
}

export function splitClip(project, clipId, at) {
  const found = findClip(project, clipId)
  if (!found) return project
  const { clip } = found
  const offset = at - clip.start
  if (offset < MIN_CLIP || clip.duration - offset < MIN_CLIP) return project
  const left = { ...clip, duration: offset }
  const right = {
    ...clip,
    id: newId('clip'),
    start: at,
    duration: clip.duration - offset,
    inPoint: clip.inPoint + offset,
  }
  return withTracks(
    project,
    project.tracks.map((track) =>
      track.clips.some((c) => c.id === clipId)
        ? { ...track, clips: [...track.clips.filter((c) => c.id !== clipId), left, right] }
        : track,
    ),
  )
}

export function duplicateClip(project, clipId) {
  const found = findClip(project, clipId)
  if (!found) return project
  const copy = { ...found.clip, id: newId('clip'), start: found.clip.start + found.clip.duration }
  return addClip(project, found.track.id, copy)
}

export function trimClip(project, clipId, edge, delta) {
  const found = findClip(project, clipId)
  if (!found) return project
  const { clip } = found
  if (edge === 'left') {
    const d = Math.min(delta, clip.duration - MIN_CLIP)
    const start = Math.max(0, clip.start + d)
    const applied = start - clip.start
    return updateClip(project, clipId, {
      start,
      duration: clip.duration - applied,
      inPoint: Math.max(0, clip.inPoint + applied),
    })
  }
  const duration = Math.max(MIN_CLIP, clip.duration + delta)
  return updateClip(project, clipId, { duration })
}

export function setAspect(project, aspectId) {
  const aspect = ASPECTS.find((a) => a.id === aspectId) || ASPECTS[0]
  return { ...project, aspect: aspect.id, width: aspect.width, height: aspect.height }
}

export function snapTime(time, project, excludeClipId, playhead) {
  const threshold = 0.14
  const candidates = [0, playhead]
  project.tracks.forEach((track) =>
    track.clips.forEach((clip) => {
      if (clip.id === excludeClipId) return
      candidates.push(clip.start, clip.start + clip.duration)
    }),
  )
  let best = time
  let bestDelta = threshold
  candidates.forEach((c) => {
    const d = Math.abs(c - time)
    if (d < bestDelta) {
      bestDelta = d
      best = c
    }
  })
  return Math.max(0, Number(best.toFixed(3)))
}

export function formatTime(seconds, withFrames = false, fps = 30) {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  if (!withFrames) return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  const frames = Math.floor((s % 1) * fps)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(frames).padStart(2, '0')}`
}

export function historyReducer(state, action) {
  switch (action.type) {
    case 'set':
      if (action.history === false) return { ...state, present: action.project }
      if (action.project === state.present) return state
      return { past: [...state.past, state.present].slice(-60), present: action.project, future: [], pending: null }
    case 'checkpoint':
      return { ...state, pending: state.present }
    case 'commitCheckpoint':
      if (!state.pending || state.pending === state.present) return { ...state, pending: null }
      return {
        past: [...state.past, state.pending].slice(-60),
        present: state.present,
        future: [],
        pending: null,
      }
    case 'undo': {
      if (!state.past.length) return state
      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, 60),
        pending: null,
      }
    }
    case 'redo': {
      if (!state.future.length) return state
      const next = state.future[0]
      return {
        past: [...state.past, state.present].slice(-60),
        present: next,
        future: state.future.slice(1),
        pending: null,
      }
    }
    case 'load':
      return { past: [], present: action.project, future: [], pending: null }
    default:
      return state
  }
}
