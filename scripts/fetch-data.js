import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 載入本地 .env 檔案（如果存在的話）
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        const value = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    });
    console.log('載入本地 .env 設定檔成功');
  }
}

loadEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GEMINI_API_KEY) {
  console.warn('警告: 未偵測到 GEMINI_API_KEY 環境變數。將跳過 AI 翻譯步驟，使用預設文字。');
}

// 輔助函式：計算 N 天前的 YYYY-MM-DD 日期字串
function getDateStringAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// 輔助函式：延遲時間
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. 抓取 GitHub 熱門專案
async function fetchTopGithubProjects(query) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=12`;
  
  const headers = {
    'User-Agent': 'github-popular-timeline-app',
    'Accept': 'application/vnd.github+json'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    console.log(`使用 GitHub Token 進行 API 請求 (查詢條件: ${query})`);
  } else {
    console.log(`未使用 Token 進行 GitHub API 請求 (查詢條件: ${query})，可能會面臨 API 限流。`);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub API 請求失敗 (狀態碼 ${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.items || [];
}

// 2. 使用 Gemini API 批次翻譯與精煉專案內容
async function translateAndSummarizeBatch(repos, apiKey, targetLanguageName, modelName = 'gemini-3.1-flash-lite') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const projectListStr = repos.map((repo, idx) => `
專案 ${idx + 1}:
- Name: ${repo.name}
- Owner: ${repo.owner?.login || 'unknown'}
- Language: ${repo.language || 'unknown'}
- Description: ${repo.description || 'no description'}
`).join('\n---\n');

  const prompt = `You are a professional open-source project advocate and software engineer.
Analyze the following 12 GitHub projects and describe their features and applications in ${targetLanguageName}.

${projectListStr}

For these 12 projects, return a JSON array containing exactly 12 elements. Each element must correspond to a project and contain these fields:
1. "translatedName": The project's title in ${targetLanguageName} (If it's a well-known brand/name, you can keep the original English name or append a translation note, e.g., 'Vite (前端快速建置工具)' or 'Vite (Fast frontend build tool)').
2. "features": 2-3 natural sentences in ${targetLanguageName} introducing the project's core functionality and key features.
3. "applications": 1-2 natural sentences in ${targetLanguageName} explaining practical use cases, what problems it solves, or who should use it.

Ensure the returned structure strictly matches the specified JSON Schema.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            translatedName: { type: "STRING" },
            features: { type: "STRING" },
            applications: { type: "STRING" }
          },
          required: ["translatedName", "features", "applications"]
        }
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API 請求失敗: ${errText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("Gemini 回傳結構不正確");
  }

  return JSON.parse(textResponse.trim());
}

// 3. 具備自動重試、指數退避與多模型備援功能的批次翻譯包裝器
async function translateAndSummarizeBatchWithRetry(repos, apiKey, targetLanguageName, retries = 3, delay = 10000) {
  const models = ['gemini-3.1-flash-lite', 'gemini-2.5-flash'];
  
  for (const model of models) {
    console.log(`  -> 嘗試使用 AI 模型: ${model}`);
    let currentDelay = delay;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await translateAndSummarizeBatch(repos, apiKey, targetLanguageName, model);
      } catch (error) {
        const errorMsg = error.message;
        const isDailyQuotaExceeded = errorMsg.includes('GenerateRequestsPerDay') || 
                                     errorMsg.includes('PerDay') || 
                                     errorMsg.includes('daily limit') ||
                                     errorMsg.includes('quotaId') ||
                                     (errorMsg.includes('429') && errorMsg.includes('requests'));
                                     
        if (isDailyQuotaExceeded) {
          console.warn(`    ❌ [每日額度用盡] 模型 ${model} 已達每日額度上限。準備切換至下一個備用模型...`);
          break; 
        }
        
        const isRateLimit = errorMsg.includes('429') || 
                            errorMsg.includes('RESOURCE_EXHAUSTED') || 
                            errorMsg.includes('503') || 
                            errorMsg.includes('UNAVAILABLE');
                            
        if (isRateLimit && i < retries - 1) {
          console.warn(`    ⚠️ [API 限流或繁忙] 批次翻譯失敗。將在 ${currentDelay / 1000} 秒後進行第 ${i + 1}/${retries} 次重試...`);
          await sleep(currentDelay);
          currentDelay *= 2; 
        } else {
          if (model === models[models.length - 1]) {
            throw error;
          } else {
            console.warn(`    ⚠️ [模型錯誤] 模型 ${model} 發生錯誤: ${error.message}。準備切換至下一個備用模型...`);
            break; 
          }
        }
      }
    }
  }
  throw new Error('所有可用的備用模型皆已嘗試，仍無法完成翻譯。');
}

// 主程式
async function main() {
  console.log('開始執行 GitHub 多國語言熱門專案資料更新任務...');
  
  const periods = [
    { key: 'week', query: `created:>=${getDateStringAgo(7)}`, label: '最近一週' },
    { key: 'month', query: `created:>=${getDateStringAgo(30)}`, label: '最近一個月' },
    { key: 'three_months', query: `created:>=${getDateStringAgo(90)}`, label: '最近三個月' },
    { key: 'year', query: `created:>=${getDateStringAgo(365)}`, label: '最近一年' },
    { key: 'audio_video', query: `created:>=${getDateStringAgo(90)} (audio OR video OR voice OR speech OR cloning)`, label: '影音與聲音 AI' }
  ];

  // 1. 先抓取 GitHub 熱門專案，確保各語言間數據完全同步
  const rawPeriodsData = {};
  for (const period of periods) {
    console.log(`\n--- 正在抓取「${period.label}」熱門專案 ---`);
    try {
      const rawRepos = await fetchTopGithubProjects(period.query);
      console.log(`成功獲取 ${rawRepos.length} 個專案`);
      rawPeriodsData[period.key] = rawRepos;
    } catch (err) {
      console.error(`處理「${period.label}」抓取時發生錯誤:`, err);
      rawPeriodsData[period.key] = [];
    }
    // 稍微延遲避免 GitHub API 限流
    await sleep(1000);
  }

  // 2. 初始化各語系結果結構
  const locales = [
    { code: 'zh-TW', name: 'Traditional Chinese (Taiwan, 繁體中文)' },
    { code: 'zh-CN', name: 'Simplified Chinese (简体中文)' },
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese (日本語)' },
    { code: 'ko', name: 'Korean (한국어)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' }
  ];

  const resultsByLocale = {};
  const timestamp = new Date().toISOString();
  
  locales.forEach(loc => {
    resultsByLocale[loc.code] = {
      lastUpdated: timestamp,
      periods: {}
    };
  });

  const legacyResultData = {
    lastUpdated: timestamp,
    periods: {}
  };

  // 3. 雙層迴圈翻譯所有時段的專案至各語系
  for (const period of periods) {
    const rawRepos = rawPeriodsData[period.key] || [];
    
    if (rawRepos.length === 0) {
      locales.forEach(loc => {
        resultsByLocale[loc.code].periods[period.key] = [];
      });
      legacyResultData.periods[period.key] = [];
      continue;
    }

    console.log(`\n--- 開始翻譯與整理時段: ${period.label} ---`);

    for (const locale of locales) {
      console.log(`  -> 正在翻譯至 [${locale.code}] ${locale.name} ...`);
      let translatedItems = [];

      if (GEMINI_API_KEY && rawRepos.length > 0) {
        try {
          translatedItems = await translateAndSummarizeBatchWithRetry(rawRepos, GEMINI_API_KEY, locale.name);
          console.log(`  -> [${locale.code}] 批次翻譯成功！`);
        } catch (aiError) {
          console.error(`  -> [${locale.code}] 批次翻譯失敗: ${aiError.message}。將使用預設內容。`);
        }
      }

      const processedRepos = [];
      for (let i = 0; i < rawRepos.length; i++) {
        const repo = rawRepos[i];
        
        let translatedName = repo.name;
        let features = repo.description || 'No description available.';
        let applications = 'Suitable for open-source research and development.';
        
        // 設定各語系的預設備援文字
        if (locale.code === 'zh-TW') {
          applications = '適用於開源軟體研究與開發。';
        } else if (locale.code === 'zh-CN') {
          applications = '适用于开源软件研究与开发。';
        } else if (locale.code === 'ja') {
          applications = 'オープンソースの研究開発に適しています。';
        } else if (locale.code === 'ko') {
          applications = '오픈소스 연구 및 개발에 적합합니다.';
        } else if (locale.code === 'fr') {
          applications = 'Convient pour la recherche et le développement open source.';
        } else if (locale.code === 'de') {
          applications = 'Geeignet für Open-Source-Forschung und -Entwicklung.';
        }

        if (translatedItems && translatedItems[i]) {
          translatedName = translatedItems[i].translatedName || translatedName;
          features = translatedItems[i].features || features;
          applications = translatedItems[i].applications || applications;
        }

        processedRepos.push({
          rank: i + 1,
          name: repo.name,
          full_name: repo.full_name,
          html_url: repo.html_url,
          description: repo.description,
          stargazers_count: repo.stargazers_count,
          language: repo.language,
          owner: {
            login: repo.owner?.login,
            avatar_url: repo.owner?.avatar_url
          },
          license: repo.license ? {
            name: repo.license.name,
            spdx_id: repo.license.spdx_id
          } : null,
          translatedName,
          features,
          applications
        });
      }

      resultsByLocale[locale.code].periods[period.key] = processedRepos;

      // 填充相容舊版格式（繁中，且包含 zhName 欄位）
      if (locale.code === 'zh-TW') {
        legacyResultData.periods[period.key] = processedRepos.map(r => ({
          ...r,
          zhName: r.translatedName
        }));
      }

      // 休息 6.5 秒，以符合每分鐘最高 15 次請求的 API 限流規則 (35 次請求需約 4 分鐘)
      console.log(`  -> 休息 6.5 秒中...`);
      await sleep(6500);
    }
  }

  // 4. 寫入輸出檔案
  const outputDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 寫入多個語系 JSON 檔案 (方案 B)
  locales.forEach(locale => {
    const outputPath = path.join(outputDir, `projects_${locale.code}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(resultsByLocale[locale.code], null, 2), 'utf8');
    console.log(`成功寫入語系檔 [${locale.code}]: ${outputPath}`);
  });

  // 寫入 legacy projects.json，確保相容性與防爆
  const legacyOutputPath = path.join(outputDir, 'projects.json');
  fs.writeFileSync(legacyOutputPath, JSON.stringify(legacyResultData, null, 2), 'utf8');
  console.log(`成功寫入相容主資料檔: ${legacyOutputPath}`);
}

main().catch(err => {
  console.error('任務執行失敗:', err);
  process.exit(1);
});
