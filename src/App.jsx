import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import MediaBin from './components/MediaBin'
import Preview from './components/Preview'
import Timeline from './components/Timeline'
import Inspector from './components/Inspector'
import ExportDialog from './components/ExportDialog'
import Feed from './components/Feed'
import PublishDialog from './components/PublishDialog'
import { engine } from './audio'
import { pauseAllVideos, syncVideoElements } from './media'
import { loadProject, saveProject, loadSettings, saveSettings, loadPublished, savePublished } from './storage'
import { getAsset } from './assets'
import { setAssetLookup } from './render'
import {
  addClip,
  duplicateClip,
  emptyProject,
  findClip,
  formatTime,
  historyReducer,
  makeClip,
  moveClip,
  projectDuration,
  removeClip,
  setAspect,
  splitClip,
  trimClip,
  updateClip,
} from './editor'
import { MuteIcon, RedoIcon, UndoIcon, VolumeIcon, FilmIcon, SplitIcon, TrashIcon, ShareIcon } from './components/Icons'

setAssetLookup(getAsset)

const ZOOM_STEPS = [16, 22, 30, 40, 54, 72, 96, 128, 170, 220, 300]

export default function App() {
  const [history, dispatch] = useReducer(historyReducer, undefined, () => ({
    past: [],
    present: loadProject(),
    future: [],
    pending: null,
  }))
  const project = history.present

  const [selectedId, setSelectedId] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [pxPerSec, setPxPerSec] = useState(80)
  const [settings, setSettings] = useState(loadSettings)
  const [mediaVersion, setMediaVersion] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [view, setView] = useState('studio')
  const [feed, setFeed] = useState(loadPublished)
  const [publishOpen, setPublishOpen] = useState(false)
  const [poster, setPoster] = useState('')
  const [toast, setToast] = useState(null)
  const [muted, setMuted] = useState(false)

  const timeRef = useRef(0)
  const projectRef = useRef(project)
  projectRef.current = project
  const playingRef = useRef(playing)
  playingRef.current = playing
  const zoomRef = useRef(pxPerSec)
  zoomRef.current = pxPerSec
  const drawRef = useRef(null)
  const stageCanvasRef = useRef(null)
  const playheadRef = useRef(null)
  const toastTimer = useRef(null)
  const saveTimer = useRef(null)

  const duration = projectDuration(project)
  const selection = useMemo(() => (selectedId ? findClip(project, selectedId) : null), [project, selectedId])

  const showToast = useCallback((message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }, [])

  const paint = useCallback(
    (t) => {
      syncVideoElements(projectRef.current, t, playingRef.current, () => {
        if (drawRef.current) drawRef.current(timeRef.current)
      })
      if (drawRef.current) drawRef.current(t)
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${t * zoomRef.current}px)`
      }
    },
    [],
  )

  const seek = useCallback(
    (t) => {
      const clamped = Math.max(0, Math.min(t, Math.max(projectDuration(projectRef.current), 0.1)))
      timeRef.current = clamped
      paint(clamped)
      setTime(clamped)
      if (engine.running) engine.pause()
    },
    [paint],
  )

  // paint whenever the project changes (so trims, filters, fills show instantly)
  useEffect(() => {
    paint(timeRef.current)
  }, [project, paint])

  // persist, debounced
  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveProject(project), 350)
    return () => clearTimeout(saveTimer.current)
  }, [project])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const togglePlay = useCallback(async () => {
    if (playing) {
      setPlaying(false)
      engine.pause()
      pauseAllVideos(projectRef.current)
      return
    }
    const dur = projectDuration(projectRef.current)
    if (timeRef.current >= dur - 0.02) seek(0)
    await engine.unlock()
    engine.setMuted(muted)
    setPlaying(true)
  }, [playing, muted, seek])

  // transport clock: drives canvas + playhead imperatively, state at ~10 Hz
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    const tick = (now) => {
      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      const total = Math.max(0.1, projectDuration(projectRef.current))
      const next = timeRef.current + dt
      if (next >= total) {
        timeRef.current = total
        paint(total)
        setTime(total)
        setPlaying(false)
        pauseAllVideos(projectRef.current)
        return
      }
      timeRef.current = next
      paint(next)
      acc += dt
      if (acc >= 0.09) {
        acc = 0
        setTime(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, paint])

  // simple soundtrack preview from the audio track under the playhead
  useEffect(() => {
    if (!playing) {
      engine.pause()
      return
    }
    const clips = projectRef.current.tracks.filter((t) => t.type === 'audio').flatMap((t) => t.clips)
    const active = clips.find(
      (c) => !c.muted && timeRef.current >= c.start && timeRef.current < c.start + c.duration,
    )
    const asset = active ? getAsset(active.assetId) : null
    if (asset && asset.kind === 'music') {
      engine.setMuted(muted)
      engine.play({ style: asset.style, bpm: asset.bpm })
    }
    return () => engine.pause()
  }, [playing, muted])

  useEffect(() => {
    engine.setMuted(muted)
  }, [muted])

  const updateProject = useCallback((next, opts) => {
    dispatch({ type: 'set', project: next, ...opts })
  }, [])

  const patchClip = useCallback(
    (clipId, changes) => updateProject(updateClip(projectRef.current, clipId, changes)),
    [updateProject],
  )

  const onDropAsset = useCallback(
    (assetId, trackId, start) => {
      const asset = getAsset(assetId)
      if (!asset) return
      const clip = makeClip(assetId, Math.max(0, start), asset.duration, {
        ...(asset.kind === 'title' ? { text: asset.variant === 'lower' ? 'STUDIO 808' : 'SALT FLATS', subtitle: 'a TGG cut' } : {}),
      })
      const next = addClip(projectRef.current, trackId, clip)
      updateProject(next)
      setSelectedId(clip.id)
      showToast(`Added ${asset.name}`)
    },
    [updateProject, showToast],
  )

  const onAddAsset = useCallback(
    (assetId) => {
      const asset = getAsset(assetId)
      if (!asset) return
      const p = projectRef.current
      const wantAudio = asset.kind === 'music'
      const track = p.tracks.find((t) => (wantAudio ? t.type === 'audio' : t.type === 'video'))
      if (!track) {
        showToast('No compatible track')
        return
      }
      const trackEnd = track.clips.reduce((end, c) => Math.max(end, c.start + c.duration), 0)
      onDropAsset(assetId, track.id, Math.max(trackEnd, 0))
    },
    [onDropAsset, showToast],
  )

  const splitSelected = useCallback(() => {
    if (!selectedId) {
      showToast('Select a clip to split')
      return
    }
    const p = projectRef.current
    const next = splitClip(p, selectedId, timeRef.current)
    if (next === p) {
      showToast('Move the playhead inside the clip first')
      return
    }
    updateProject(next)
    showToast('Split at playhead')
  }, [selectedId, updateProject, showToast])

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return
    const p = projectRef.current
    const found = findClip(p, selectedId)
    const next = duplicateClip(p, selectedId)
    updateProject(next)
    if (found) setSelectedId(null)
  }, [selectedId, updateProject])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    updateProject(removeClip(projectRef.current, selectedId))
    setSelectedId(null)
    showToast('Clip deleted')
  }, [selectedId, updateProject, showToast])

  const newProject = useCallback(() => {
    const fresh = emptyProject()
    dispatch({ type: 'load', project: fresh })
    setSelectedId(null)
    seek(0)
    setPlaying(false)
    showToast('New project')
  }, [seek, showToast])

  const changeAspect = useCallback(
    (id) => {
      updateProject(setAspect(projectRef.current, id))
    },
    [updateProject],
  )

  const changeProject = useCallback(
    (patch) => {
      updateProject({ ...projectRef.current, ...patch })
    },
    [updateProject],
  )

  const switchView = useCallback(
    (next) => {
      if (next === view) return
      setPlaying(false)
      engine.pause()
      pauseAllVideos(projectRef.current)
      setView(next)
    },
    [view],
  )

  // "Edit" on a reel drops that scene onto the timeline and jumps back to work
  const remixScene = useCallback(
    (assetId) => {
      const asset = getAsset(assetId)
      const p = projectRef.current
      const track = p.tracks.find((t) => t.type === 'video')
      if (!asset || !track) return
      const trackEnd = track.clips.reduce((end, c) => Math.max(end, c.start + c.duration), 0)
      const clip = makeClip(assetId, trackEnd, asset.duration || 12, {})
      updateProject(addClip(p, track.id, clip))
      setSelectedId(clip.id)
      setView('studio')
      seek(trackEnd)
      showToast(`${asset.name} added to the timeline`)
    },
    [updateProject, seek, showToast],
  )

  const onZoom = useCallback((dir) => {
    setPxPerSec((current) => {
      const above = ZOOM_STEPS.findIndex((step) => step >= current)
      const base = above === -1 ? ZOOM_STEPS.length - 1 : above
      return ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, base + dir))]
    })
  }, [])

  const onZoomSet = useCallback((px) => {
    setPxPerSec(Math.max(6, Math.min(400, px)))
  }, [])

  const audioAtPlayhead = useCallback(() => {
    const clips = projectRef.current.tracks.filter((t) => t.type === 'audio').flatMap((t) => t.clips)
    const active = clips.find(
      (c) => !c.muted && timeRef.current >= c.start && timeRef.current < c.start + c.duration,
    )
    return active ? getAsset(active.assetId)?.name || '' : ''
  }, [])

  // grab the frame under the playhead and centre-crop it to a 9:16 reel poster
  const capturePoster = useCallback(() => {
    paint(timeRef.current)
    const src = stageCanvasRef.current
    if (!src || !src.width) return ''
    const out = document.createElement('canvas')
    out.width = 540
    out.height = 960
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#04060a'
    ctx.fillRect(0, 0, out.width, out.height)

    const target = out.width / out.height
    const ratio = src.width / src.height
    let sw = src.width
    let sh = src.height
    let sx = 0
    let sy = 0
    if (ratio > target) {
      sw = Math.round(src.height * target)
      sx = Math.round((src.width - sw) / 2)
    } else {
      sh = Math.round(src.width / target)
      sy = Math.round((src.height - sh) / 2)
    }
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height)
    return out.toDataURL('image/jpeg', 0.72)
  }, [paint])

  const openPublish = useCallback(() => {
    if (!projectDuration(projectRef.current)) {
      showToast('Add a clip before publishing')
      return
    }
    const data = capturePoster()
    if (!data) {
      showToast('Could not grab a frame')
      return
    }
    setPoster(data)
    setPublishOpen(true)
  }, [capturePoster, showToast])

  const publishCut = useCallback(
    (meta) => {
      const cut = {
        id: `cut-${Date.now().toString(36)}`,
        title: meta.title,
        handle: meta.handle,
        caption: meta.caption,
        audio: audioAtPlayhead(),
        poster,
        duration: projectDuration(projectRef.current),
        createdAt: Date.now(),
      }
      const next = [cut, ...feed]
      setFeed(next)
      savePublished(next)
      setPublishOpen(false)
      setPoster('')
      setPlaying(false)
      engine.pause()
      pauseAllVideos(projectRef.current)
      setView('feed')
      showToast('Published to the feed')
    },
    [feed, poster, audioAtPlayhead, showToast],
  )

  const registerDraw = useCallback((fn) => {
    drawRef.current = fn
  }, [])

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (view !== 'studio') return
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        seek(timeRef.current + (e.shiftKey ? 1 : 1 / (projectRef.current.fps || 30)))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        seek(timeRef.current - (e.shiftKey ? 1 : 1 / (projectRef.current.fps || 30)))
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        onZoom(1)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        onZoom(-1)
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        splitSelected()
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault()
        duplicateSelected()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault()
          deleteSelected()
        }
      } else if (e.key === 'Escape') {
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, seek, splitSelected, duplicateSelected, deleteSelected, selectedId, view, onZoom])

  const totalClips = project.tracks.reduce((n, t) => n + t.clips.length, 0)

  return (
    <div className={`studio${view === 'feed' ? ' feed-mode' : ''}`}>
      <header className="topbar">
        <div className="brandmark">
          <span className="mark">
            <FilmIcon size={15} />
          </span>
          <strong>TGG</strong>
          <em>STUDIO</em>
        </div>

        <div className="view-switch" role="tablist" aria-label="Workspace view">
          <button
            role="tab"
            aria-selected={view === 'studio'}
            className={view === 'studio' ? 'is-active' : ''}
            onClick={() => switchView('studio')}
          >
            Studio
          </button>
          <button
            role="tab"
            aria-selected={view === 'feed'}
            className={view === 'feed' ? 'is-active' : ''}
            onClick={() => switchView('feed')}
          >
            Feed
            {feed.length > 0 && <span className="tab-count">{feed.length}</span>}
          </button>
        </div>

        <div className="project-pill">
          <span className="dot" />
          <input
            className="project-name"
            value={project.name}
            onChange={(e) => changeProject({ name: e.target.value })}
            aria-label="Project name"
            maxLength={48}
          />
          <span className="project-meta">
            {project.aspect} · {project.fps}fps · {formatTime(duration)}
          </span>
        </div>

        <div className="topbar-actions">
          <button
            className="icon-btn"
            onClick={() => dispatch({ type: 'undo' })}
            disabled={!history.past.length}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={() => dispatch({ type: 'redo' })}
            disabled={!history.future.length}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <RedoIcon size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute preview' : 'Mute preview'}
            aria-pressed={muted}
          >
            {muted ? <MuteIcon size={17} /> : <VolumeIcon size={17} />}
          </button>
          <button className="ghost-btn" onClick={newProject}>
            New
          </button>
          <button className="ghost-btn" onClick={openPublish} title="Send the frame under the playhead to the feed">
            <ShareIcon size={13} /> Publish
          </button>
          <button className="primary-btn" onClick={() => setExportOpen(true)}>
            Export
          </button>
        </div>
      </header>

      <div className="workspace">
        <MediaBin
          onAdd={onAddAsset}
          onImported={() => setMediaVersion((v) => v + 1)}
          mediaVersion={mediaVersion}
          onToast={showToast}
          activeTrackType={selection ? selection.track.type : 'video'}
        />

        <section className="stage">
          <Preview
            project={project}
            time={time}
            playing={playing}
            duration={duration}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onStep={(dir) => seek(timeRef.current + dir / (project.fps || 30))}
            registerDraw={registerDraw}
            hasClips={totalClips > 0}
            stageRef={stageCanvasRef}
          />
          <div className="stage-tools">
            <button className="ghost-btn" onClick={splitSelected} title="Split at playhead (S)">
              <SplitIcon size={13} /> Split
            </button>
            <button className="ghost-btn" onClick={deleteSelected} disabled={!selectedId}>
              <TrashIcon size={13} /> Delete
            </button>
            <span className="stage-hint">
              {selection
                ? `Selected: ${getAsset(selection.clip.assetId)?.name || 'missing media'}`
                : `${totalClips} clips on ${project.tracks.length} tracks`}
            </span>
          </div>
        </section>

        <Inspector
          project={project}
          clip={selection ? selection.clip : null}
          track={selection ? selection.track : null}
          onProjectChange={changeProject}
          onAspect={changeAspect}
          onChange={(changes) => selection && patchClip(selection.clip.id, changes)}
          onSplit={splitSelected}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onSeek={seek}
        />
      </div>

      <Timeline
        project={project}
        time={time}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onSeek={seek}
        onMoveClip={(clipId, trackId, start) =>
          updateProject(moveClip(projectRef.current, clipId, trackId, start), { history: false })
        }
        onTrim={(clipId, edge, delta) =>
          updateProject(trimClip(projectRef.current, clipId, edge, delta), { history: false })
        }
        onDropAsset={onDropAsset}
        onGestureStart={() => dispatch({ type: 'checkpoint' })}
        onGestureEnd={() => dispatch({ type: 'commitCheckpoint' })}
        onRemove={deleteSelected}
        pxPerSec={pxPerSec}
        onZoom={onZoom}
        onZoomSet={onZoomSet}
        playheadRef={playheadRef}
        snap={settings.snap}
      />

      {view === 'feed' && <Feed onRemix={remixScene} onNote={showToast} published={feed} />}

      {publishOpen && (
        <PublishDialog
          project={project}
          poster={poster}
          audio={audioAtPlayhead()}
          onClose={() => setPublishOpen(false)}
          onPublish={publishCut}
        />
      )}

      {exportOpen && <ExportDialog project={project} onClose={() => setExportOpen(false)} onToast={showToast} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
