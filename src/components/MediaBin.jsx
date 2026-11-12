import { useEffect, useRef, useState } from 'react'
import { formatTime } from '../editor'
import { sceneAssets, titleAssets, musicAssets, mediaAssets, addMediaAsset, removeMediaAsset } from '../assets'
import { PlusIcon, TrashIcon, UploadIcon } from './Icons'

const TABS = [
  { id: 'scenes', label: 'Scenes' },
  { id: 'titles', label: 'Titles' },
  { id: 'audio', label: 'Audio' },
  { id: 'media', label: 'Media' },
]

function readMediaFile(file) {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video')
    const url = URL.createObjectURL(file)
    if (isVideo) {
      const video = document.createElement('video')
      video.src = url
      video.muted = true
      video.playsInline = true
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2)
      }
      video.onseeked = () => {
        resolve({
          kind: 'video',
          name: file.name.replace(/\.[^.]+$/, ''),
          el: video,
          url,
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
        })
      }
      video.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error(`Could not read ${file.name}`))
      }
      return
    }
    if (file.type.startsWith('image')) {
      const img = new Image()
      img.src = url
      img.onload = () =>
        resolve({
          kind: 'image',
          name: file.name.replace(/\.[^.]+$/, ''),
          el: img,
          url,
          width: img.naturalWidth,
          height: img.naturalHeight,
          duration: 6,
        })
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error(`Could not read ${file.name}`))
      }
      return
    }
    URL.revokeObjectURL(url)
    reject(new Error(`${file.name} is not an image or video`))
  })
}

// Imported stills and videos get a real thumbnail: you should see the frame you
// brought in, not a colour chip.
function BinThumb({ asset }) {
  const ref = useRef(null)
  const imported = asset.kind === 'image' || asset.kind === 'video'

  useEffect(() => {
    if (!imported) return
    const canvas = ref.current
    const el = asset.el
    if (!canvas || !el) return
    const ctx = canvas.getContext('2d')
    canvas.width = 84
    canvas.height = 56

    const paint = () => {
      const iw = el.videoWidth || el.naturalWidth || 16
      const ih = el.videoHeight || el.naturalHeight || 9
      const scale = Math.max(canvas.width / iw, canvas.height / ih)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      try {
        ctx.drawImage(el, (canvas.width - iw * scale) / 2, (canvas.height - ih * scale) / 2, iw * scale, ih * scale)
      } catch {
        /* not decodable yet */
      }
    }

    paint()
    if (asset.kind === 'video' && el.readyState < 2) {
      el.addEventListener('loadeddata', paint)
      el.addEventListener('seeked', paint)
      return () => {
        el.removeEventListener('loadeddata', paint)
        el.removeEventListener('seeked', paint)
      }
    }
    return undefined
  }, [asset, imported])

  if (imported) {
    return (
      <span className={`bin-thumb-wrap ${asset.kind}`}>
        <canvas ref={ref} className="bin-thumb" aria-hidden="true" />
        <span className="bin-kind">{asset.kind === 'video' ? '▶' : '▣'}</span>
      </span>
    )
  }

  return (
    <span
      className={`bin-swatch ${asset.kind}`}
      style={{ background: `linear-gradient(135deg, ${asset.swatch.join(', ')})` }}
    >
      {asset.kind === 'title' ? 'T' : asset.kind === 'music' ? '♪' : ''}
    </span>
  )
}

export default function MediaBin({ onAdd, onImported, mediaVersion, onToast, activeTrackType }) {
  const [tab, setTab] = useState('scenes')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  void mediaVersion

  const lists = {
    scenes: sceneAssets(),
    titles: titleAssets(),
    audio: musicAssets(),
    media: mediaAssets(),
  }

  const ingest = async (files) => {
    const usable = Array.from(files || []).filter(
      (f) => f.type.startsWith('video') || f.type.startsWith('image'),
    )
    if (!usable.length) {
      onToast('Drop an image or video file')
      return
    }
    setBusy(true)
    const added = []
    for (const file of usable) {
      try {
        const meta = await readMediaFile(file)
        added.push(addMediaAsset(meta))
      } catch (err) {
        onToast(err.message)
      }
    }
    setBusy(false)
    if (added.length) {
      onImported()
      setTab('media')
      onToast(`${added.length} clip${added.length > 1 ? 's' : ''} imported`)
    }
  }

  const remove = (assetId) => {
    removeMediaAsset(assetId)
    onImported()
    onToast('Removed from bin')
  }

  const items = lists[tab]

  return (
    <aside
      className={`panel bin ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return
        e.preventDefault()
        setDragOver(false)
        ingest(e.dataTransfer.files)
      }}
    >
      <div className="panel-head">
        <h2>Media bin</h2>
        <button className="mini-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          <UploadIcon size={13} /> {busy ? 'Reading…' : 'Import'}
        </button>
      </div>

      <div className="bin-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'media' && lists.media.length > 0 && <span>{lists.media.length}</span>}
          </button>
        ))}
      </div>

      <div className="bin-list">
        {items.map((asset) => {
          const dragOk = activeTrackType === 'audio' ? asset.kind === 'music' : asset.kind !== 'music'
          return (
            <div
              key={asset.id}
              className={`bin-item ${dragOk ? '' : 'dim'}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-tgg-asset', asset.id)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onDoubleClick={() => onAdd(asset.id)}
              title="Drag to the timeline, or double-click to append"
            >
              <BinThumb asset={asset} />
              <span className="bin-copy">
                <strong>{asset.name}</strong>
                <em>
                  {asset.kind === 'music' ? `${asset.bpm} BPM` : formatTime(asset.duration)}
                  {asset.kind === 'video' ? ' · video' : asset.kind === 'image' ? ' · image' : ''}
                </em>
              </span>
              <button className="bin-add" onClick={() => onAdd(asset.id)} aria-label={`Add ${asset.name}`}>
                <PlusIcon size={13} />
              </button>
              {asset.kind === 'image' || asset.kind === 'video' ? (
                <button className="bin-del" onClick={() => remove(asset.id)} aria-label={`Remove ${asset.name}`}>
                  <TrashIcon size={12} />
                </button>
              ) : null}
            </div>
          )
        })}

        {tab === 'media' && items.length === 0 && (
          <div className="bin-empty">
            <p>Drop your own clips here</p>
            <button className="mini-btn" onClick={() => inputRef.current?.click()}>
              Choose files
            </button>
            <span>Images and video stay local to this tab.</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        hidden
        onChange={(e) => {
          ingest(e.target.files)
          e.target.value = ''
        }}
      />
    </aside>
  )
}
