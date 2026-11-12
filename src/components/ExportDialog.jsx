import { useEffect, useRef, useState } from 'react'
import { projectDuration, formatTime } from '../editor'
import { exportProject, downloadBlob, safeFilename, canExport, pickMimeType } from '../export'
import { CloseIcon, DownloadIcon, FilmIcon, PlayIcon } from './Icons'

const QUALITY = {
  draft: { label: 'Draft', bitrate: 2_500_000 },
  standard: { label: 'Standard', bitrate: 5_000_000 },
  high: { label: 'High', bitrate: 9_000_000 },
}

export default function ExportDialog({ project, onClose, onToast }) {
  const [fps, setFps] = useState(project.fps || 30)
  const [quality, setQuality] = useState('high')
  const [withAudio, setWithAudio] = useState(true)
  const [state, setState] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const cancelled = useRef(false)
  const urlRef = useRef(null)

  const duration = projectDuration(project)
  const mime = pickMimeType()
  const supported = canExport() && !!mime

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && state !== 'rendering') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, state])

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  const start = async () => {
    cancelled.current = false
    setState('rendering')
    setProgress(0)
    setError('')
    try {
      const res = await exportProject(project, {
        fps,
        audio: withAudio,
        bitrate: QUALITY[quality].bitrate,
        onProgress: setProgress,
        isCancelled: () => cancelled.current,
      })
      if (cancelled.current) {
        setState('idle')
        setProgress(0)
        return
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = URL.createObjectURL(res.blob)
      setResult({ ...res, url: urlRef.current })
      setState('done')
    } catch (err) {
      setError(err.message || 'Export failed')
      setState('error')
    }
  }

  const estimatedMb = ((QUALITY[quality].bitrate / 8) * duration) / 1_000_000

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Export video">
      <button className="modal-backdrop" onClick={() => state !== 'rendering' && onClose()} aria-label="Close export" />
      <div className="modal">
        <header className="modal-head">
          <h2>
            <FilmIcon size={16} /> Export cut
          </h2>
          <button className="icon-btn" onClick={onClose} disabled={state === 'rendering'} aria-label="Close">
            <CloseIcon />
          </button>
        </header>

        {state === 'idle' && (
          <div className="modal-body">
            <p className="modal-lead">
              Renders the timeline to a video file, with the synthesized soundtrack mixed in. Capture runs in real
              time, so a {formatTime(duration)} cut takes about {formatTime(duration)} to record.
            </p>

            {!supported && (
              <p className="modal-warn">
                This browser cannot record canvas video (MediaRecorder unavailable). Try Chrome, Edge or Firefox on
                desktop.
              </p>
            )}

            <div className="modal-grid">
              <label className="modal-field">
                <span>Resolution</span>
                <strong>
                  {project.width} × {project.height}
                </strong>
              </label>
              <label className="modal-field">
                <span>Frame rate</span>
                <select className="select" value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                  <option value={24}>24 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={60}>60 fps (slower)</option>
                </select>
              </label>
              <label className="modal-field">
                <span>Quality</span>
                <select className="select" value={quality} onChange={(e) => setQuality(e.target.value)}>
                  {Object.entries(QUALITY).map(([id, q]) => (
                    <option key={id} value={id}>
                      {q.label} · {Math.round(q.bitrate / 1_000_000)} Mbps
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal-field">
                <span>Audio</span>
                <button
                  className={`toggle wide ${withAudio ? 'on' : ''}`}
                  onClick={() => setWithAudio((v) => !v)}
                >
                  {withAudio ? 'Include soundtrack' : 'Silent video'}
                </button>
              </label>
            </div>

            <div className="modal-meta">
              <span>Container: {mime || 'unsupported'}</span>
              <span>≈ {estimatedMb.toFixed(1)} MB</span>
              <span>{formatTime(duration, true, fps)} long</span>
            </div>

            {error && <p className="modal-warn">{error}</p>}

            <button className="primary-btn wide" onClick={start} disabled={!supported}>
              Start export
            </button>
          </div>
        )}

        {state === 'rendering' && (
          <div className="modal-body">
            <p className="modal-lead">Recording frames and audio in real time. Keep this tab in the foreground.</p>
            <div className="progress-track">
              <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="modal-meta">
              <span>{Math.round(progress * 100)}%</span>
              <span>
                {formatTime(progress * duration)} / {formatTime(duration)}
              </span>
            </div>
            <button
              className="ghost-btn wide"
              onClick={() => {
                cancelled.current = true
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {state === 'done' && result && (
          <div className="modal-body">
            <p className="modal-lead">
              {formatTime(result.duration)} · {(result.size / 1_000_000).toFixed(1)} MB · {result.mimeType}
            </p>
            <video className="export-preview" src={result.url} controls loop playsInline />
            {result.audioRequested && !result.audioIncluded && (
              <p className="modal-warn">
                The soundtrack was skipped: the browser kept audio suspended while recording. Click anywhere on the
                page, then export again to capture sound.
              </p>
            )}
            <p className="modal-note">
              Browser-recorded WebM carries no duration header, so some players will only play it start to finish
              rather than letting you scrub.
            </p>
            <div className="modal-actions">
              <button
                className="primary-btn"
                onClick={() => {
                  downloadBlob(result.blob, safeFilename(project.name))
                  onToast('Download started')
                }}
              >
                <DownloadIcon size={15} /> Download
              </button>
              <button className="ghost-btn" onClick={() => setState('idle')}>
                Export again
              </button>
              <button className="ghost-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="modal-body">
            <p className="modal-warn">{error}</p>
            <div className="modal-actions">
              <button className="primary-btn" onClick={start}>
                Try again
              </button>
              <button className="ghost-btn" onClick={() => setState('idle')}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
