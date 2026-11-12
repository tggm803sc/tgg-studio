import { useCallback, useEffect, useRef, useState } from 'react'
import { drawProjectFrame } from '../render'
import { formatTime } from '../editor'
import { PauseIcon, PlayIcon, StepBackIcon, StepForwardIcon, GridIcon } from './Icons'

export default function Preview({
  project,
  time,
  playing,
  duration,
  onTogglePlay,
  onSeek,
  onStep,
  registerDraw,
  hasClips,
  stageRef,
}) {
  const canvasRef = useRef(null)
  const scrubRef = useRef(null)
  const shellRef = useRef(null)
  const [guides, setGuides] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setBox({ w: rect.width, h: rect.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const drawAt = useCallback(
    (t) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      drawProjectFrame(ctx, project, Math.max(0, t), canvas.width, canvas.height)
    },
    [project],
  )

  // keep the backing store in step with the project's output size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const scale = Math.min(1, 1280 / Math.max(project.width, 1))
    canvas.width = Math.round(project.width * scale)
    canvas.height = Math.round(project.height * scale)
    drawAt(time)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.width, project.height, project.aspect])

  useEffect(() => {
    registerDraw(drawAt)
    return () => registerDraw(null)
  }, [drawAt, registerDraw])

  useEffect(() => {
    if (!playing) drawAt(time)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, playing, drawAt])

  const positionFromEvent = (e) => {
    const rect = scrubRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    return ratio * Math.max(duration, 0.1)
  }

  const startScrub = (e) => {
    setScrubbing(true)
    onSeek(positionFromEvent(e))
    const move = (ev) => onSeek(positionFromEvent(ev))
    const up = () => {
      setScrubbing(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const pct = duration > 0 ? Math.min(1, time / duration) : 0

  // fit the output aspect inside the available stage box
  const ar = (project.width || 16) / (project.height || 9)
  const availW = Math.max(160, box.w)
  const availH = Math.max(120, box.h)
  let frameW = availW
  let frameH = frameW / ar
  if (frameH > availH) {
    frameH = availH
    frameW = frameH * ar
  }

  return (
    <div className="stage-area">
      <div className="preview-shell" ref={shellRef}>
        <div
          className={`preview-frame aspect-${project.aspect.replace(':', '-')}`}
        style={{ width: `${Math.round(frameW)}px`, height: `${Math.round(frameH)}px` }}
      >
        <canvas
          ref={(el) => {
            canvasRef.current = el
            if (stageRef) stageRef.current = el
          }}
          className="preview-canvas"
        />
        {guides && <div className="safe-guides" aria-hidden="true" />}
        {!hasClips && (
          <div className="preview-empty">
            <p>Empty timeline</p>
            <span>Drag a scene from the bin onto the timeline to start the cut.</span>
          </div>
        )}
        <div className="preview-badges">
          <span>{project.aspect}</span>
          <span>{project.fps} fps</span>
          <span>{formatTime(duration)}</span>
        </div>
        <button className="guides-btn" onClick={() => setGuides((g) => !g)} aria-pressed={guides}>
          <GridIcon size={14} /> Guides
        </button>
        <button className="preview-play" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
        </button>
      </div>

      </div>

      <div className="transport">
        <button className="t-btn" onClick={() => onStep(-1)} aria-label="Previous frame">
          <StepBackIcon />
        </button>
        <button className="t-btn play" onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <PauseIcon size={17} /> : <PlayIcon size={17} />}
        </button>
        <button className="t-btn" onClick={() => onStep(1)} aria-label="Next frame">
          <StepForwardIcon />
        </button>
        <div className="scrub" ref={scrubRef} onPointerDown={startScrub} role="slider" aria-label="Playhead" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={time} tabIndex={0}>
          <div className="scrub-track">
            <div className="scrub-fill" style={{ width: `${pct * 100}%` }} />
            <div className="scrub-knob" style={{ left: `${pct * 100}%` }} />
          </div>
        </div>
        <div className="transport-time">
          <strong>{formatTime(time, true, project.fps)}</strong>
          <em>/ {formatTime(duration, true, project.fps)}</em>
        </div>
      </div>
      {scrubbing && <span className="sr-only">Scrubbing</span>}
    </div>
  )
}
