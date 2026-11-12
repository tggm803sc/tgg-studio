import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SCENE_ASSETS } from '../assets'
import { drawScene } from '../visuals'

// The published side of TGG Studio: a vertical reel feed rendered from the same
// procedural scenes the editor cuts with, so no files or network are needed.

const META = {
  salt: {
    handle: '@tgg.saltflats',
    place: 'Salt Flats, UT',
    caption: 'Dawn run across the flats. One take, no stabiliser, no second unit.',
    audio: 'V8 Idle',
    tags: ['#saltflats', '#goldenhour'],
    likes: 18400,
    comments: [
      { user: '@neon.driver', text: 'That horizon line at 0:04 is unreal.' },
      { user: '@cutroom', text: 'What LUT is this? The yellows are holding.' },
    ],
  },
  city: {
    handle: '@tgg.downtown',
    place: 'Downtown',
    caption: 'Rooftop to street level in ninety seconds. Handheld on purpose.',
    audio: 'Midnight Freight',
    tags: ['#downtown', '#nightshoot'],
    likes: 31200,
    comments: [
      { user: '@frame.24', text: 'The parallax on those windows 👀' },
      { user: '@audio.room', text: 'That 808 sits perfectly under the traffic.' },
    ],
  },
  studio: {
    handle: '@studio.808',
    place: 'Studio 808',
    caption: 'Session at 3am. Console lights doing most of the work.',
    audio: 'Studio 808',
    tags: ['#studio808', '#session'],
    likes: 45700,
    comments: [
      { user: '@tape.deck', text: 'Those faders are moving themselves again.' },
      { user: '@mixdown', text: 'Print it to tape before it disappears.' },
    ],
  },
  stage: {
    handle: '@neon.room',
    place: 'Neon Room',
    caption: 'Soundcheck haze. Cut this the same night it was shot.',
    audio: 'Neon Room',
    tags: ['#neonroom', '#soundcheck'],
    likes: 22900,
    comments: [
      { user: '@lights.up', text: 'The magenta wash is doing a lot.' },
      { user: '@frontrow', text: 'Best room in the city, no debate.' },
    ],
  },
  tape: {
    handle: '@the.vault',
    place: 'The Vault',
    caption: 'Reels from 1996 that still pass alignment. Barely.',
    audio: 'Tape Hiss',
    tags: ['#thevault', '#reeltoreel'],
    likes: 9800,
    comments: [
      { user: '@archive.kid', text: 'Please digitise all of it.' },
      { user: '@hissclub', text: 'The wow and flutter is the charm.' },
    ],
  },
  aurora: {
    handle: '@tgg.north',
    place: 'Aurora',
    caption: 'Two hours of waiting for eleven seconds of sky.',
    audio: 'Skyline Score',
    tags: ['#aurora', '#longexposure'],
    likes: 58300,
    comments: [
      { user: '@nightwatch', text: 'Eleven seconds well spent.' },
      { user: '@colorgrade', text: 'The greens are so clean, no banding.' },
    ],
  },
  grid: {
    handle: '@synth.grid',
    place: 'Synth Grid',
    caption: 'Wireframe test loop. This is what the render looks like raw.',
    audio: 'Neon Room',
    tags: ['#synthgrid', '#testloop'],
    likes: 14100,
    comments: [
      { user: '@vector.boi', text: 'Raw is the finished look here.' },
      { user: '@render.farm', text: 'How many passes for the bloom?' },
    ],
  },
  rain: {
    handle: '@tgg.rainroom',
    place: 'Rain Window',
    caption: 'Day four of rain. Stuck the camera to the glass and waited.',
    audio: 'Tape Hiss',
    tags: ['#rain', '#slowcinema'],
    likes: 7600,
    comments: [
      { user: '@quiet.cut', text: 'This is a whole mood.' },
      { user: '@sound.design', text: 'Record the rain, keep it under the music.' },
    ],
  },
  freight: {
    handle: '@cargo.hall',
    place: 'Cargo Hall',
    caption: 'Night shift load-out. Cargo run starts in twenty.',
    audio: 'Midnight Freight',
    tags: ['#cargohall', '#nightshift'],
    likes: 26500,
    comments: [
      { user: '@dock.hand', text: 'Bay 4 at 2am is a different planet.' },
      { user: '@dispatch', text: 'Get that crate to the airport on time.' },
    ],
  },
  orbit: {
    handle: '@tgg.orbit',
    place: 'Orbit',
    caption: 'Locked-off shot of the station passing. No time-lapse, it is that fast.',
    audio: 'Skyline Score',
    tags: ['#orbit', '#space'],
    likes: 61900,
    comments: [
      { user: '@ground.ctrl', text: 'Passes like that never get old.' },
      { user: '@lens.flare', text: 'The terminator line though.' },
    ],
  },
}

const REELS = SCENE_ASSETS.map((s) => ({ asset: s, meta: META[s.id] })).filter((r) => r.meta)

function count(n) {
  if (n < 1000) return String(n)
  if (n >= 100000) return `${Math.round(n / 1000)}k`
  return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
}

function HeartIcon({ filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-7-9.4A4.1 4.1 0 0 1 12 7.6 4.1 4.1 0 0 1 19 10.6c0 5-7 9.4-7 9.4Z" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.6A7.5 7.5 0 1 1 20 12Z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5 20 4l-4.6 16-4-6.4-7.4-1.1Z" />
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  )
}

function ReelCanvas({ active, palette, scene }) {
  const canvasRef = useRef(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf = 0
    let start = performance.now()

    const draw = (now) => {
      const t = ((now - start) / 1000) % 12
      drawScene(ctx, scene, t, palette, canvas.width, canvas.height)
      if (activeRef.current) raf = requestAnimationFrame(draw)
    }

    if (active) {
      start = performance.now()
      draw(start)
    } else {
      drawScene(ctx, scene, 1.6, palette, canvas.width, canvas.height)
    }

    return () => cancelAnimationFrame(raf)
  }, [active, scene, palette])

  return <canvas className="reel-canvas" ref={canvasRef} width={540} height={960} />
}

export default function Feed({ onRemix, onNote, published = [] }) {
  const [active, setActive] = useState(0)
  const [liked, setLiked] = useState({})
  const [sheet, setSheet] = useState(null)
  const [threads, setThreads] = useState(() =>
    Object.fromEntries(REELS.map((r) => [r.asset.id, r.meta.comments])),
  )
  const [draft, setDraft] = useState('')
  const scrollerRef = useRef(null)
  const cardRefs = useRef([])

  // your published cuts sit on top, showing the real poster frame
  const reels = useMemo(
    () => [
      ...published.map((cut) => ({
        id: cut.id,
        poster: cut.poster,
        scene: null,
        palette: null,
        meta: {
          handle: cut.handle || '@you',
          place: cut.title || 'Your cut',
          caption: cut.caption || 'Fresh off the timeline.',
          audio: cut.audio || 'original audio',
          tags: cut.tags || ['#yourcut'],
          likes: cut.likes || 0,
          mine: true,
        },
      })),
      ...REELS.map((r) => ({
        id: r.asset.id,
        poster: null,
        scene: r.asset.scene,
        palette: r.asset.palette,
        meta: r.meta,
      })),
    ],
    [published],
  )

  useEffect(() => {
    const root = scrollerRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const idx = Number(entry.target.dataset.index)
          if (!Number.isNaN(idx)) setActive(idx)
        })
      },
      { root, threshold: 0.62 },
    )
    cardRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const toggleLike = useCallback((id) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const postComment = useCallback(
    (id) => {
      const text = draft.trim()
      if (!text) return
      setThreads((prev) => ({ ...prev, [id]: [...prev[id], { user: '@you', text, mine: true }] }))
      setDraft('')
    },
    [draft],
  )

  return (
    <div className="feed">
      <div className="feed-head">
        <div>
          <strong>PUBLISHED CUTS</strong>
          <span>
            {reels.length} reels · {published.length > 0 ? `${published.length} of yours` : 'newest first'}
          </span>
        </div>
        <span className="feed-counter">
          {String(active + 1).padStart(2, '0')} / {String(reels.length).padStart(2, '0')}
        </span>
      </div>

      <div className="feed-scroller" ref={scrollerRef}>
        {reels.map((reel, i) => {
          const id = reel.id
          const meta = reel.meta
          const isLiked = !!liked[id]
          const thread = threads[id] || []
          return (
            <article
              className={`reel${isLiked ? ' is-liked' : ''}`}
              key={id}
              data-index={i}
              ref={(el) => {
                cardRefs.current[i] = el
              }}
            >
              {reel.poster ? (
                <img className="reel-poster" src={reel.poster} alt={`Poster for ${meta.place}`} />
              ) : (
                <ReelCanvas active={i === active} palette={reel.palette} scene={reel.scene} />
              )}
              <div className="reel-shade" />

              <div className="reel-top">
                <span className="reel-place">{meta.place}</span>
                <span className={`reel-badge${meta.mine ? ' mine' : ''}`}>{meta.mine ? 'YOUR CUT' : 'TGG CUT'}</span>
              </div>

              <div className="reel-rail">
                <button
                  className={`rail-btn${isLiked ? ' on' : ''}`}
                  onClick={() => toggleLike(id)}
                  aria-pressed={isLiked}
                  aria-label={isLiked ? 'Unlike reel' : 'Like reel'}
                >
                  <HeartIcon filled={isLiked} />
                  <span>{count(meta.likes + (isLiked ? 1 : 0))}</span>
                </button>
                <button
                  className="rail-btn"
                  onClick={() => setSheet(sheet === id ? null : id)}
                  aria-label="Comments"
                >
                  <CommentIcon />
                  <span>{thread.length}</span>
                </button>
                <button
                  className="rail-btn"
                  onClick={() => onNote(`Link to ${meta.handle}'s cut copied`)}
                  aria-label="Share reel"
                >
                  <ShareIcon />
                  <span>Share</span>
                </button>
                {!meta.mine && (
                  <button
                    className="rail-btn rail-remix"
                    onClick={() => onRemix(reel.id)}
                    aria-label="Open this scene in the editor"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h11M4 12h16M4 17h9" />
                    </svg>
                    <span>Edit</span>
                  </button>
                )}
              </div>

              <div className="reel-bottom">
                <span className="reel-handle">{meta.handle}</span>
                <p className="reel-caption">{meta.caption}</p>
                <div className="reel-tags">
                  {meta.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="reel-audio">
                  <MusicIcon />
                  <span>{meta.audio}</span>
                  {meta.audio && meta.audio !== 'original audio' && <em>original audio</em>}
                </div>
              </div>

              {sheet === id && (
                <div className="comment-sheet">
                  <div className="sheet-head">
                    <strong>{thread.length} comments</strong>
                    <button className="icon-btn" onClick={() => setSheet(null)} aria-label="Close comments">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                  <div className="sheet-list">
                    {thread.length === 0 && <p className="modal-note">No comments yet — be the first.</p>}
                    {thread.map((c, idx) => (
                      <div className={`comment${c.mine ? ' mine' : ''}`} key={`${c.user}-${idx}`}>
                        <strong>{c.user}</strong>
                        <span>{c.text}</span>
                      </div>
                    ))}
                  </div>
                  <form
                    className="sheet-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      postComment(id)
                    }}
                  >
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Add a comment…"
                      maxLength={140}
                      aria-label="Add a comment"
                    />
                    <button className="primary-btn" type="submit" disabled={!draft.trim()}>
                      Post
                    </button>
                  </form>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
