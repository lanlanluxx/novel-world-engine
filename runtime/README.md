# runtime —— 最小运行时

> 让角色「有自己的日子」的最小骨架。**零依赖，只需要 Node 18+。**

## 它做什么

```
日程  →  现在她在干什么、这段从什么时候开始
锚点  →  今天还有哪些「可以开口」的时刻
静默  →  几点之后不该再打扰
记忆  →  她记得的那几条（不是聊天记录）
```

**它不做什么**：不接 QQ、不接任何 IM、不调模型、不出图。这些交给 `adapters/`。

## 跑起来

```bash
node runtime/tick.js                # 用内置示例 + 当前时间
node runtime/tick.js --at 22:15     # 指定时刻
node runtime/tick.js --at 23:45     # 看静默时段
node runtime/tick.js --json         # 只输出 JSON，方便接别的东西
```

输出示例：

```
—— 22:15 ——
她正在：台灯下背单词（宿舍）
细节：二十个划过去，还剩两个记不住
已经过了 5 分钟
下一个可以开口的时刻：23:25（听磁带慢慢睡着）
现在开口：可以
```

## 用自己的日程

复制 `schedule.example.json`，改成分段计划：

```json
{
  "segments": [
    { "start": "07:00", "end": "07:30", "activity": "起床", "place": "宿舍" }
  ],
  "quiet": { "start": "23:30", "end": "07:30" },
  "anchorOffsetMin": 5
}
```

```bash
node runtime/tick.js --schedule 我的日程.json --at 08:10
```

## 带记忆卡

```bash
node runtime/tick.js --memory memory.json --at 21:05
```

`memory.json` 结构：

```json
{
  "topic": [{ "content": "在聊下周的模拟法庭" }],
  "pending": [{ "content": "想问她脚还冷不冷", "expiresAt": "2026-11-08T02:00:00Z" }],
  "impression": [{ "target": "阿叙", "content": "嘴硬，但记得别人说过的话" }]
}
```

## 测试

```bash
node runtime/test.js
```

**14 项，覆盖：时间解析、跨零点分段、锚点、静默时段、记忆增删与坏文件容错。**

## 接口

| 函数 | 用途 |
| --- | --- |
| `schedule.now(segments, '22:15')` | 一次拿到：当前段、下一锚点、是否静默、能否开口 |
| `schedule.anchorsToday(segments, minutes)` | 今天剩余锚点 |
| `memory.add / prune / brief` | 记忆卡的增删与摘要 |

## 为什么先做这三样

因为「她有自己的日子」= **日程 + 记忆 + 知道什么时候不该出声**。

这三样齐了，剩下的（说话、出图）只是接口问题。
