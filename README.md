# 🚀 GitTrend.tw — GitHub 熱門開源專案時間線

[![Update Data](https://github.com/begin0808/github-hot/actions/workflows/update-data.yml/badge.svg)](https://github.com/begin0808/github-hot/actions/workflows/update-data.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> 每週六自動更新的 GitHub 熱門開源專案時間線，搭配 Gemini AI 產生繁體中文深度精煉介紹，讓你快速掌握開源世界最新趨勢。

---

## 📖 專案簡介

**GitTrend.tw** 是一個靜態網站，自動抓取 GitHub 上最近**一週、一個月、三個月**內新建立且獲得最多星星數的開源專案，並透過 Google Gemini AI 將英文描述翻譯與精煉為**繁體中文**，結構化呈現每個專案的「核心功能與特色」以及「實際應用場景」。

網站每週六由 GitHub Actions 自動更新資料，讓你在週末有充裕的時間研究最新的熱門開源能量。

---

## ✨ 功能特色

| 功能 | 說明 |
| :--- | :--- |
| 🕐 **三段式時間線** | 分為「最近一週」「最近一個月」「最近三個月」三個時段，一鍵切換瀏覽 |
| 🤖 **Gemini AI 繁中精煉** | 使用 Google Gemini 1.5 Flash 將英文描述翻譯為自然流暢的繁體中文，包含「核心功能」與「應用場景」 |
| 🌙 **深色模式科技風** | 採用 Glassmorphism 毛玻璃效果、漸層發光動態背景，視覺體驗極佳 |
| 🏅 **排名徽章** | 金、銀、銅牌漸層標記前三名專案 |
| 📱 **響應式設計 (RWD)** | 完美支援手機、平板與桌機等各種裝置 |
| ⚡ **極速載入** | 純靜態 JSON 資料驅動，無需即時 API 呼叫，毫秒級載入 |
| 🔄 **每週六自動更新** | GitHub Actions 定時任務，台灣時間每週六上午 08:00 自動抓取最新資料 |
| 💰 **完全免費** | GitHub API、Gemini API Free Tier、GitHub Actions、GitHub Pages 全部免費 |

---

## 🛠️ 技術架構

```
GitHub Actions (每週六 Cron)
    ├── GitHub Search API → 抓取熱門新專案
    ├── Gemini 1.5 Flash API → 繁中翻譯與精煉
    └── 輸出 projects.json → 靜態資料檔

前端網頁 (Vite + Vanilla JS/CSS)
    ├── 載入 projects.json
    ├── 動態渲染專案卡片
    └── Tab 切換三個時段
```

---

## 📂 目錄結構

```
github-hot/
├── .github/workflows/
│   └── update-data.yml      # GitHub Actions 每週六定時任務
├── scripts/
│   └── fetch-data.js        # 資料獲取與 AI 翻譯腳本
├── src/
│   ├── css/style.css         # 設計系統與 UI 樣式
│   ├── data/projects.json    # 自動生成的專案資料
│   └── js/main.js            # 前端渲染與互動邏輯
├── index.html                # 主網頁
├── package.json              # 專案設定
└── vite.config.js            # Vite 建置設定
```

---

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 抓取最新資料（需設定 Gemini API Key）
```bash
# 建立 .env 檔案
echo "GEMINI_API_KEY=你的金鑰" > .env

# 執行抓取與翻譯
npm run fetch
```

### 3. 本地開發預覽
```bash
npm run dev
```
瀏覽器開啟 `http://localhost:3000` 即可預覽。

### 4. 生產環境打包
```bash
npm run build
```

---

## ⚙️ GitHub Actions 自動化設定

1. 到 GitHub Repository → **Settings** → **Secrets and variables** → **Actions**
2. 新增 Secret：`GEMINI_API_KEY`（填入你的 Gemini API Key）
3. 每週六台灣時間 08:00 會自動執行資料更新並 Commit 回 Repository

---

## 📄 License

本專案採用 [MIT License](LICENSE) 授權。
