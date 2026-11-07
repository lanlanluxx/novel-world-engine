'use strict'

/**
 * 记忆卡（零依赖）
 *
 * 不是聊天记录，是「她记得的几件事」。
 * 聊天记录会越堆越多，记忆卡只会留下有分量的那几条。
 *
 * 三类：
 *   topic      进行中的话题
 *   pending    想说但还没说的话（带过期时间）
 *   impression 对人的印象
 */

const fs = require('node:fs')

const CATEGORIES = ['topic', 'pending', 'impression']
const MAX_PER_CATEGORY = 12

function emptyStore() {
  return { topic: [], pending: [], impression: [] }
}

function load(file) {
  if (!fs.existsSync(file)) return emptyStore()
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
    const store = emptyStore()
    for (const c of CATEGORIES) if (Array.isArray(raw[c])) store[c] = raw[c]
    return store
  } catch {
    return emptyStore()
  }
}

function save(file, store) {
  fs.writeFileSync(file, JSON.stringify(store, null, 2), 'utf8')
  return file
}

function add(store, category, content, extra = {}) {
  if (!CATEGORIES.includes(category)) throw new Error(`未知类别: ${category}`)
  if (!content || !String(content).trim()) throw new Error('内容不能为空')
  const item = {
    content: String(content).trim(),
    at: extra.at || new Date().toISOString(),
    ...extra
  }
  store[category].unshift(item)
  store[category] = store[category].slice(0, MAX_PER_CATEGORY)
  return item
}

/** 清掉过期的「想说的话」 */
function prune(store, nowMs = Date.now()) {
  const before = store.pending.length
  store.pending = store.pending.filter(p => {
    if (!p.expiresAt) return true
    return Date.parse(p.expiresAt) > nowMs
  })
  return before - store.pending.length
}

/** 生成给模型的记忆摘要（短，进 prompt，不要长） */
function brief(store, opts = {}) {
  const lines = []
  const topic = store.topic[0]
  if (topic) lines.push(`在聊：${topic.content}`)
  const pending = store.pending[0]
  if (pending) lines.push(`想说没说：${pending.content}`)
  const imp = store.impression.slice(0, opts.impressions ?? 2)
  for (const i of imp) {
    const who = i.target ? `${i.target}：` : ''
    lines.push(`印象：${who}${i.content}`)
  }
  return lines.join('\n')
}

module.exports = { CATEGORIES, emptyStore, load, save, add, prune, brief }
