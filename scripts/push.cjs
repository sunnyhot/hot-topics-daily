#!/usr/bin/env node
/**
 * 每日热搜速览推送脚本 v2.0
 * 抓取微博、知乎、百度、B站、抖音热搜并发送到 Discord
 * 修复：直接输出到 stdout，由 cron agent 调用 message tool 发送
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 加载配置
const configPath = path.join(__dirname, '..', 'config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('❌ 配置文件加载失败:', e.message);
  process.exit(1);
}

const API_BASE = config.api.baseUrl;
const API_TIMEOUT = config.api.timeout || 10000;
const enabledPlatforms = config.platforms.filter(p => p.enabled);
const itemsPerPlatform = config.display?.itemsPerPlatform || 5;
const maxTitleLen = config.display?.maxTitleLength || 40;

// HTTP GET（支持 https 和 http）
function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: API_TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 100)}`)); }
      });
    }).on('error', reject)
      .on('timeout', () => { reject(new Error('timeout')); });
  });
}

// 格式化各平台
function formatWeibo(data) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsPerPlatform).map((item, i) => {
    const hot = item.hot_value >= 10000 ? `${(item.hot_value / 10000).toFixed(0)}万` : `${item.hot_value}`;
    return `**${i + 1}.** [${item.title}](${item.link}) \`${hot}\``;
  });
}

function formatZhihu(data) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsPerPlatform).map((item, i) => {
    const title = item.title.length > maxTitleLen ? item.title.slice(0, maxTitleLen) + '...' : item.title;
    const hot = item.hot_value_desc || '';
    return `**${i + 1}.** [${title}](${item.link}) \`${hot}\``;
  });
}

function formatBaidu(data) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsPerPlatform).map((item, i) => {
    const hot = item.score_desc || '';
    return `**${i + 1}.** [${item.title}](${item.url}) \`${hot}\``;
  });
}

function formatBili(data) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsPerPlatform).map((item, i) => {
    const title = item.title.length > maxTitleLen ? item.title.slice(0, maxTitleLen) + '...' : item.title;
    return `**${i + 1}.** [${title}](${item.link})`;
  });
}

function formatDouyin(data) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsPerPlatform).map((item, i) => {
    const title = (item.title || item.word || '').slice(0, maxTitleLen);
    const hot = item.hot_value ? `${(item.hot_value / 10000).toFixed(0)}万` : '';
    const link = item.link ? `[${title}](${item.link})` : title;
    return `**${i + 1}.** ${link}${hot ? ` \`${hot}\`` : ''}`;
  });
}

function formatToutiao(data) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsPerPlatform).map((item, i) => {
    const title = (item.title || '').slice(0, maxTitleLen);
    const link = item.link ? `[${title}](${item.link})` : title;
    return `**${i + 1}.** ${link}`;
  });
}

const formatters = {
  'weibo': formatWeibo,
  'zhihu': formatZhihu,
  'baidu/hot': formatBaidu,
  'bili': formatBili,
  'douyin': formatDouyin,
  'toutiao': formatToutiao,
};

async function main() {
  console.error('🚀 开始获取热搜数据...');
  console.error(`📍 启用平台: ${enabledPlatforms.map(p => p.name).join(', ')}`);

  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'long',
    timeZone: 'Asia/Shanghai'
  });

  let message = `📅 **${dateStr}** 每日热搜速览\n\n`;
  let successCount = 0;
  let failCount = 0;

  for (const platform of enabledPlatforms) {
    console.error(`📡 ${platform.name}...`);
    try {
      const url = `${API_BASE}/${platform.key}`;
      const data = await fetch(url);
      const formatter = formatters[platform.key];
      const lines = formatter ? formatter(data) : [];

      if (lines.length > 0) {
        message += `**${platform.emoji} ${platform.name} TOP ${lines.length}**\n`;
        message += lines.join('\n') + '\n\n';
        successCount++;
      } else {
        console.error(`⚠️ ${platform.name} 返回空数据`);
        failCount++;
      }
    } catch (e) {
      console.error(`❌ ${platform.name} 失败: ${e.message}`);
      failCount++;
      // 静默跳过失败平台，不污染输出
    }
  }

  message = message.trimEnd();
  message += `\n\n---\n_共 ${successCount} 个平台${failCount > 0 ? `，${failCount} 个获取失败` : ''} · OpenClaw 自动推送_`;

  // Discord 2000 字符限制，自动拆分
  const MAX_LEN = 1900;
  const parts = [];
  if (message.length <= MAX_LEN) {
    parts.push(message);
  } else {
    // 按平台段落拆分
    let current = '';
    const lines = message.split('\n');
    for (const line of lines) {
      if ((current + '\n' + line).length > MAX_LEN && current.length > 0) {
        parts.push(current.trimEnd());
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }
    if (current.trimEnd()) parts.push(current.trimEnd());
    // 加续接标记
    if (parts.length > 1) {
      parts[0] += '\n\n*(continued)*';
      for (let j = 1; j < parts.length; j++) {
        parts[j] = '*(continued from previous)*\n\n' + parts[j];
      }
    }
  }

  // stdout 输出最终消息（供 agent 读取）
  // 如果只有一条，直接输出
  if (parts.length === 1) {
    console.log(parts[0]);
  } else {
    // 多条消息用特殊标记分隔，供 agent 逐条发送
    for (let j = 0; j < parts.length; j++) {
      console.log(`--- PART ${j + 1}/${parts.length} ---`);
      console.log(parts[j]);
    }
  }

  // 同时保存到文件备份
  const outputPath = '/tmp/hot-topics-message.md';
  fs.writeFileSync(outputPath, parts.join('\n\n'));
  console.error(`\n✅ 完成: ${successCount} 成功, ${failCount} 失败`);
  if (parts.length > 1) console.error(`📍 消息拆分为 ${parts.length} 部分`);
  console.error(`📍 备份: ${outputPath}`);
}

main().catch(e => {
  console.error('❌ 脚本异常:', e.message);
  process.exit(1);
});
