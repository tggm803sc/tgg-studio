import { getAsset, assetLabel } from '../assets'
import { ASPECTS, formatTime } from '../editor'
import { FILTERS } from '../render'
import { SplitIcon, TrashIcon, CopyIcon, EyeIcon, MuteIcon, VolumeIcon } from './Icons'

function Row({ label, children }) {
  return (
    <div className="ins-row">
      <span className="ins-label">{label}</span>
      <div className="ins-control">{children}</div>
    </div>
  )
}

function AspectPicker({ project, onAspect }) {
  return (
    <div className="aspect-row">
      {ASPECTS.map((a) => (
        <button
          key={a.id}
          className={`aspect-chip ${project.aspect === a.id ? 'on' : ''}`}
          onClick={() => onAspect(a.id)}
        >
          <span className={`aspect-shape ${a.id.replace(':', '-')}`} />
          {a.label}
        </button>
      ))}
    </div>
  )
}

function FpsSelect({ project, onProjectChange }) {
  return (
    <select
      className="select"
      value={project.fps}
      onChange={(e) => onProjectChange({ fps: Number(e.target.value) })}
    >
      <option value={24}>24 fps</option>
      <option value={30}>30 fps</option>
      <option value={60}>60 fps</option>
    </select>
  )
}

export default function Inspector({ project, clip, track, onProjectChange, onAspect, onChange, onSplit, onDuplicate, onDelete, onSeek }) {
  const asset = clip ? getAsset(clip.assetId) : null

  return (
    <aside className="panel inspector">
      <div className="panel-head">
        <h2>{clip ? 'Clip' : 'Project'}</h2>
        {clip && <span className="ins-kind">{asset ? asset.kind : 'missing'}</span>}
      </div>

      {!clip && (
        <div className="ins-body">
          <Row label="Name">
            <input
              className="text-input"
              value={project.name}
              onChange={(e) => onProjectChange({ name: e.target.value })}
              maxLength={48}
            />
          </Row>
          <Row label="Aspect">
            <AspectPicker project={project} onAspect={onAspect} />
          </Row>
          <Row label="Output">
            <span className="ins-value">
              {project.width} × {project.height}
            </span>
          </Row>
          <Row label="FPS">
            <FpsSelect project={project} onProjectChange={onProjectChange} />
          </Row>
          <div className="ins-note">
            <p>Select a clip to edit it. Drag from the bin to place media; drag clip edges to trim.</p>
          </div>
          <div className="ins-actions">
            <button className="ghost-btn wide" onClick={() => onSeek(0)}>
              Back to start
            </button>
          </div>
        </div>
      )}

      {clip && (
        <div className="ins-body">
          <div className="ins-clip-head">
            <span className="ins-clip-name">{assetLabel(clip)}</span>
            <em>{track ? track.name : ''}</em>
          </div>

          <Row label="Start">
            <input
              className="num-input"
              type="number"
              step="0.1"
              min="0"
              value={Number(clip.start.toFixed(2))}
              onChange={(e) => onChange({ start: Math.max(0, Number(e.target.value)) })}
            />
            <span className="unit">s</span>
          </Row>
          <Row label="Duration">
            <input
              className="num-input"
              type="number"
              step="0.1"
              min="0.2"
              value={Number(clip.duration.toFixed(2))}
              onChange={(e) => onChange({ duration: Math.max(0.2, Number(e.target.value)) })}
            />
            <span className="unit">s</span>
          </Row>
          <Row label="Ends">
            <span className="ins-value">{formatTime(clip.start + clip.duration)}</span>
          </Row>

          {clip.variant && (
            <>
              <Row label="Text">
                <input
                  className="text-input"
                  value={clip.text || ''}
                  maxLength={42}
                  onChange={(e) => onChange({ text: e.target.value })}
                  placeholder="TITLE"
                />
              </Row>
              <Row label="Sub line">
                <input
                  className="text-input"
                  value={clip.subtitle || ''}
                  maxLength={48}
                  onChange={(e) => onChange({ subtitle: e.target.value })}
                  placeholder="optional"
                />
              </Row>
              <Row label="Style">
                <select
                  className="select"
                  value={clip.variant}
                  onChange={(e) => onChange({ variant: e.target.value })}
                >
                  <option value="center">Centre</option>
                  <option value="lower">Lower third</option>
                </select>
              </Row>
            </>
          )}

          {track && track.type === 'video' && (
            <>
              <Row label="Look">
                <select
                  className="select"
                  value={clip.filter || 'none'}
                  onChange={(e) => onChange({ filter: e.target.value })}
                >
                  {Object.entries(FILTERS).map(([id, f]) => (
                    <option key={id} value={id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label="Opacity">
                <input
                  className="range"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={clip.opacity == null ? 1 : clip.opacity}
                  onChange={(e) => onChange({ opacity: Number(e.target.value) })}
                />
                <span className="unit">{Math.round((clip.opacity == null ? 1 : clip.opacity) * 100)}%</span>
              </Row>
              <Row label="Fades">
                <button
                  className={`toggle ${clip.fadeIn ? 'on' : ''}`}
                  onClick={() => onChange({ fadeIn: !clip.fadeIn })}
                >
                  In
                </button>
                <button
                  className={`toggle ${clip.fadeOut ? 'on' : ''}`}
                  onClick={() => onChange({ fadeOut: !clip.fadeOut })}
                >
                  Out
                </button>
              </Row>
              <Row label="Visible">
                <button
                  className={`toggle ${clip.visible === false ? '' : 'on'}`}
                  onClick={() => onChange({ visible: clip.visible === false })}
                >
                  <EyeIcon size={13} /> {clip.visible === false ? 'Hidden' : 'Shown'}
                </button>
              </Row>
            </>
          )}

          {track && track.type === 'audio' && (
            <>
              <Row label="Volume">
                <input
                  className="range"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={clip.volume == null ? 0.8 : clip.volume}
                  onChange={(e) => onChange({ volume: Number(e.target.value) })}
                />
                <span className="unit">{Math.round((clip.volume == null ? 0.8 : clip.volume) * 100)}%</span>
              </Row>
              <Row label="Muted">
                <button
                  className={`toggle ${clip.muted ? 'on' : ''}`}
                  onClick={() => onChange({ muted: !clip.muted })}
                >
                  {clip.muted ? <MuteIcon size={13} /> : <VolumeIcon size={13} />}
                  {clip.muted ? 'Muted' : 'Audible'}
                </button>
              </Row>
            </>
          )}

          <div className="ins-divider" />
          <p className="ins-subhead">Output</p>
          <Row label="Aspect">
            <AspectPicker project={project} onAspect={onAspect} />
          </Row>
          <Row label="FPS">
            <FpsSelect project={project} onProjectChange={onProjectChange} />
          </Row>

          <div className="ins-actions">
            <button className="ghost-btn" onClick={onSplit} title="Split at playhead (S)">
              <SplitIcon size={13} /> Split
            </button>
            <button className="ghost-btn" onClick={onDuplicate} title="Duplicate (D)">
              <CopyIcon size={13} /> Dup
            </button>
            <button className="ghost-btn danger" onClick={onDelete} title="Delete (Del)">
              <TrashIcon size={13} /> Delete
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
