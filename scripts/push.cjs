#!/usr/bin/env node
/**
 * 每日热搜速览推送脚本
 * 抓取微博、知乎、百度、B站热搜并发送到 Discord
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 加载配置
const configPath = path.join(__dirname, '..', 'config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('❌ 配置文件加载失败:', e.message);
  console.error('请确保 config.json 存在且格式正确');
  process.exit(1);
}

// Discord 子区 ID
const THREAD_ID = config.discord.threadId;

// API Base URL
const API_BASE = config.api.baseUrl;
const API_TIMEOUT = config.api.timeout;

// 启用的平台
const enabledPlatforms = config.platforms.filter(p => p.enabled);

// HTTP GET 请求
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: API_TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 格式化微博热搜
function formatWeibo(data, maxTitleLen, itemsCount) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsCount).map((item, i) => {
    const hot = Math.floor(item.hot_value / 10000);
    return `**${i + 1}.** [${item.title}](${item.link}) \`${hot}万\``;
  });
}

// 格式化知乎热榜
function formatZhihu(data, maxTitleLen, itemsCount) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsCount).map((item, i) => {
    const title = item.title.length > maxTitleLen ? item.title.slice(0, maxTitleLen) + '...' : item.title;
    const hot = item.hot_value_desc?.replace('热度', '').trim() || '';
    return `**${i + 1}.** [${title}](${item.link}) \`${hot}\``;
  });
}

// 格式化百度热搜
function formatBaidu(data, maxTitleLen, itemsCount) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsCount).map((item, i) => {
    const hot = item.score_desc || '';
    return `**${i + 1}.** [${item.title}](${item.url}) \`${hot}\``;
  });
}

// 格式化B站热门
function formatBili(data, maxTitleLen, itemsCount) {
  if (!data?.data?.length) return [];
  return data.data.slice(0, itemsCount).map((item, i) => {
    const title = item.title.length > maxTitleLen ? item.title.slice(0, maxTitleLen) + '...' : item.title;
    return `**${i + 1}.** [${title}](${item.link})`;
  });
}

// 主函数
async function main() {
  console.log('🚀 开始获取热搜数据...\n');
  console.log(`📍 配置文件: ${configPath}`);
  console.log(`📍 Discord 子区: ${THREAD_ID}`);
  console.log(`📍 启用平台: ${enabledPlatforms.map(p => p.name).join(', ')}\n`);

  const date = new Date();
  const dateStr = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai'
  });

  const itemsPerPlatform = config.display.itemsPerPlatform;
  const maxTitleLen = config.display.maxTitleLength;
  const showDivider = config.display.showDivider;

  let message = `📅 **${dateStr}** 每日热搜速览\n\n`;

  for (const platform of enabledPlatforms) {
    console.log(`📡 获取 ${platform.name}...`);
    try {
      const url = `${API_BASE}/${platform.key}`;
      const data = await fetch(url);
      
      let lines = [];
      switch (platform.key) {
        case 'weibo':
          lines = formatWeibo(data, maxTitleLen, itemsPerPlatform);
          break;
        case 'zhihu':
          lines = formatZhihu(data, maxTitleLen, itemsPerPlatform);
          break;
        case 'baidu/hot':
          lines = formatBaidu(data, maxTitleLen, itemsPerPlatform);
          break;
        case 'bili':
          lines = formatBili(data, maxTitleLen, itemsPerPlatform);
          break;
      }

      if (lines.length > 0) {
        message += `**${platform.emoji} ${platform.name} TOP ${itemsPerPlatform}**\n`;
        message += lines.join('\n') + '\n';
        if (showDivider) {
          message += '\n';
        }
      } else {
        console.log(`⚠️ ${platform.name} 返回空数据`);
      }
    } catch (e) {
      console.error(`❌ ${platform.name} 获取失败:`, e.message);
      message += `**${platform.emoji} ${platform.name}**\n`;
      message += `⚠️ 暂时无法获取数据\n\n`;
    }
  }

  message = message.trimEnd() + '\n\n---\n_由 OpenClaw 自动推送_';

  console.log('\n📄 生成的消息:');
  console.log('─'.repeat(40));
  console.log(message);
  console.log('─'.repeat(40));

  // 输出到文件供 message tool 读取
  const outputPath = '/tmp/hot-topics-message.md';
  fs.writeFileSync(outputPath, message);
  console.log(`\n✅ 消息已保存到: ${outputPath}`);
  console.log(`📍 Discord 子区 ID: ${THREAD_ID}`);

  return { message, threadId: THREAD_ID };
}

main().catch(console.error);
