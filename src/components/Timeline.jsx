import { useCallback, useEffect, useMemo, useRef } from 'react'
import { projectDuration, formatTime, snapTime as snapTo } from '../editor'
import { getAsset, assetLabel } from '../assets'
import { drawAsset } from '../assets'
import { LockIcon } from './Icons'

const ROW_VIDEO = 58
const ROW_AUDIO = 46

const rowHeight = (track) => (track.type === 'audio' ? ROW_AUDIO : ROW_VIDEO)

const TICK_STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120]

function ClipThumb({ clip, trackType }) {
  const ref = useRef(null)
  const asset = getAsset(clip.assetId)

  useEffect(() => {
    if (trackType === 'audio' || asset?.kind === 'title') return
    const canvas = ref.current
    if (!canvas || !asset) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = 132
    const h = 74
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const paint = () => drawAsset(ctx, asset, (clip.inPoint || 0) + 0.6, w, h, clip)
    paint()

    // an imported video has no decodable frame yet on the first pass
    const el = asset.el
    if (asset.kind === 'video' && el && el.readyState < 2) {
      el.addEventListener('loadeddata', paint)
      el.addEventListener('seeked', paint)
      return () => {
        el.removeEventListener('loadeddata', paint)
        el.removeEventListener('seeked', paint)
      }
    }
    return undefined
  }, [asset, clip, trackType])

  if (asset?.kind === 'title') {
    return (
      <div className="clip-title-chip" aria-hidden="true">
        <span>T</span>
      </div>
    )
  }

  if (trackType === 'audio') {
    const seed = [...clip.assetId].reduce((a, c) => a + c.codePointAt(0), 0)
    return (
      <div className="wave" aria-hidden="true">
        {Array.from({ length: 40 }).map((_, i) => {
          const v = 0.25 + Math.abs(Math.sin(seed * 0.11 + i * 0.7)) * 0.75
          return <i key={i} style={{ height: `${Math.round(v * 100)}%` }} />
        })}
      </div>
    )
  }
  return <canvas ref={ref} className="clip-thumb" aria-hidden="true" />
}

export default function Timeline({
  project,
  time,
  selectedId,
  onSelect,
  onSeek,
  onMoveClip,
  onTrim,
  onDropAsset,
  onGestureStart,
  onGestureEnd,
  onRemove,
  pxPerSec,
  onZoom,
  onZoomSet,
  playheadRef,
  snap,
}) {
  const scrollRef = useRef(null)
  const innerRef = useRef(null)
  const dragRef = useRef(null)
  const zoomAnchor = useRef(null)
  const duration = projectDuration(project)
  const canvasSpan = Math.max(duration + 2, 18)
  const width = canvasSpan * pxPerSec

  const tickStep = useMemo(() => TICK_STEPS.find((s) => s * pxPerSec >= 56) || 120, [pxPerSec])
  const ticks = useMemo(() => {
    const out = []
    for (let t = 0; t <= canvasSpan; t += tickStep) out.push(Number(t.toFixed(2)))
    return out
  }, [canvasSpan, tickStep])

  const timeAt = useCallback(
    (clientX) => {
      const rect = innerRef.current?.getBoundingClientRect()
      if (!rect) return 0
      return Math.max(0, (clientX - rect.left) / pxPerSec)
    },
    [pxPerSec],
  )

  // Ctrl/Cmd + wheel zooms around the pointer; a plain wheel scrolls the cut.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        const rect = el.getBoundingClientRect()
        zoomAnchor.current = {
          time: Math.max(0, (event.clientX - rect.left + el.scrollLeft) / pxPerSec),
          offset: event.clientX - rect.left,
        }
        onZoom(event.deltaY < 0 ? 1 : -1)
        return
      }
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        el.scrollLeft += event.deltaY
        event.preventDefault()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoom, pxPerSec])

  // after a zoom step, keep the time under the pointer where it was
  useEffect(() => {
    const anchor = zoomAnchor.current
    const el = scrollRef.current
    if (!anchor || !el) return
    zoomAnchor.current = null
    el.scrollLeft = Math.max(0, anchor.time * pxPerSec - anchor.offset)
  }, [pxPerSec])

  const fitToCut = useCallback(() => {
    const el = scrollRef.current
    if (!el || !onZoomSet) return
    onZoomSet(Math.max(6, Math.min(400, el.clientWidth / Math.max(canvasSpan, 1))))
  }, [canvasSpan, onZoomSet])

  const snapped = useCallback(
    (value, clipId) => (snap ? snapTo(value, project, clipId, time) : Math.max(0, value)),
    [snap, project, time],
  )

  const beginMove = (e, clip, track) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(clip.id)
    onGestureStart()
    const startX = e.clientX
    const origin = clip.start
    let currentTrack = track.id
    let moved = false
    dragRef.current = { mode: 'move' }

    const move = (ev) => {
      const dx = ev.clientX - startX
      if (!moved && Math.abs(dx) < 3) return
      moved = true
      const row = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-track-id]')
      if (row) {
        const targetTrack = project.tracks.find((t) => t.id === row.dataset.trackId)
        if (targetTrack && targetTrack.type === track.type) currentTrack = targetTrack.id
      }
      onMoveClip(clip.id, currentTrack, snapped(Math.max(0, origin + dx / pxPerSec), clip.id))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      dragRef.current = null
      onGestureEnd()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const beginTrim = (e, clip, edge) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    onSelect(clip.id)
    onGestureStart()
    let lastX = e.clientX

    const move = (ev) => {
      const delta = (ev.clientX - lastX) / pxPerSec
      if (!delta) return
      lastX = ev.clientX
      onTrim(clip.id, edge, delta)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onGestureEnd()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startRuler = (e) => {
    if (e.button !== 0) return
    onSeek(timeAt(e.clientX))
    const move = (ev) => onSeek(timeAt(ev.clientX))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const handleDrop = (e, track) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('application/x-tgg-asset')
    if (!assetId) return
    const asset = getAsset(assetId)
    if (!asset) return
    const isMusic = asset.kind === 'music'
    if (isMusic !== (track.type === 'audio')) return
    onDropAsset(assetId, track.id, Math.max(0, timeAt(e.clientX)))
  }

  return (
    <section className="timeline">
      <div className="tl-bar">
        <span className="tl-title">Timeline</span>
        <span className="tl-meta">
          {project.tracks.reduce((n, t) => n + t.clips.length, 0)} clips · {formatTime(duration)}
        </span>
        <div className="tl-zoom">
          <span className="zoom-hint">Ctrl + scroll</span>
          <button className="mini-btn" onClick={() => onZoom(-1)} aria-label="Zoom out" title="Zoom out (−)">
            −
          </button>
          <span className="zoom-val">{Math.round(pxPerSec)} px/s</span>
          <button className="mini-btn" onClick={() => onZoom(1)} aria-label="Zoom in" title="Zoom in (+)">
            +
          </button>
          <button className="mini-btn fit" onClick={fitToCut} title="Fit the whole cut in view">
            Fit
          </button>
        </div>
      </div>

      <div className="tl-main">
        <div className="tl-gutter">
          <div className="tl-gutter-head" />
          {project.tracks.map((track) => (
            <div key={track.id} className={`tl-label ${track.type}`} style={{ height: rowHeight(track) }}>
              <span>{track.name}</span>
              <em>{track.type === 'audio' ? 'audio' : 'video'}</em>
            </div>
          ))}
        </div>

        <div className="tl-scroll" ref={scrollRef}>
          <div className="tl-inner" ref={innerRef} style={{ width }}>
            <div className="ruler" onPointerDown={startRuler}>
              {ticks.map((t) => (
                <span className="tick" key={t} style={{ left: t * pxPerSec }}>
                  <i />
                  <b>{formatTime(t)}</b>
                </span>
              ))}
            </div>

            {project.tracks.map((track) => (
              <div
                key={track.id}
                className={`tl-row ${track.type}`}
                data-track-id={track.id}
                style={{ height: rowHeight(track) }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    onSelect(null)
                    onSeek(timeAt(e.clientX))
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'copy'
                }}
                onDrop={(e) => handleDrop(e, track)}
              >
                {track.clips.map((clip) => {
                  const asset = getAsset(clip.assetId)
                  const selected = clip.id === selectedId
                  return (
                    <div
                      key={clip.id}
                      className={`clip ${selected ? 'sel' : ''} ${track.type}`}
                      style={{
                        left: clip.start * pxPerSec,
                        width: Math.max(22, clip.duration * pxPerSec),
                      }}
                      onPointerDown={(e) => beginMove(e, clip, track)}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        onSeek(clip.start)
                      }}
                      title={`${assetLabel(clip)} · ${clip.duration.toFixed(2)}s`}
                    >
                      <ClipThumb clip={clip} trackType={track.type} />
                      <span className="clip-shade" />
                      <span className="clip-name">{assetLabel(clip)}</span>
                      <span className="clip-len">{formatTime(clip.duration)}</span>
                      {clip.filter && clip.filter !== 'none' && <span className="clip-flag">fx</span>}
                      {!asset && <span className="clip-flag warn">!</span>}
                      <button
                        className="trim left"
                        onPointerDown={(e) => beginTrim(e, clip, 'left')}
                        aria-label="Trim clip start"
                      />
                      <button
                        className="trim right"
                        onPointerDown={(e) => beginTrim(e, clip, 'right')}
                        aria-label="Trim clip end"
                      />
                    </div>
                  )
                })}
              </div>
            ))}

            <div className="playhead" ref={playheadRef} aria-hidden="true">
              <span className="playhead-cap" />
            </div>
          </div>
        </div>
      </div>

      <div className="tl-foot">
        <LockIcon size={11} />
        <span>Drag clips to move · drag edges to trim · double-click to jump to the clip · Del removes</span>
      </div>
    </section>
  )
}
