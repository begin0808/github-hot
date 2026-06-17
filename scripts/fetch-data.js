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

// 輔助函式：延遲時間，避免觸發 API 頻率限制
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1. 抓取 GitHub 熱門專案
async function fetchTopGithubProjects(daysAgo) {
  const dateStr = getDateStringAgo(daysAgo);
  const query = `created:>=${dateStr}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=12`;
  
  const headers = {
    'User-Agent': 'github-popular-timeline-app',
    'Accept': 'application/vnd.github+json'
  };
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    console.log(`使用 GitHub Token 進行 API 請求 (${daysAgo} 天內)`);
  } else {
    console.log(`未使用 Token 進行 GitHub API 請求 (${daysAgo} 天內)，可能會面臨 API 限流。`);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GitHub API 請求失敗 (狀態碼 ${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.items || [];
}

// 2. 使用 Gemini API 批次翻譯與精煉專案內容 (一次翻譯整個時段的 12 個專案，避免 API 限流並大幅提升速度)
async function translateAndSummarizeBatch(repos, apiKey, modelName = 'gemini-3.5-flash') {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const projectListStr = repos.map((repo, idx) => `
專案 ${idx + 1}:
- 專案名稱: ${repo.name}
- 作者/組織: ${repo.owner?.login || '未知'}
- 主要程式語言: ${repo.language || '未知'}
- 原英文描述: ${repo.description || '無描述'}
`).join('\n---\n');

  const prompt = `你是一個專業的開源專案技術推廣專家與軟體工程師。
請幫我分析以下 12 個 GitHub 開源專案，並使用繁體中文 (台灣，繁體中文) 介紹其功能與應用。

${projectListStr}

請針對這 12 個專案，回傳一個 JSON 陣列，陣列中必須包含 12 個元素，每個元素對應一個專案並包含以下欄位：
1. "zhName": 專案的繁體中文說明名稱 (若為品牌或常用英文名，可保留英文或加上中文註記，例如 'Vite (前端快速建置工具)')。
2. "features": 2-3 句流暢的繁體中文，介紹此專案的核心功能與最關鍵特色。
3. "applications": 1-2 句流暢的繁體中文，介紹此專案的實際應用場景，適合解決什麼問題，或適合哪些開發者使用。

請確保回傳結構符合指定的 JSON Schema 格式。`;

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
            zhName: { type: "STRING" },
            features: { type: "STRING" },
            applications: { type: "STRING" }
          },
          required: ["zhName", "features", "applications"]
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

// 3. 具備自動重試、指數退避與多模型備援（Fallback）功能的批次翻譯包裝器
async function translateAndSummarizeBatchWithRetry(repos, apiKey, retries = 3, delay = 10000) {
  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
  
  for (const model of models) {
    console.log(`  -> 嘗試使用 AI 模型: ${model}`);
    let currentDelay = delay;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await translateAndSummarizeBatch(repos, apiKey, model);
      } catch (error) {
        const errorMsg = error.message;
        const isDailyQuotaExceeded = errorMsg.includes('GenerateRequestsPerDay') || 
                                     errorMsg.includes('PerDay') || 
                                     errorMsg.includes('daily limit') ||
                                     errorMsg.includes('quotaId') ||
                                     (errorMsg.includes('429') && errorMsg.includes('requests'));
                                     
        if (isDailyQuotaExceeded) {
          console.warn(`    ❌ [每日額度用盡] 模型 ${model} 已達每日額度上限。準備切換至下一個備用模型...`);
          break; // 跳出當前模型的重試迴圈，進入外層的下一個模型
        }
        
        const isRateLimit = errorMsg.includes('429') || 
                            errorMsg.includes('RESOURCE_EXHAUSTED') || 
                            errorMsg.includes('503') || 
                            errorMsg.includes('UNAVAILABLE');
                            
        if (isRateLimit && i < retries - 1) {
          console.warn(`    ⚠️ [API 限流或繁忙] 批次翻譯失敗。將在 ${currentDelay / 1000} 秒後進行第 ${i + 1}/${retries} 次重試...`);
          await sleep(currentDelay);
          currentDelay *= 2; // 指數退避，每次等待加倍
        } else {
          // 如果是最後一次重試失敗，或者不是限流錯誤
          if (model === models[models.length - 1]) {
            // 如果是最後一個模型也失敗了，拋出錯誤
            throw error;
          } else {
            console.warn(`    ⚠️ [模型錯誤] 模型 ${model} 發生錯誤: ${error.message}。準備切換至下一個備用模型...`);
            break; // 跳到下一個模型
          }
        }
      }
    }
  }
  throw new Error('所有可用的備用模型（gemini-3.5-flash、gemini-3.1-flash-lite、gemini-2.5-flash）皆已嘗試，仍無法完成翻譯。');
}

// 主程式
async function main() {
  console.log('開始執行 GitHub 熱門專案資料更新任務...');
  
  const periods = [
    { key: 'week', days: 7, label: '最近一週' },
    { key: 'month', days: 30, label: '最近一個月' },
    { key: 'three_months', days: 90, label: '最近三個月' }
  ];

  const resultData = {
    lastUpdated: new Date().toISOString(),
    periods: {}
  };

  for (const period of periods) {
    console.log(`\n--- 正在抓取「${period.label}」熱門專案 ---`);
    try {
      const rawRepos = await fetchTopGithubProjects(period.days);
      console.log(`成功獲取 ${rawRepos.length} 個專案，開始進行批次 AI 翻譯與摘要...`);

      const processedRepos = [];
      
      let translatedItems = [];
      if (GEMINI_API_KEY && rawRepos.length > 0) {
        try {
          console.log(`  -> 正在發送批次 AI 翻譯請求 (共 ${rawRepos.length} 個專案)...`);
          translatedItems = await translateAndSummarizeBatchWithRetry(rawRepos, GEMINI_API_KEY);
          console.log(`  -> 批次 AI 翻譯完成！`);
        } catch (aiError) {
          console.error(`  -> 批次 AI 翻譯失敗: ${aiError.message}。此時段專案將使用預設內容。`);
        }
      }

      for (let i = 0; i < rawRepos.length; i++) {
        const repo = rawRepos[i];
        
        let zhName = repo.name;
        let features = repo.description || '無描述';
        let applications = '適用於開源軟體研究與開發。';

        // 如果成功取得批次翻譯對應的結果
        if (translatedItems && translatedItems[i]) {
          zhName = translatedItems[i].zhName || zhName;
          features = translatedItems[i].features || features;
          applications = translatedItems[i].applications || applications;
        } else if (GEMINI_API_KEY) {
          zhName = `${repo.name} (未翻譯)`;
        } else {
          zhName = `${repo.name} (未翻譯)`;
        }

        console.log(`[${i + 1}/${rawRepos.length}] 整理專案資料: ${repo.full_name} (${zhName})`);

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
          zhName,
          features,
          applications
        });
      }

      resultData.periods[period.key] = processedRepos;
      
      // 每個時段間隔休息 3 秒 (因為是批次處理，不用等太久)
      await sleep(3000);

    } catch (error) {
      console.error(`處理「${period.label}」時發生錯誤:`, error);
      resultData.periods[period.key] = [];
    }
  }

  // 寫入檔案
  const outputDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'projects.json');
  fs.writeFileSync(outputPath, JSON.stringify(resultData, null, 2), 'utf8');
  console.log(`\n任務成功完成！資料已寫入至: ${outputPath}`);
}

main().catch(err => {
  console.error('任務執行失敗:', err);
  process.exit(1);
});
