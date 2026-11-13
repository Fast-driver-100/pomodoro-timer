// Web Audio API 기반 오디오 엔진 — 외부 음원 파일 없이 모든 소리를 합성합니다.

let ctx = null

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

/**
 * iOS Safari 오디오 정책 우회: 반드시 사용자 제스처(클릭/탭) 핸들러 안에서 동기적으로 호출해야 합니다.
 * - AudioContext.resume()
 * - 무음 버퍼 1샘플 재생으로 오디오 출력 경로 "잠금 해제"
 * - Safari 16.4+: audioSession.type = 'playback' 으로 무음 스위치가 켜져 있어도 소리 재생
 */
export function unlockAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'
  } catch {
    /* 미지원 */
  }
  const c = getCtx()
  if (!c) return
  if (c.state !== 'running') c.resume().catch(() => {})
  try {
    const buf = c.createBuffer(1, 1, 22050)
    const src = c.createBufferSource()
    src.buffer = buf
    src.connect(c.destination)
    src.start(0)
  } catch {
    /* noop */
  }
}

/** 맑은 싱잉볼 느낌의 벨 소리 (비조화 배음 + 지수 감쇠) */
export function playBell(strikes = 3) {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})

  const master = c.createGain()
  master.gain.value = 0.55
  master.connect(c.destination)

  const base = 659.25 // E5
  const partials = [
    [1, 1, 2.6],
    [2.0, 0.35, 1.6],
    [2.76, 0.28, 1.2],
    [5.4, 0.12, 0.7],
    [8.93, 0.05, 0.4],
  ]

  for (let i = 0; i < strikes; i++) {
    const t0 = c.currentTime + 0.05 + i * 0.85
    for (const [ratio, amp, decay] of partials) {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = base * ratio
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(amp * 0.45, t0 + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)
      osc.connect(g).connect(master)
      osc.start(t0)
      osc.stop(t0 + decay + 0.05)
    }
  }
}

// ---------------------------------------------------------------------------
// 노이즈 제너레이터
// ---------------------------------------------------------------------------

/** 루프 이음새에서 '틱' 소리가 나지 않도록 끝-시작을 크로스페이드한 스테레오 버퍼 생성 */
function makeLoopBuffer(c, seconds, fillChannel) {
  const sr = c.sampleRate
  const fade = Math.floor(sr * 0.5)
  const len = Math.floor(sr * seconds)
  const buf = c.createBuffer(2, len, sr)
  for (let ch = 0; ch < 2; ch++) {
    const raw = new Float32Array(len + fade)
    fillChannel(raw, sr)
    const out = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) out[i] = raw[i]
    for (let i = 0; i < fade; i++) {
      const t = i / fade
      // equal-power crossfade
      out[i] = raw[i] * Math.sin((t * Math.PI) / 2) + raw[len + i] * Math.cos((t * Math.PI) / 2)
    }
  }
  return buf
}

/** 핑크 노이즈 (Paul Kellet 필터) */
function fillPink(data) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + w * 0.0555179
    b1 = 0.99332 * b1 + w * 0.0750759
    b2 = 0.969 * b2 + w * 0.153852
    b3 = 0.8665 * b3 + w * 0.3104856
    b4 = 0.55 * b4 + w * 0.5329522
    b5 = -0.7616 * b5 - w * 0.016898
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
    b6 = w * 0.115926
  }
}

/** 브라운 노이즈 (랜덤 워크 적분) */
function fillBrown(data) {
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1
    last = (last + 0.02 * w) / 1.02
    data[i] = last * 3.5
  }
}

/** 빗소리: 핑크 노이즈 + 간헐적인 물방울 톡톡 */
function fillRain(data, sr) {
  fillPink(data)
  let env = 0
  const dropRate = 18 / sr
  const decay = Math.exp(-1 / (sr * 0.004))
  let hp = 0, prev = 0
  for (let i = 0; i < data.length; i++) {
    if (Math.random() < dropRate) env = 0.15 + Math.random() * 0.35
    env *= decay
    const w = Math.random() * 2 - 1
    hp = 0.85 * (hp + w - prev) // 고역 통과 → 가벼운 '톡'
    prev = w
    data[i] = data[i] * 0.9 + hp * env
  }
}

/** 장작불: 저역 브라운 노이즈 + 랜덤한 '탁/타닥' 크래클 */
function fillFire(data, sr) {
  fillBrown(data)
  for (let i = 0; i < data.length; i++) data[i] *= 0.75
  let env = 0
  let burst = 0
  const decay = Math.exp(-1 / (sr * 0.003))
  for (let i = 0; i < data.length; i++) {
    // 크래클은 무리 지어 발생 (타닥-타닥)
    if (burst > 0 && Math.random() < 40 / sr) {
      env = 0.3 + Math.random() * 0.7
      burst--
    } else if (Math.random() < 1.6 / sr) {
      burst = 1 + Math.floor(Math.random() * 5)
      env = 0.4 + Math.random() * 0.6
    }
    env *= decay
    data[i] += (Math.random() * 2 - 1) * env
  }
}

export const SOUNDS = [
  {
    id: 'rain',
    label: '빗소리',
    desc: 'Pink noise',
    seconds: 12,
    fill: fillRain,
    chain: (c) => {
      const hp = c.createBiquadFilter()
      hp.type = 'highpass'
      hp.frequency.value = 350
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 7500
      hp.connect(lp)
      return [hp, lp]
    },
    gain: 0.9,
  },
  {
    id: 'fire',
    label: '장작불',
    desc: 'Brown noise + crackle',
    seconds: 14,
    fill: fillFire,
    chain: (c) => {
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 3800
      const shelf = c.createBiquadFilter()
      shelf.type = 'lowshelf'
      shelf.frequency.value = 200
      shelf.gain.value = 4
      lp.connect(shelf)
      return [lp, shelf]
    },
    gain: 0.8,
  },
  {
    id: 'brown',
    label: '브라운 노이즈',
    desc: 'Deep focus',
    seconds: 10,
    fill: fillBrown,
    chain: (c) => {
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 900
      return [lp, lp]
    },
    gain: 0.9,
  },
]

const buffers = new Map()
const voices = new Map() // id -> { src, gain }

function volumeCurve(v) {
  return v * v // 사람 귀에 자연스러운 볼륨 곡선
}

export function startSound(id, volume) {
  const c = getCtx()
  if (!c) return false
  if (c.state !== 'running') c.resume().catch(() => {})
  if (voices.has(id)) return true
  const def = SOUNDS.find((s) => s.id === id)
  if (!def) return false

  if (!buffers.has(id)) buffers.set(id, makeLoopBuffer(c, def.seconds, def.fill))

  const src = c.createBufferSource()
  src.buffer = buffers.get(id)
  src.loop = true
  const [first, last] = def.chain(c)
  const gain = c.createGain()
  gain.gain.value = 0
  src.connect(first)
  last.connect(gain).connect(c.destination)
  src.start()
  gain.gain.setTargetAtTime(volumeCurve(volume) * def.gain, c.currentTime, 0.25)
  voices.set(id, { src, gain, def })
  return true
}

export function stopSound(id) {
  const c = getCtx()
  const v = voices.get(id)
  if (!c || !v) return
  voices.delete(id)
  v.gain.gain.cancelScheduledValues(c.currentTime)
  v.gain.gain.setTargetAtTime(0, c.currentTime, 0.15)
  v.src.stop(c.currentTime + 0.8)
}

export function setSoundVolume(id, volume) {
  const c = getCtx()
  const v = voices.get(id)
  if (!c || !v) return
  v.gain.gain.setTargetAtTime(volumeCurve(volume) * v.def.gain, c.currentTime, 0.05)
}
