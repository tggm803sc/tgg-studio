// Procedural canvas scenes. Each reel is a living backdrop rather than a video
// file: cheap, offline, and different every frame.

const rnd = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

function mix(c1, c2, t) {
  const a = hexToRgb(c1)
  const b = hexToRgb(c2)
  const out = a.map((v, i) => Math.round(v + (b[i] - v) * clamp(t, 0, 1)))
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(color, alpha))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function sky(ctx, w, h, top, bottom, hy) {
  const g = ctx.createLinearGradient(0, 0, 0, hy)
  g.addColorStop(0, top)
  g.addColorStop(0.6, mix(top, bottom, 0.5))
  g.addColorStop(1, bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, hy + 1)
  return g
}

function sceneCity(ctx, { w, h, t, a, bg, c }) {
  const hy = h * 0.74
  sky(ctx, w, h, mix(bg, '#000', 0.45), mix(bg, c, 0.35), hy)
  glow(ctx, w * 0.68, hy * 0.42, w * 0.5, a, 0.22)

  const layers = [
    { count: 16, max: 0.3, speed: 7, shade: 0.42, win: 0.5 },
    { count: 12, max: 0.44, speed: 16, shade: 0.26, win: 0.75 },
    { count: 9, max: 0.58, speed: 30, shade: 0.14, win: 1 },
  ]

  layers.forEach((L, li) => {
    const spacing = w / L.count
    const offset = ((t * L.speed) % spacing + spacing) % spacing
    for (let i = -1; i <= L.count; i += 1) {
      const seed = i + li * 40
      const bh = h * L.max * (0.42 + rnd(seed) * 0.75)
      const bw = spacing * (0.55 + rnd(seed + 3) * 0.5)
      const x = i * spacing - offset
      const y = hy - bh
      ctx.fillStyle = rgba(mix(bg, '#01040a', L.shade), 0.95)
      ctx.fillRect(x, y, bw, bh + 4)
      // rooftop antenna
      if (rnd(seed + 9) > 0.72) {
        ctx.fillRect(x + bw * 0.5, y - h * 0.05, 1.6, h * 0.05)
        ctx.fillStyle = rgba(a, 0.8)
        ctx.fillRect(x + bw * 0.5 - 1, y - h * 0.055, 4, 3)
      }
      // windows
      const cols = Math.max(2, Math.floor(bw / 9))
      const rows = Math.max(2, Math.floor(bh / 12))
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          const r = rnd(seed + cx * 3.1 + cy * 7.7)
          if (r > 0.63) {
            const flick = rnd(seed + cx + cy + Math.floor(t * 0.6)) > 0.5 ? 1 : 0.65
            ctx.fillStyle = rgba(r > 0.9 ? c : a, 0.16 * L.win * flick)
            ctx.fillRect(x + 4 + cx * (bw / cols), y + 6 + cy * (bh / rows), 2.6, 3.6)
          }
        }
      }
    }
  })

  // road
  const roadTop = hy + 2
  const grad = ctx.createLinearGradient(0, roadTop, 0, h)
  grad.addColorStop(0, rgba(mix(bg, '#000', 0.5), 1))
  grad.addColorStop(1, '#04060a')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(w * 0.43, roadTop)
  ctx.lineTo(w * 0.57, roadTop)
  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.fill()

  // lane dashes rushing at the camera
  for (let i = 0; i < 9; i += 1) {
    const p = ((i / 9 + (t * 0.5) % (1 / 9)) % 1)
    const z = p
    const y = roadTop + (h - roadTop) * z * z
    const size = 1 + z * 14
    ctx.fillStyle = rgba(a, 0.14 + z * 0.5)
    ctx.fillRect(w * 0.5 - size * 0.16, y, size * 0.32, size * 1.5)
  }
  // side rails
  ctx.strokeStyle = rgba(c, 0.18)
  ctx.lineWidth = 1
  ;[0, 1].forEach((s) => {
    ctx.beginPath()
    ctx.moveTo(s ? w * 0.57 : w * 0.43, roadTop)
    ctx.lineTo(s ? w : 0, h)
    ctx.stroke()
  })
  // headlight streak
  glow(ctx, w * 0.5, h * 0.9, w * 0.5, '#ffffff', 0.09)
}

function sceneSalt(ctx, { w, h, t, a, bg, c }) {
  const hy = h * 0.62
  sky(ctx, w, h, mix(bg, '#1a0a12', 0.2), mix(a, bg, 0.35), hy)
  const sunY = hy * 0.62
  glow(ctx, w * 0.5, sunY, w * 0.62, a, 0.5)
  const sun = ctx.createRadialGradient(w * 0.5, sunY, 0, w * 0.5, sunY, h * 0.14)
  sun.addColorStop(0, rgba('#fff6d8', 0.98))
  sun.addColorStop(0.55, rgba(a, 0.95))
  sun.addColorStop(1, rgba(c, 0.2))
  ctx.fillStyle = sun
  ctx.beginPath()
  ctx.arc(w * 0.5, sunY, h * 0.135, 0, Math.PI * 2)
  ctx.fill()

  // mountains
  ctx.fillStyle = rgba(mix(bg, '#000', 0.15), 0.95)
  ctx.beginPath()
  ctx.moveTo(-20, hy)
  for (let i = 0; i <= 12; i += 1) {
    const x = (i / 12) * (w + 40) - 20
    const peak = hy - (10 + rnd(i * 5.3) * h * 0.075)
    ctx.lineTo(x, peak)
  }
  ctx.lineTo(w + 20, hy)
  ctx.closePath()
  ctx.fill()

  // flats
  const ground = ctx.createLinearGradient(0, hy, 0, h)
  ground.addColorStop(0, mix(mix(a, bg, 0.72), '#000', 0.35))
  ground.addColorStop(1, '#0a0710')
  ctx.fillStyle = ground
  ctx.fillRect(0, hy, w, h - hy)

  // sun reflection column
  const refl = ctx.createLinearGradient(0, hy, 0, h)
  refl.addColorStop(0, rgba(a, 0.5))
  refl.addColorStop(1, rgba(a, 0))
  ctx.fillStyle = refl
  ctx.beginPath()
  ctx.moveTo(w * 0.46, hy)
  ctx.lineTo(w * 0.54, hy)
  ctx.lineTo(w * 0.72, h)
  ctx.lineTo(w * 0.28, h)
  ctx.closePath()
  ctx.fill()

  // heat shimmer + speed lines
  for (let i = 0; i < 14; i += 1) {
    const p = i / 14
    const y = hy + (h - hy) * p * p
    const wobble = Math.sin(t * 2.4 + i) * w * 0.012 * p
    ctx.fillStyle = rgba('#ffffff', 0.05 + p * 0.07)
    ctx.fillRect(w * (0.5 - 0.5 * p) + wobble, y, w * (1 - p * 0.95), 1)
  }
  for (let i = 0; i < 16; i += 1) {
    const p = (rnd(i) + t * 0.42) % 1
    const y = hy * 0.4 + p * h * 0.66
    const x = (rnd(i + 3) * w * 1.4 - w * 0.2 + p * 60) % w
    ctx.fillStyle = rgba(i % 3 === 0 ? c : a, 0.1 + p * 0.16)
    ctx.fillRect(x, y, 2 + p * 22, 1.2)
  }
  // foreground dust
  for (let i = 0; i < 26; i += 1) {
    const x = (rnd(i + 11) * w + t * (8 + rnd(i) * 26)) % w
    const y = h * 0.7 + rnd(i + 5) * h * 0.3
    ctx.fillStyle = rgba(a, 0.12 + rnd(i) * 0.18)
    ctx.fillRect(x, y, 1.6, 1.6)
  }
}

function sceneStudio(ctx, { w, h, t, a, bg, c }) {
  ctx.fillStyle = mix(bg, '#000', 0.25)
  ctx.fillRect(0, 0, w, h)
  glow(ctx, w * 0.25, h * 0.2, w * 0.7, a, 0.14)
  glow(ctx, w * 0.8, h * 0.75, w * 0.6, c, 0.1)

  const mid = h * 0.52
  const bars = Math.floor(w / 7)
  for (let i = 0; i < bars; i += 1) {
    const p = i / bars
    const amp =
      Math.abs(Math.sin(t * 1.6 + p * 9)) * 0.4 +
      Math.abs(Math.sin(t * 3.1 + p * 17)) * 0.35 +
      Math.abs(Math.sin(t * 0.7 + p * 4)) * 0.5
    const bh = Math.min(h * 0.34, (0.08 + amp * 0.55) * h * 0.5)
    const x = i * 7 + 3
    ctx.fillStyle = rgba(i % 7 === 0 ? c : a, 0.35 + amp * 0.5)
    ctx.fillRect(x, mid - bh / 2, 3.4, bh)
    ctx.fillStyle = rgba(a, 0.06)
    ctx.fillRect(x, mid - bh / 2 - 3, 3.4, bh + 6)
  }
  ctx.fillStyle = rgba(a, 0.25)
  ctx.fillRect(0, mid - 0.5, w, 1)

  // mixer channel faders on the right
  const faders = 6
  const fx = w * 0.72
  const fw = w * 0.24
  ctx.fillStyle = rgba('#000000', 0.5)
  ctx.fillRect(fx, h * 0.1, fw, h * 0.78)
  ctx.strokeStyle = rgba(a, 0.16)
  ctx.lineWidth = 1
  ctx.strokeRect(fx, h * 0.1, fw, h * 0.78)
  for (let i = 0; i < faders; i += 1) {
    const x = fx + fw * (0.14 + (i / (faders - 1)) * 0.72)
    const level = 0.2 + Math.abs(Math.sin(t * (0.9 + i * 0.23) + i)) * 0.7
    ctx.fillStyle = rgba('#ffffff', 0.1)
    ctx.fillRect(x - 1, h * 0.15, 2, h * 0.62)
    ctx.fillStyle = rgba(i % 2 ? c : a, 0.9)
    ctx.fillRect(x - 6, h * 0.15 + (1 - level) * h * 0.6, 12, 8)
    // meter
    ctx.fillStyle = rgba(a, 0.06)
    ctx.fillRect(x - 2, h * 0.8, 4, h * 0.06)
    ctx.fillStyle = rgba(level > 0.7 ? c : a, 0.8)
    ctx.fillRect(x - 2, h * 0.8 + (1 - level) * h * 0.06, 4, level * h * 0.06)
  }

  // VU meters
  for (let m = 0; m < 4; m += 1) {
    const y = h * 0.16 + m * h * 0.07
    const lvl = 0.3 + Math.abs(Math.sin(t * 2 + m * 1.7)) * 0.68
    const segs = 12
    for (let s = 0; s < segs; s += 1) {
      const on = s / segs < lvl
      ctx.fillStyle = rgba(on ? (s > segs - 3 ? c : a) : '#ffffff', on ? 0.85 : 0.08)
      ctx.fillRect(w * 0.06 + s * 5.4, y, 4, 3.4)
    }
  }

  // rec overlay
  const blink = Math.sin(t * 4) > 0
  ctx.fillStyle = rgba('#ff3b3b', blink ? 0.95 : 0.25)
  ctx.beginPath()
  ctx.arc(w * 0.08, h * 0.09, 3.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba('#ffffff', 0.5)
  ctx.font = '10px ui-monospace, monospace'
  ctx.fillText('REC  03:14:22', w * 0.115, h * 0.095)
}

function sceneTape(ctx, { w, h, t, a, bg, c }) {
  ctx.fillStyle = mix(bg, '#000', 0.3)
  ctx.fillRect(0, 0, w, h)
  glow(ctx, w * 0.5, h * 0.45, w * 0.85, a, 0.16)

  // machine body
  ctx.fillStyle = rgba(mix(bg, '#ffffff', 0.05), 0.85)
  ctx.fillRect(w * 0.05, h * 0.26, w * 0.9, h * 0.48)
  ctx.strokeStyle = rgba(a, 0.22)
  ctx.strokeRect(w * 0.05, h * 0.26, w * 0.9, h * 0.48)

  const cy = h * 0.5
  const r = w * 0.15
  ;[0.3, 0.7].forEach((cxFrac, idx) => {
    const cx = w * cxFrac
    const spin = t * (idx === 0 ? 2.4 : 2.15) * (1 + idx * 0.08)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.strokeStyle = rgba(a, 0.5)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = rgba(a, 0.18)
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2)
    ctx.stroke()
    // spokes
    for (let i = 0; i < 3; i += 1) {
      const ang = spin + (i * Math.PI * 2) / 3
      ctx.strokeStyle = rgba(i === 1 ? c : a, 0.65)
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(Math.cos(ang) * r * 0.18, Math.sin(ang) * r * 0.18)
      ctx.lineTo(Math.cos(ang) * r * 0.96, Math.sin(ang) * r * 0.96)
      ctx.stroke()
    }
    ctx.fillStyle = rgba(mix(bg, '#000', 0.2), 1)
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = rgba(a, 0.6)
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
  })

  // tape path
  ctx.strokeStyle = rgba('#e9d7b5', 0.5)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(w * 0.3 - r, cy - r * 0.55)
  ctx.lineTo(w * 0.5, cy + h * 0.16)
  ctx.lineTo(w * 0.7 + r, cy - r * 0.55)
  ctx.stroke()

  // label plate
  ctx.fillStyle = rgba('#f2e4c8', 0.1)
  ctx.fillRect(w * 0.2, h * 0.8, w * 0.6, h * 0.1)
  ctx.fillStyle = rgba(a, 0.55)
  ctx.font = '11px ui-monospace, monospace'
  ctx.fillText('MASTER · SIDE A · 33⅓', w * 0.24, h * 0.86)

  // dust motes
  for (let i = 0; i < 30; i += 1) {
    const x = (rnd(i) * w + t * 5) % w
    const y = (rnd(i + 7) * h + Math.sin(t + i) * 6 + h) % h
    ctx.fillStyle = rgba('#fff3d0', 0.1 + rnd(i + 2) * 0.22)
    ctx.fillRect(x, y, 1.4, 1.4)
  }
}

function sceneStage(ctx, { w, h, t, a, bg, c }) {
  ctx.fillStyle = mix(bg, '#000', 0.35)
  ctx.fillRect(0, 0, w, h)
  glow(ctx, w * 0.5, h * 0.2, w * 0.9, a, 0.2)

  // spotlights
  for (let i = 0; i < 4; i += 1) {
    const baseX = w * (0.15 + i * 0.24)
    const ang = Math.sin(t * 0.6 + i * 1.3) * 0.5
    const sweep = Math.sin(t * 0.35 + i) * w * 0.16
    const gx = baseX + sweep
    const g = ctx.createLinearGradient(gx, 0, gx + Math.sin(ang) * h, h)
    g.addColorStop(0, rgba(i % 2 ? c : a, 0.35))
    g.addColorStop(1, rgba(i % 2 ? c : a, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(gx - 4, 0)
    ctx.lineTo(gx + 4, 0)
    ctx.lineTo(gx + Math.sin(ang) * h + w * 0.16, h)
    ctx.lineTo(gx + Math.sin(ang) * h - w * 0.16, h)
    ctx.closePath()
    ctx.fill()
  }

  // crowd silhouettes bobbing
  const hy = h * 0.66
  for (let layer = 0; layer < 2; layer += 1) {
    const count = 14 + layer * 6
    const baseY = hy + layer * h * 0.11
    for (let i = 0; i < count; i += 1) {
      const x = ((i / count) * w * 1.1 - w * 0.05) + rnd(i + layer * 30) * 12
      const bob = Math.sin(t * (2.2 + rnd(i) * 2) + i * 0.9) * h * 0.022
      const headR = (layer ? 0.05 : 0.038) * h * (0.6 + rnd(i + 4) * 0.6)
      ctx.fillStyle = rgba(mix(bg, '#000', 0.2), layer ? 0.95 : 0.8)
      ctx.beginPath()
      ctx.arc(x, baseY + bob, headR, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x, baseY + bob + headR * 2.4, headR * 1.9, headR * 2.6, 0, Math.PI, 0)
      ctx.fill()
      // raised phone light
      if (rnd(i * 3.3 + layer) > 0.72) {
        const flick = 0.5 + Math.abs(Math.sin(t * 3 + i)) * 0.5
        ctx.fillStyle = rgba(c, 0.5 * flick)
        ctx.fillRect(x + headR * 0.6, baseY + bob - headR * 1.6, 1.8, 3)
      }
    }
  }

  // haze
  const haze = ctx.createLinearGradient(0, hy - h * 0.25, 0, h)
  haze.addColorStop(0, rgba(a, 0.12))
  haze.addColorStop(1, rgba(a, 0))
  ctx.fillStyle = haze
  ctx.fillRect(0, hy - h * 0.25, w, h)
}

function sceneAurora(ctx, { w, h, t, a, bg, c }) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, mix(bg, '#000', 0.3))
  g.addColorStop(0.55, mix(bg, a, 0.16))
  g.addColorStop(1, '#03060b')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  for (let i = 0; i < 70; i += 1) {
    const x = rnd(i) * w
    const y = rnd(i + 3) * h * 0.7
    const tw = 0.3 + Math.abs(Math.sin(t * 1.4 + i)) * 0.7
    ctx.fillStyle = rgba('#ffffff', 0.15 + tw * 0.5)
    ctx.fillRect(x, y, 1.2, 1.2)
  }

  for (let k = 0; k < 3; k += 1) {
    const hue = k === 0 ? a : k === 1 ? c : mix(a, c, 0.5)
    ctx.beginPath()
    ctx.moveTo(-20, h * 0.8)
    const steps = 24
    for (let i = 0; i <= steps; i += 1) {
      const p = i / steps
      const x = p * (w + 40) - 20
      const y =
        h * (0.34 + k * 0.07) +
        Math.sin(p * 4 + t * 0.5 + k * 1.6) * h * 0.09 +
        Math.sin(p * 9 + t * 0.9 + k) * h * 0.03
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w + 20, h * 0.8)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, h * 0.25, 0, h * 0.8)
    grad.addColorStop(0, rgba(hue, 0))
    grad.addColorStop(0.45, rgba(hue, 0.34))
    grad.addColorStop(1, rgba(hue, 0.02))
    ctx.fillStyle = grad
    ctx.fill()
  }

  // horizon warmth
  glow(ctx, w * 0.5, h * 0.86, w * 0.7, a, 0.12)
}

function sceneGrid(ctx, { w, h, t, a, bg, c }) {
  const hy = h * 0.55
  const g = ctx.createLinearGradient(0, 0, 0, hy)
  g.addColorStop(0, mix(bg, '#000', 0.2))
  g.addColorStop(0.75, mix(bg, a, 0.35))
  g.addColorStop(1, mix(a, bg, 0.4))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, hy + 1)

  // sun with scanlines
  const sunR = h * 0.16
  const sun = ctx.createLinearGradient(0, hy * 0.55 - sunR, 0, hy * 0.55 + sunR)
  sun.addColorStop(0, '#fff2b8')
  sun.addColorStop(0.5, a)
  sun.addColorStop(1, c)
  ctx.fillStyle = sun
  ctx.beginPath()
  ctx.arc(w * 0.5, hy * 0.55, sunR, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rgba(mix(bg, '#000', 0.1), 0.85)
  for (let i = 0; i < 7; i += 1) {
    const y = hy * 0.55 - sunR * 0.1 + i * sunR * 0.16
    const hh = 1 + i * 1.6
    ctx.fillRect(w * 0.5 - sunR, y, sunR * 2, hh)
  }
  glow(ctx, w * 0.5, hy * 0.55, sunR * 2.4, a, 0.18)

  // floor
  ctx.fillStyle = '#08030c'
  ctx.fillRect(0, hy, w, h - hy)

  ctx.strokeStyle = rgba(c, 0.35)
  ctx.lineWidth = 1
  // horizontal lines rushing forward
  for (let i = 0; i < 18; i += 1) {
    const p = ((i / 18 + (t * 0.22) % (1 / 18)) % 1)
    const y = hy + (h - hy) * p * p * p
    ctx.globalAlpha = 0.15 + p * 0.75
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  // converging verticals
  ctx.globalAlpha = 0.45
  for (let i = -10; i <= 10; i += 1) {
    ctx.beginPath()
    ctx.moveTo(w * 0.5 + i * w * 0.012, hy)
    ctx.lineTo(w * 0.5 + i * w * 0.2, h)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = rgba(a, 0.5)
  ctx.fillRect(0, hy, w, 1.4)
}

function sceneRain(ctx, { w, h, t, a, bg, c }) {
  ctx.fillStyle = mix(bg, '#000', 0.35)
  ctx.fillRect(0, 0, w, h)

  // blurred neon outside the window
  const blobs = [
    [0.22, 0.24, 0.3, a],
    [0.68, 0.18, 0.22, c],
    [0.52, 0.42, 0.4, mix(a, c, 0.4)],
    [0.82, 0.5, 0.2, a],
  ]
  blobs.forEach(([x, y, r, col], i) => {
    const pulse = 0.7 + Math.sin(t * (0.7 + i * 0.3) + i) * 0.3
    glow(ctx, w * x, h * y, w * r, col, 0.3 * pulse)
  })

  // rain streaks
  ctx.lineCap = 'round'
  for (let i = 0; i < 90; i += 1) {
    const speed = 300 + rnd(i) * 480
    const x = (rnd(i) * w * 1.2 + t * 26) % (w * 1.1)
    const y = (rnd(i + 9) * h + t * speed) % (h * 1.05)
    const len = 8 + rnd(i + 2) * 26
    ctx.strokeStyle = rgba('#cfe8ff', 0.06 + rnd(i + 4) * 0.2)
    ctx.lineWidth = 0.8 + rnd(i + 6) * 1.1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 2, y + len)
    ctx.stroke()
  }

  // droplets on the glass
  for (let i = 0; i < 24; i += 1) {
    const cx = rnd(i + 20) * w
    const cy = ((rnd(i + 30) * h + t * (12 + rnd(i) * 26)) % h)
    const r = 1.5 + rnd(i + 12) * 4
    ctx.fillStyle = rgba('#dff2ff', 0.12)
    ctx.beginPath()
    ctx.ellipse(cx, cy, r, r * 1.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba('#ffffff', 0.24)
    ctx.fillRect(cx - r * 0.4, cy - r * 0.7, r * 0.5, r * 0.5)
  }

  // window frame
  ctx.fillStyle = rgba('#05080d', 0.96)
  ctx.fillRect(0, 0, w, h * 0.055)
  ctx.fillRect(0, h * 0.945, w, h * 0.055)
  ctx.fillRect(0, 0, w * 0.03, h)
  ctx.fillRect(w * 0.97, 0, w * 0.03, h)
}

function sceneFreight(ctx, { w, h, t, a, bg, c }) {
  const vpx = w * 0.5
  const vpy = h * 0.44
  ctx.fillStyle = mix(bg, '#000', 0.2)
  ctx.fillRect(0, 0, w, h)

  // floor
  const floor = ctx.createLinearGradient(0, vpy, 0, h)
  floor.addColorStop(0, mix(bg, '#000', 0.35))
  floor.addColorStop(1, '#07090a')
  ctx.fillStyle = floor
  ctx.fillRect(0, vpy, w, h - vpy)

  ctx.strokeStyle = rgba(a, 0.16)
  ctx.lineWidth = 1
  for (let i = -6; i <= 6; i += 1) {
    ctx.beginPath()
    ctx.moveTo(vpx + i * w * 0.03, vpy)
    ctx.lineTo(vpx + i * w * 0.34, h)
    ctx.stroke()
  }
  for (let i = 0; i < 9; i += 1) {
    const p = i / 9
    const y = vpy + (h - vpy) * p * p
    ctx.globalAlpha = 0.1 + p * 0.4
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // ceiling light strips
  for (let i = 0; i < 5; i += 1) {
    const x = w * (0.16 + i * 0.17)
    const flick = 0.55 + Math.sin(t * 9 + i * 2) * 0.12 + (i === 2 ? Math.sin(t * 30) * 0.3 : 0)
    ctx.fillStyle = rgba('#eaffd0', clamp(flick, 0.1, 0.9) * 0.5)
    ctx.fillRect(x, h * 0.05, w * 0.1, 4)
    const cone = ctx.createLinearGradient(x, h * 0.05, x, vpy + h * 0.24)
    cone.addColorStop(0, rgba(a, 0.22 * flick))
    cone.addColorStop(1, rgba(a, 0))
    ctx.fillStyle = cone
    ctx.beginPath()
    ctx.moveTo(x, h * 0.06)
    ctx.lineTo(x + w * 0.1, h * 0.06)
    ctx.lineTo(x + w * 0.2, vpy + h * 0.24)
    ctx.lineTo(x - w * 0.1, vpy + h * 0.24)
    ctx.closePath()
    ctx.fill()
  }

  // crate stacks
  const crate = (cx, cy, cw, ch, tone) => {
    ctx.fillStyle = rgba(mix(bg, tone, 0.45), 1)
    ctx.fillRect(cx, cy, cw, ch)
    ctx.strokeStyle = rgba(a, 0.2)
    ctx.strokeRect(cx, cy, cw, ch)
    ctx.fillStyle = rgba(a, 0.1)
    ctx.fillRect(cx, cy + ch * 0.48, cw, 2)
    ctx.fillStyle = rgba(c, 0.35)
    ctx.fillRect(cx + cw * 0.1, cy + ch * 0.1, cw * 0.22, 3)
  }
  crate(w * 0.04, h * 0.5, w * 0.2, h * 0.16, '#2a2f2a')
  crate(w * 0.04, h * 0.66, w * 0.2, h * 0.2, '#232823')
  crate(w * 0.27, h * 0.58, w * 0.16, h * 0.14, '#2b302b')
  crate(w * 0.8, h * 0.46, w * 0.18, h * 0.18, '#262b26')
  crate(w * 0.79, h * 0.64, w * 0.19, h * 0.22, '#202520')

  // pallet + forklift silhouette
  ctx.fillStyle = rgba('#101410', 1)
  const fx = w * 0.56 + Math.sin(t * 0.6) * w * 0.03
  ctx.fillRect(fx, h * 0.7, w * 0.16, h * 0.06)
  ctx.fillRect(fx + w * 0.11, h * 0.62, w * 0.05, h * 0.1)
  ctx.fillRect(fx + w * 0.15, h * 0.66, w * 0.01, h * 0.12)
  ctx.fillStyle = rgba(a, 0.5)
  ctx.fillRect(fx + w * 0.14, h * 0.63, 3, 2)
  // pallet load
  ctx.fillStyle = rgba(mix(bg, a, 0.25), 0.9)
  ctx.fillRect(fx - w * 0.01, h * 0.645, w * 0.1, h * 0.055)

  glow(ctx, vpx, h * 0.5, w * 0.4, a, 0.1)
}

function sceneOrbit(ctx, { w, h, t, a, bg, c }) {
  const cx = w * 0.5
  const cy = h * 0.45
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.9)
  g.addColorStop(0, mix(bg, a, 0.22))
  g.addColorStop(0.4, mix(bg, '#000', 0.1))
  g.addColorStop(1, '#04040a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // particle field
  for (let i = 0; i < 50; i += 1) {
    const ang = rnd(i) * Math.PI * 2 + t * (0.05 + rnd(i + 3) * 0.12)
    const rad = (0.15 + rnd(i + 7) * 0.7) * w
    const x = cx + Math.cos(ang) * rad
    const y = cy + Math.sin(ang) * rad * 0.6
    ctx.fillStyle = rgba('#ffffff', 0.1 + rnd(i) * 0.25)
    ctx.fillRect(x, y, 1.4, 1.4)
  }

  // core
  glow(ctx, cx, cy, w * 0.34, a, 0.4)
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.1)
  core.addColorStop(0, rgba('#ffffff', 0.9))
  core.addColorStop(0.4, rgba(a, 0.8))
  core.addColorStop(1, rgba(a, 0))
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(cx, cy, w * 0.1, 0, Math.PI * 2)
  ctx.fill()

  // rings
  for (let k = 0; k < 4; k += 1) {
    const rx = w * (0.16 + k * 0.1)
    const ry = rx * (0.34 + k * 0.05)
    const tilt = -0.28 + k * 0.12
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(tilt)
    ctx.strokeStyle = rgba(k % 2 ? c : a, 0.3 - k * 0.04)
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
    const ang = t * (0.5 + k * 0.22) + k
    const px = Math.cos(ang) * rx
    const py = Math.sin(ang) * ry
    glow(ctx, px, py, 16, k % 2 ? c : a, 0.6)
    ctx.fillStyle = rgba(k % 2 ? c : a, 0.95)
    ctx.beginPath()
    ctx.arc(px, py, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // horizon city line
  ctx.fillStyle = rgba('#05050b', 0.9)
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let i = 0; i <= 20; i += 1) {
    const x = (i / 20) * w
    const bh = h * 0.03 + rnd(i * 2.7) * h * 0.07
    ctx.lineTo(x, h - bh)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = rgba(a, 0.35)
  ctx.fillRect(0, h - 1, w, 1)
}

const SCENES = {
  city: sceneCity,
  salt: sceneSalt,
  studio: sceneStudio,
  tape: sceneTape,
  stage: sceneStage,
  aurora: sceneAurora,
  grid: sceneGrid,
  rain: sceneRain,
  freight: sceneFreight,
  orbit: sceneOrbit,
}

export function drawScene(ctx, scene, t, palette, w, h) {
  if (!ctx || w <= 0 || h <= 0) return
  const [a, bg, c] = palette || ['#c6ff2e', '#0a0a10', '#2ee6a8']
  const fn = SCENES[scene] || sceneCity
  ctx.save()
  ctx.clearRect(0, 0, w, h)
  fn(ctx, { w, h, t, a, bg, c })
  // shared grade: vignette + subtle grain-ish scanlines
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.2, w * 0.5, h * 0.5, h * 0.95)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}
