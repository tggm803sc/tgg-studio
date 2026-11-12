import { useEffect, useState } from 'react'
import { projectDuration, formatTime } from '../editor'
import { CloseIcon, ShareIcon } from './Icons'

/**
 * Publish the cut straight into the feed. The poster is the exact frame under
 * the playhead, so the feed shows your footage instead of a stock reel.
 */
export default function PublishDialog({ project, poster, audio, onClose, onPublish }) {
  const [title, setTitle] = useState(project.name || 'Untitled cut')
  const [handle, setHandle] = useState('@you')
  const [caption, setCaption] = useState('')
  const duration = projectDuration(project)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-layer">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close publish dialog" />
      <div className="modal" role="dialog" aria-modal="true" aria-label="Publish cut">
        <div className="modal-head">
          <h2>
            <ShareIcon size={15} /> Publish to feed
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={15} />
          </button>
        </div>

        <div className="modal-body publish-body">
          <div className="publish-row">
            <figure className="publish-preview">
              {poster ? <img src={poster} alt="Frame that will head the reel" /> : <span>No frame</span>}
            </figure>
            <div className="publish-fields">
              <label className="modal-field">
                <span>Reel title</span>
                <input
                  className="field-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={48}
                  placeholder="Name this cut"
                />
              </label>
              <label className="modal-field">
                <span>Creator</span>
                <input
                  className="field-input"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  maxLength={24}
                  placeholder="@you"
                />
              </label>
              <label className="modal-field">
                <span>Caption</span>
                <textarea
                  className="field-input field-area"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={180}
                  rows={3}
                  placeholder="Say something about this cut"
                />
              </label>
            </div>
          </div>

          <div className="modal-meta">
            <span>{formatTime(duration, true, project.fps)} long</span>
            <span>{project.aspect} · {project.fps}fps</span>
            <span>Audio: {audio || 'original audio'}</span>
          </div>

          <p className="modal-note">
            The poster is the frame sitting under the playhead right now — scrub to the shot you want first. Published
            cuts stay on this device, at the top of the Feed tab.
          </p>

          <button
            className="primary-btn wide"
            disabled={!title.trim()}
            onClick={() => onPublish({ title: title.trim(), handle: handle.trim() || '@you', caption: caption.trim() })}
          >
            Publish to feed
          </button>
        </div>
      </div>
    </div>
  )
}
