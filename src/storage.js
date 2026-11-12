import { seedProject } from './editor'
import { dropMissingMedia } from './assets'

const KEY = 'tgg-studio:project:v1'
const SETTINGS_KEY = 'tgg-studio:settings:v1'
const PUBLISHED_KEY = 'tgg-studio:published:v1'

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

export function saveProject(project) {
  try {
    localStorage.setItem(KEY, JSON.stringify(project))
  } catch {
    /* quota or private mode: editing continues in memory */
  }
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

export function savePublished(list) {
  try {
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(list))
  } catch {
    /* quota: the feed keeps working for this session */
  }
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
