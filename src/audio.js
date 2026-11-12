// Procedural soundtrack synth. One Synth instance renders a style; the live
// engine schedules a loop for preview, and the exporter schedules a fixed span
// into an OfflineAudioContext-fed graph.

const NOTES = (m) => 440 * Math.pow(2, (m - 69) / 12)
export const LOOP_STEPS = 64
const g = (v) => Math.max(0.0001, v)

const STYLES = {
  phonk: {
    bassWave: 'sawtooth',
    bassCut: 520,
    leadWave: 'sawtooth',
    leadCut: 1600,
    padGain: 0.05,
    arp: 'offbeat',
    swing: 0.1,
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hats: [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1],
    prog: [[0, 3, 7], [0, 3, 10], [-2, 1, 5], [-4, 0, 3]],
  },
  trap: {
    bassWave: 'sine',
    bassCut: 300,
    leadWave: 'square',
    leadCut: 1200,
    padGain: 0.05,
    arp: 'triplet',
    swing: 0.06,
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hats: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    prog: [[0, 3, 7], [3, 7, 10], [0, 5, 8], [-2, 3, 7]],
  },
  rnb: {
    bassWave: 'triangle',
    bassCut: 420,
    leadWave: 'sine',
    leadCut: 2200,
    padGain: 0.08,
    arp: 'sparse',
    swing: 0.14,
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hats: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
    prog: [[0, 4, 7], [-3, 0, 4], [-5, -1, 2], [0, 3, 7]],
  },
  lofi: {
    bassWave: 'sine',
    bassCut: 320,
    leadWave: 'triangle',
    leadCut: 1100,
    padGain: 0.09,
    arp: 'sparse',
    swing: 0.18,
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
    clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hats: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    prog: [[0, 3, 7], [-2, 2, 5], [-5, 0, 3], [-2, 3, 7]],
  },
  house: {
    bassWave: 'sawtooth',
    bassCut: 700,
    leadWave: 'sawtooth',
    leadCut: 2400,
    padGain: 0.06,
    arp: 'offbeat',
    swing: 0,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hats: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    prog: [[0, 3, 7], [0, 3, 7], [2, 5, 9], [3, 7, 10]],
  },
  cinematic: {
    bassWave: 'triangle',
    bassCut: 380,
    leadWave: 'sine',
    leadCut: 2800,
    padGain: 0.13,
    arp: 'sparse',
    swing: 0,
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hats: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    prog: [[0, 7, 12], [-2, 5, 10], [-4, 3, 8], [-5, 2, 7]],
  },
}

export function styleFor(style) {
  return STYLES[style] || STYLES.phonk
}

export class Synth {
  constructor(ac, destination) {
    this.ac = ac
    this.dest = destination
    const delay = ac.createDelay(1.2)
    delay.delayTime.value = 0.34
    const fb = ac.createGain()
    fb.gain.value = 0.26
    const wet = ac.createGain()
    wet.gain.value = 0.2
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(wet)
    wet.connect(destination)
    this.delaySend = delay

    const len = Math.floor(ac.sampleRate * 0.5)
    const buf = ac.createBuffer(1, len, ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1
    this.noise = buf
  }

  scheduleStep(style, step, time, stepDur) {
    const s = styleFor(style)
    const bar = Math.floor(step / 16) % 4
    const inBar = step % 16
    const chord = s.prog[bar]
    const swing = inBar % 2 === 1 ? s.swing * stepDur : 0

    if (s.kick[inBar]) this.kick(time + swing)
    if (s.clap[inBar]) this.clap(time + swing)
    if (s.hats[inBar]) this.hat(time + swing, inBar === 14)

    if (inBar === 0) {
      this.pad(time, chord, stepDur * 15.5, s)
      this.bass(time, chord[0] - 12, stepDur * 3.2, s)
    }
    if (inBar === 6 && style !== 'house') this.bass(time, chord[0] - 12, stepDur * 1.4, s)
    if (inBar === 10) this.bass(time, chord[2] - 24, stepDur * 2, s)

    const arpOn =
      s.arp === 'offbeat' ? inBar % 4 === 2 : s.arp === 'triplet' ? inBar % 3 === 0 : inBar === 8 || inBar === 12
    if (arpOn) {
      const idx = (Math.floor(step / 2) + bar) % chord.length
      this.lead(time + swing, chord[idx] + 24, stepDur * (s.arp === 'sparse' ? 5 : 1.6), s)
    }
  }

  kick(time) {
    const ac = this.ac
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, time)
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.14)
    gain.gain.setValueAtTime(g(0.9), time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
    osc.connect(gain).connect(this.dest)
    osc.start(time)
    osc.stop(time + 0.34)
  }

  clap(time) {
    const ac = this.ac
    const src = ac.createBufferSource()
    src.buffer = this.noise
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1700
    bp.Q.value = 0.9
    const gain = ac.createGain()
    gain.gain.setValueAtTime(g(0.32), time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16)
    src.connect(bp).connect(gain).connect(this.dest)
    src.start(time)
    src.stop(time + 0.2)
  }

  hat(time, open) {
    const ac = this.ac
    const src = ac.createBufferSource()
    src.buffer = this.noise
    const hp = ac.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7200
    const gain = ac.createGain()
    const dur = open ? 0.13 : 0.035
    gain.gain.setValueAtTime(g(0.15), time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur)
    src.connect(hp).connect(gain).connect(this.dest)
    src.start(time)
    src.stop(time + dur + 0.02)
  }

  bass(time, midi, dur, s) {
    const ac = this.ac
    const osc = ac.createOscillator()
    const sub = ac.createOscillator()
    const filter = ac.createBiquadFilter()
    const gain = ac.createGain()
    osc.type = s.bassWave
    osc.frequency.value = NOTES(midi)
    sub.type = 'sine'
    sub.frequency.value = NOTES(midi - 12)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(s.bassCut * 2.2, time)
    filter.frequency.exponentialRampToValueAtTime(s.bassCut, time + Math.max(0.08, dur))
    filter.Q.value = 5
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(0.26, time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    osc.connect(filter)
    sub.connect(filter)
    filter.connect(gain).connect(this.dest)
    osc.start(time)
    sub.start(time)
    osc.stop(time + dur + 0.05)
    sub.stop(time + dur + 0.05)
  }

  pad(time, chord, dur, s) {
    const ac = this.ac
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(900, time)
    filter.frequency.linearRampToValueAtTime(2400, time + dur * 0.5)
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.linearRampToValueAtTime(s.padGain, time + dur * 0.28)
    gain.gain.linearRampToValueAtTime(0.0001, time + dur)
    filter.connect(gain).connect(this.dest)
    chord.forEach((offset, i) => {
      const osc = ac.createOscillator()
      osc.type = i === 0 ? 'triangle' : 'sawtooth'
      osc.frequency.value = NOTES(48 + offset)
      osc.detune.value = (i - 1) * 6
      osc.connect(filter)
      osc.start(time)
      osc.stop(time + dur + 0.1)
    })
  }

  lead(time, midi, dur, s) {
    const ac = this.ac
    const osc = ac.createOscillator()
    const filter = ac.createBiquadFilter()
    const gain = ac.createGain()
    osc.type = s.leadWave
    osc.frequency.value = NOTES(midi)
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(s.leadCut, time)
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, s.leadCut * 0.4), time + dur)
    filter.Q.value = 3
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(0.07, time + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.dest)
    gain.connect(this.delaySend)
    osc.start(time)
    osc.stop(time + dur + 0.05)
  }
}

class AudioEngine {
  constructor() {
    this.ctx = null
    this.master = null
    this.synth = null
    this.timer = null
    this.running = false
    this.muted = false
    this.step = 0
    this.nextTime = 0
    this.bpm = 90
    this.style = 'phonk'
    this.trackKey = null
  }

  init() {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : 0.42
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.knee.value = 22
    comp.ratio.value = 4
    comp.attack.value = 0.004
    comp.release.value = 0.22
    master.connect(comp)
    comp.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    this.synth = new Synth(ctx, master)
    return ctx
  }

  async unlock() {
    const ctx = this.init()
    if (!ctx) return false
    if (ctx.state !== 'running') {
      try {
        await ctx.resume()
      } catch {
        return false
      }
    }
    return ctx.state === 'running'
  }

  setMuted(muted) {
    this.muted = muted
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(muted ? 0 : 0.42, t, 0.05)
  }

  /** track: { style, bpm, key } */
  play(track) {
    if (!track) return
    const key = `${track.style}:${track.bpm}:${track.key || ''}`
    if (this.running && this.trackKey === key) return
    this.stop()
    if (!this.unlock()) return
    this.bpm = track.bpm || 90
    this.style = track.style || 'phonk'
    this.trackKey = key
    this.step = 0
    this.running = true
    this.nextTime = this.ctx.currentTime + 0.06
    this.timer = setInterval(() => this.tick(), 25)
  }

  tick() {
    if (!this.ctx || !this.running) return
    const stepDur = 60 / this.bpm / 4
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      this.synth.scheduleStep(this.style, this.step, this.nextTime, stepDur)
      this.step = (this.step + 1) % LOOP_STEPS
      this.nextTime += stepDur
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.running = false
    this.trackKey = null
  }

  pause() {
    this.stop()
  }
}

export const engine = new AudioEngine()

/**
 * Schedule a fixed span of a style into any audio context. Used by the exporter
 * so the downloaded file carries the same soundtrack as the preview.
 */
export function scheduleSpan(ac, destination, { style, bpm }, startAt, duration, gainValue = 0.8) {
  const gain = ac.createGain()
  gain.gain.value = gainValue
  gain.connect(destination)
  const synth = new Synth(ac, gain)
  const stepDur = 60 / (bpm || 90) / 4
  const steps = Math.ceil(duration / stepDur) + 1
  for (let i = 0; i < steps; i += 1) {
    const t = startAt + i * stepDur
    if (t >= startAt + duration) break
    synth.scheduleStep(style, i % LOOP_STEPS, t, stepDur)
  }
  return synth
}
