import { seedProject } from './editor.js'
import { dropMissingMedia } from './assets.js'

const KEY = 'tgg-studio:project:v1'
const SETTINGS_KEY = 'tgg-studio:settings:v1'
const PUBLISHED_KEY = 'tgg-studio:published:v1'

/**
 * localStorage is a small, shared budget (5 MB in most browsers) and published
 * posters are JPEG data URLs, which makes them by far the biggest thing we
 * store. They are also the most replaceable: the cut's title, caption, audio
 * and duration are what the feed needs, so posters are the first thing given
 * up when the budget runs out.
 */
export const MAX_PUBLISHED_CUTS = 30

/** Drop posters from every cut after the first `keep`, keeping the cuts themselves. */
export function withoutPosters(cuts, keep = 0) {
  return cuts.map((cut, index) =>
    index < keep || !cut.poster ? cut : { ...cut, poster: null },
  )
}

const ALERT_ID = 'tgg-studio-storage-alert'

/**
 * Losing an edit to a full browser profile used to be completely silent. A
 * calm, dismissible banner is the cheapest honest signal, and it works whatever
 * component happens to trigger the save.
 */
function announce(message) {
  if (typeof document === 'undefined') return
  let el = document.getElementById(ALERT_ID)
  if (!message) {
    if (el) el.remove()
    return
  }
  if (!el) {
    el = document.createElement('div')
    el.id = ALERT_ID
    el.setAttribute('role', 'status')
    el.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:18px',
      'transform:translateX(-50%)',
      'z-index:9999',
      'max-width:min(520px,calc(100vw - 32px))',
      'padding:10px 14px',
      'border-radius:10px',
      'border:1px solid #c7ff00',
      'background:#0b0d10',
      'color:#eaf2ff',
      'font:500 13px/1.4 system-ui,sans-serif',
      'box-shadow:0 10px 30px rgba(0,0,0,.45)',
    ].join(';')
    document.body.appendChild(el)
  }
  el.textContent = message
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function loadProject() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedProject()
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.tracks)) return seedProject()
    return dropMissingMedia(parsed)
  } catch {
    return seedProject()
  }
}

/**
 * Save the timeline. Returns 'saved', 'trimmed' (the edit landed only after
 * freeing poster space) or 'failed' — callers surface the latter, because a
 * silently unsaved edit is how work gets lost.
 */
export function saveProject(project) {
  const payload = JSON.stringify(project)
  if (write(KEY, payload)) {
    announce('')
    return 'saved'
  }

  const cuts = loadPublished()
  if (cuts.some((cut) => cut.poster)) {
    if (write(PUBLISHED_KEY, JSON.stringify(withoutPosters(cuts, 0))) && write(KEY, payload)) {
      announce('Storage is full — saved, and the oldest reel posters were dropped.')
      return 'trimmed'
    }
  }
  announce('Storage is full — this edit is not being saved. Export the cut now.')
  return 'failed'
}

export function loadPublished() {
  try {
    const raw = localStorage.getItem(PUBLISHED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Save the feed, newest cuts first. Returns the list actually stored (so the
 * caller can keep memory and storage in step) plus what had to be given up.
 */
export function savePublished(list) {
  const capped = list.slice(0, MAX_PUBLISHED_CUTS)
  if (write(PUBLISHED_KEY, JSON.stringify(capped))) {
    return { cuts: capped, status: 'saved' }
  }
  const stripped = withoutPosters(capped, 0)
  if (write(PUBLISHED_KEY, JSON.stringify(stripped))) {
    return { cuts: stripped, status: 'without-posters' }
  }
  return { cuts: capped, status: 'failed' }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? JSON.parse(raw) : { snap: true, snapPlayhead: true }
  } catch {
    return { snap: true, snapPlayhead: true }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}
