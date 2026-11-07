#!/usr/bin/env node
'use strict'

/**
 * 极小测试：不用框架，跑一遍看有没有坏。
 *   node runtime/test.js
 */

const assert = require('node:assert')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const schedule = require('./lib/schedule')
const memory = require('./lib/memory')

let passed = 0
function t(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (err) {
    console.error(`  ✗ ${name}`)
    throw err
  }
}

console.log('schedule')

t('parseTime 正常', () => {
  assert.strictEqual(schedule.parseTime('07:30'), 450)
  assert.strictEqual(schedule.parseTime('00:00'), 0)
})

t('parseTime 拒绝非法', () => {
  assert.throws(() => schedule.parseTime('25:00'))
  assert.throws(() => schedule.parseTime('7点'))
})

t('formatTime 回环', () => {
  assert.strictEqual(schedule.formatTime(450), '07:30')
  assert.strictEqual(schedule.formatTime(1500), '01:00')
})

const segs = schedule.normalizeSegments([
  { start: '07:00', end: '08:00', activity: '起床' },
  { start: '23:30', end: '00:30', activity: '失眠' }
])

t('segmentAt 命中普通段', () => {
  assert.strictEqual(schedule.segmentAt(segs, 7 * 60 + 30).activity, '起床')
})

t('segmentAt 命中跨零点段', () => {
  assert.strictEqual(schedule.segmentAt(segs, 23 * 60 + 50).activity, '失眠')
  assert.strictEqual(schedule.segmentAt(segs, 10).activity, '失眠')
})

t('anchorsToday 只看未来', () => {
  const a = schedule.anchorsToday(segs, 7 * 60 + 10)
  assert.strictEqual(a.length, 1)
  assert.strictEqual(a[0].atText, '23:35')
})

t('isQuiet 跨零点', () => {
  assert.strictEqual(schedule.isQuiet(23 * 60 + 40, { start: '23:30', end: '07:30' }), true)
  assert.strictEqual(schedule.isQuiet(6 * 60, { start: '23:30', end: '07:30' }), true)
  assert.strictEqual(schedule.isQuiet(12 * 60, { start: '23:30', end: '07:30' }), false)
})

t('now 给出完整体检', () => {
  const s = schedule.now(segs, '07:30', { quiet: { start: '23:30', end: '07:00' } })
  assert.strictEqual(s.segment.activity, '起床')
  assert.strictEqual(s.segment.runningForMin, 30)
  assert.strictEqual(s.quiet, false)
  assert.strictEqual(s.shouldWake, true)
})

t('now 在静默时段不建议开口', () => {
  const s = schedule.now(segs, '23:40', { quiet: { start: '23:30', end: '07:30' } })
  assert.strictEqual(s.quiet, true)
  assert.strictEqual(s.shouldWake, false)
})

console.log('memory')

t('add 与 brief', () => {
  const store = memory.emptyStore()
  memory.add(store, 'topic', '在聊下周的模拟法庭')
  memory.add(store, 'impression', '嘴硬，但记得别人说过的话', { target: '阿叙' })
  const b = memory.brief(store)
  assert.ok(b.includes('模拟法庭'))
  assert.ok(b.includes('阿叙'))
})

t('add 拒绝空内容', () => {
  const store = memory.emptyStore()
  assert.throws(() => memory.add(store, 'topic', '  '))
})

t('prune 清掉过期', () => {
  const store = memory.emptyStore()
  memory.add(store, 'pending', '想问她脚还冷不冷', { expiresAt: new Date(Date.now() - 1000).toISOString() })
  memory.add(store, 'pending', '想问她明天几点起', { expiresAt: new Date(Date.now() + 3600e3).toISOString() })
  assert.strictEqual(memory.prune(store), 1)
  assert.strictEqual(store.pending.length, 1)
})

t('save / load 往返', () => {
  const file = path.join(os.tmpdir(), `nwe-mem-${process.pid}.json`)
  const store = memory.emptyStore()
  memory.add(store, 'topic', '测试')
  memory.save(file, store)
  const back = memory.load(file)
  assert.strictEqual(back.topic[0].content, '测试')
  fs.unlinkSync(file)
})

t('load 遇到坏文件不炸', () => {
  const file = path.join(os.tmpdir(), `nwe-bad-${process.pid}.json`)
  fs.writeFileSync(file, '{ 不是 json', 'utf8')
  const back = memory.load(file)
  assert.deepStrictEqual(back.topic, [])
  fs.unlinkSync(file)
})

console.log(`\n全部通过（${passed} 项）`)
