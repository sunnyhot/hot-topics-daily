---
name: hot-topics-daily
description: 每日热搜速览推送 - 自动抓取微博、知乎、百度、B站等平台热搜并发送到 Discord。Use when users want to schedule daily hot topics push, or ask about trending topics on Chinese social media platforms.
version: 1.1.0
author: sunnyhot
---

# 每日热搜速览推送

自动抓取国内主流平台热搜，定时推送到 Discord。

---

## 📦 快速安装

### 1️⃣ 验证技能文件

```bash
# 检查文件是否存在
ls -la ~/.openclaw/workspace/skills/hot-topics-daily/

# 应该看到：
# SKILL.md  config.json  scripts/push.cjs
```

### 2️⃣ 配置 Discord 子区

编辑 `config.json`，修改 `threadId` 为你的 Discord 子区 ID：

```json
{
  "discord": {
    "threadId": "你的子区ID"
  }
}
```

**如何获取子区 ID？**
1. 在 Discord 中，右键点击子区名称
2. 选择「复制链接」
3. 链接格式：`https://discord.com/channels/xxx/xxx/子区ID`

### 3️⃣ 测试推送

```bash
node ~/.openclaw/workspace/skills/hot-topics-daily/scripts/push.cjs
```

看到 `✅ 消息已保存到` 表示成功。

### 4️⃣ 配置定时任务（可选）

```bash
# 添加 cron job（每天 8:30 推送）
openclaw cron add \
  --name "hot-topics-daily" \
  --schedule "30 8 * * *" \
  --command "node ~/.openclaw/workspace/skills/hot-topics-daily/scripts/push.cjs"

# 查看任务状态
openclaw cron list | grep hot-topics
```

---

## ⚙️ 配置说明

### 完整配置文件 (`config.json`)

```json
{
  "discord": {
    "threadId": "1482246566055120898"
  },
  "api": {
    "baseUrl": "https://60s.viki.moe/v2",
    "timeout": 10000
  },
  "platforms": [
    { "name": "微博热搜", "key": "weibo", "emoji": "🔥", "enabled": true },
    { "name": "知乎热榜", "key": "zhihu", "emoji": "💡", "enabled": true },
    { "name": "百度热搜", "key": "baidu/hot", "emoji": "🔍", "enabled": true },
    { "name": "B站热门", "key": "bili", "emoji": "📺", "enabled": true }
  ],
  "display": {
    "itemsPerPlatform": 5,
    "maxTitleLength": 40,
    "showDivider": true
  }
}
```

### 配置项说明

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `discord.threadId` | Discord 子区 ID | - |
| `api.baseUrl` | 热搜 API 地址 | `https://60s.viki.moe/v2` |
| `api.timeout` | API 超时时间（毫秒） | `10000` |
| `platforms[].enabled` | 是否启用该平台 | `true` |
| `display.itemsPerPlatform` | 每个平台显示条数 | `5` |
| `display.maxTitleLength` | 标题最大长度 | `40` |
| `display.showDivider` | 平台间显示分隔线 | `true` |

### 启用/禁用平台

修改 `platforms` 数组中的 `enabled` 字段：

```json
{
  "platforms": [
    { "name": "微博热搜", "key": "weibo", "emoji": "🔥", "enabled": true },
    { "name": "知乎热榜", "key": "zhihu", "emoji": "💡", "enabled": false }
  ]
}
```

---

## 🎯 使用方法

### 手动推送

```bash
node ~/.openclaw/workspace/skills/hot-topics-daily/scripts/push.cjs
```

### 定时推送（Cron）

已配置的定时任务：
- **Cron ID**: `5498e5c4-b707-4524-b8f6-d39f964ef777`
- **时间**: 每天 08:30（北京时间）
- **推送位置**: Discord 子区 `1482246566055120898`

查看/修改定时任务：
```bash
# 查看任务状态
openclaw cron list | grep hot-topics

# 手动触发一次
openclaw cron run 5498e5c4-b707-4524-b8f6-d39f964ef777

# 修改推送时间（改为 9:00）
openclaw cron update 5498e5c4-b707-4524-b8f6-d39f964ef777 --schedule "0 9 * * *"
```

---

## 📋 推送格式

```
📅 **YYYY-MM-DD HH:MM** 每日热搜速览

**🔥 微博热搜 TOP 5**
**1.** [话题标题](链接) `1234万`
**2.** [话题标题](链接) `567万`
...

**💡 知乎热榜 TOP 5**
**1.** [问题标题](链接) `1234 万`
...

---

_由 OpenClaw 自动推送_
```

---

## 🔧 故障排查

### 问题：配置文件加载失败

**错误信息**：`❌ 配置文件加载失败`

**解决方案**：
1. 检查 `config.json` 是否存在
2. 验证 JSON 格式是否正确（使用 [JSONLint](https://jsonlint.com/)）
3. 确保文件有读取权限

### 问题：热搜数据获取失败

**错误信息**：`❌ 微博热搜 获取失败`

**可能原因**：
- API 服务暂时不可用
- 网络连接问题
- API 超时

**解决方案**：
1. 稍后重试
2. 检查网络连接
3. 增加 `api.timeout` 值

### 问题：Discord 推送失败

**可能原因**：
- 子区 ID 错误
- Bot 没有发送权限
- 消息超过 2000 字符限制

**解决方案**：
1. 验证 `discord.threadId` 是否正确
2. 检查 Bot 在该子区的权限
3. 减少 `display.itemsPerPlatform` 值

---

## 📁 文件结构

```
skills/hot-topics-daily/
├── SKILL.md           # 技能说明（本文件）
├── config.json        # 配置文件
└── scripts/
    └── push.cjs       # 推送脚本
```

---

## 🌐 API 来源

使用 [60s.viki.moe](https://60s.viki.moe) 提供的免费热搜 API。

### 支持的平台

| 平台 | API 端点 | 有热度 |
|------|----------|--------|
| 微博 | `/v2/weibo` | ✅ |
| 知乎 | `/v2/zhihu` | ✅ |
| 百度 | `/v2/baidu/hot` | ✅ |
| B站 | `/v2/bili` | ❌ |
| 抖音 | `/v2/douyin` | ✅ |
| 今日头条 | `/v2/toutiao` | ✅ |

---

## 📦 依赖

- Node.js >= 18
- 无需安装额外依赖（使用内置 `https` 和 `fs`）

---

## 📝 更新日志

### v1.1.0 (2026-03-18)
- ✨ 新增配置文件 `config.json`
- ✨ 支持启用/禁用平台
- ✨ 支持自定义显示条数和标题长度
- 📝 优化安装文档，添加故障排查
- 🔧 简化配置流程

### v1.0.0 (2026-03-13)
- 初始版本
- 支持微博、知乎、百度、B站热搜
- Discord 定时推送
