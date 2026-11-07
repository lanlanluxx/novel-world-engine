#!/usr/bin/env node
'use strict'

/**
 * tick.js —— 最小运行时
 *
 * 只看三件事：
 *   1. 现在她在干什么（日程）
 *   2. 她记得什么（记忆卡）
 *   3. 现在该不该「醒过来」说一句话（锚点 + 静默时段）
 *
 * 用法：
 *   node runtime/tick.js                       # 用内置示例、当前时间
 *   node runtime/tick.js --at 22:15           # 指定时刻
 *   node runtime/tick.js --schedule my.json   # 用自己的日程
 *   node runtime/tick.js --memory mem.json    # 带记忆卡
 *   node runtime/tick.js --json               # 只输出 JSON
 */

const fs = require('node:fs')
const path = require('node:path')
const schedule = require('./lib/schedule')
const memory = require('./lib/memory')

function argOf(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const flag = name => process.argv.includes(`--${name}`)

function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function main() {
  const root = path.resolve(__dirname)
  const scheduleFile = argOf('schedule', path.join(root, 'schedule.example.json'))
  const memoryFile = argOf('memory', '')
  const at = argOf('at', nowHHMM())

  const data = JSON.parse(fs.readFileSync(scheduleFile, 'utf8'))
  const segments = schedule.normalizeSegments(data.segments || [])
  const state = schedule.now(segments, at, {
    quiet: data.quiet,
    offsetMin: data.anchorOffsetMin
  })

  const store = memoryFile ? memory.load(memoryFile) : memory.emptyStore()
  if (memoryFile) memory.prune(store)

  const result = {
    at: state.at,
    activity: state.segment ? state.segment.activity : null,
    place: state.segment ? state.segment.place : null,
    detail: state.segment ? state.segment.detail : null,
    runningForMin: state.segment ? state.segment.runningForMin : null,
    nextAnchor: state.next,
    quiet: state.quiet,
    shouldWake: state.shouldWake,
    memoryBrief: memory.brief(store)
  }

  if (flag('json')) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(`—— ${result.at} ——`)
  if (result.activity) {
    console.log(`她正在：${result.activity}（${result.place}）`)
    if (result.detail) console.log(`细节：${result.detail}`)
    console.log(`已经过了 ${result.runningForMin} 分钟`)
  } else {
    console.log('这段时间没有安排（空档）')
  }
  console.log(result.quiet ? '静默时段：不打扰' : (result.nextAnchor
    ? `下一个可以开口的时刻：${result.nextAnchor.atText}（${result.nextAnchor.activity}）`
    : '今天没有剩下的锚点'))
  console.log(`现在开口：${result.shouldWake ? '可以' : '不建议'}`)
  if (result.memoryBrief) {
    console.log('')
    console.log('她记得：')
    console.log(result.memoryBrief)
  }
}

main()
