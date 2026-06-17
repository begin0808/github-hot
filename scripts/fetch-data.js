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

// 2. 使用 Gemini API 翻譯與精煉專案內容
async function translateAndSummarize(repo, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const prompt = `你是一個專業的開源專案技術推廣專家與軟體工程師。
請幫我分析以下 GitHub 開源專案，並使用繁體中文 (台灣，繁體中文) 介紹其功能與應用。

專案名稱: ${repo.name}
作者/組織: ${repo.owner?.login || '未知'}
主要程式語言: ${repo.language || '未知'}
原英文描述: ${repo.description || '無描述'}

請回傳一個符合 JSON 格式的物件，包含以下三個欄位：
1. "zhName": 專案的繁體中文說明名稱 (若為品牌或常用英文名，可保留英文或加上中文註記，例如 'Vite (前端快速建置工具)')。
2. "features": 2-3 句流暢的繁體中文，介紹此專案的核心功能與最關鍵特色。
3. "applications": 1-2 句流暢的繁體中文，介紹此專案的實際應用場景，適合解決什麼問題，或適合哪些開發者使用。

請確保只回傳標準的 JSON，不要包含 Markdown 格式的 \`\`\`json 標記。`;

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
        type: "OBJECT",
        properties: {
          zhName: { type: "STRING" },
          features: { type: "STRING" },
          applications: { type: "STRING" }
        },
        required: ["zhName", "features", "applications"]
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
      console.log(`成功獲取 ${rawRepos.length} 個專案，開始進行 AI 翻譯與摘要...`);

      const processedRepos = [];
      
      for (let i = 0; i < rawRepos.length; i++) {
        const repo = rawRepos[i];
        console.log(`[${i + 1}/12] 處理專案: ${repo.full_name}`);
        
        let zhName = repo.name;
        let features = repo.description || '無描述';
        let applications = '適用於開源軟體研究與開發。';

        if (GEMINI_API_KEY) {
          try {
            // 每秒只執行一個請求以避免極限 (Free Tier 限制 15 RPM)
            // 這裡抓取一個專案間隔 4 秒，30 個專案共花費約 2 分鐘，能穩定過關
            const aiResult = await translateAndSummarize(repo, GEMINI_API_KEY);
            zhName = aiResult.zhName;
            features = aiResult.features;
            applications = aiResult.applications;
            console.log(`    -> AI 翻譯完成: ${zhName}`);
          } catch (aiError) {
            console.error(`    -> AI 翻譯失敗: ${aiError.message}。使用預設內容。`);
          }
          await sleep(4000); 
        } else {
          // 沒有 API Key 時的基本處理，嘗試把原描述當成特徵
          zhName = `${repo.name} (未翻譯)`;
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
          zhName,
          features,
          applications
        });
      }

      resultData.periods[period.key] = processedRepos;
      
      // 每個時段間隔休息 5 秒
      await sleep(5000);

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
