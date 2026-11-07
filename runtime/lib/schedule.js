'use strict'

/**
 * 日程引擎（零依赖）
 *
 * 目标：让一个角色「有自己的日子」——不是等你上线才存在。
 *
 * 输入是一天的分段计划，输出是：现在她在做什么、这段从什么时候开始、
 * 下一段什么时候开始、今天还有哪些「该醒过来的时刻」（锚点）。
 */

const DAY_MIN = 24 * 60

function parseTime(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str).trim())
  if (!m) throw new Error(`时间格式不对: ${str}（应为 HH:MM）`)
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 24 || min > 59) throw new Error(`时间超出范围: ${str}`)
  return h * 60 + min
}

function formatTime(minutes) {
  const m = ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 把 07:00–07:30 这种段解析成 {start,end} */
function normalizeSegments(segments) {
  const out = []
  for (const seg of segments) {
    const start = parseTime(seg.start)
    let end = parseTime(seg.end)
    if (end <= start) end += DAY_MIN // 跨零点
    out.push({
      start,
      end,
      activity: seg.activity || '',
      place: seg.place || '',
      detail: seg.detail || '',
      outfit: seg.outfit || '',
      situation: seg.situation || '',
      props: Array.isArray(seg.props) ? seg.props : []
    })
  }
  out.sort((a, b) => a.start - b.start)
  return out
}

/** 某一分钟落在哪一段 */
function segmentAt(segments, minutes) {
  const m = ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN
  for (const seg of segments) {
    const s = seg.start
    const e = seg.end <= DAY_MIN ? seg.end : seg.end - DAY_MIN
    const hit = seg.end <= DAY_MIN
      ? (m >= s && m < seg.end)
      : (m >= s || m < e) // 跨零点
    if (hit) return seg
  }
  return null
}

/** 今天剩下的锚点（每段开始 + offsetMin） */
function anchorsToday(segments, minutes, offsetMin = 5) {
  const out = []
  for (const seg of segments) {
    const anchor = seg.start + offsetMin
    if (anchor > minutes && anchor < DAY_MIN) {
      out.push({ at: anchor, atText: formatTime(anchor), activity: seg.activity })
    }
  }
  return out.sort((a, b) => a.at - b.at)
}

/** 静默时段（默认 23:30–08:30 不打扰） */
function isQuiet(minutes, quiet = { start: '23:30', end: '08:30' }) {
  const s = parseTime(quiet.start)
  const e = parseTime(quiet.end)
  const m = ((minutes % DAY_MIN) + DAY_MIN) % DAY_MIN
  return s > e ? (m >= s || m < e) : (m >= s && m < e)
}

/** 现在这一刻的完整状态 */
function now(segments, atText, opts = {}) {
  const minutes = parseTime(atText)
  const seg = segmentAt(segments, minutes)
  const anchors = anchorsToday(segments, minutes, opts.offsetMin ?? 5)
  return {
    at: formatTime(minutes),
    minutes,
    segment: seg
      ? {
          from: formatTime(seg.start),
          to: formatTime(seg.end),
          activity: seg.activity,
          place: seg.place,
          detail: seg.detail,
          outfit: seg.outfit,
          situation: seg.situation,
          props: seg.props,
          runningForMin: seg.end <= DAY_MIN
            ? minutes - seg.start
            : (minutes >= seg.start ? minutes - seg.start : minutes + DAY_MIN - seg.start)
        }
      : null,
    next: anchors[0] || null,
    anchorsToday: anchors,
    quiet: isQuiet(minutes, opts.quiet),
    shouldWake: Boolean(seg) && !isQuiet(minutes, opts.quiet) && anchors.length > 0
  }
}

module.exports = {
  DAY_MIN,
  parseTime,
  formatTime,
  normalizeSegments,
  segmentAt,
  anchorsToday,
  isQuiet,
  now
}
