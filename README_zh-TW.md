# 🚀 GitTrend.tw — GitHub 熱門開源專案時間線

[![Update Data](https://github.com/begin0808/github-hot/actions/workflows/update-data.yml/badge.svg)](https://github.com/begin0808/github-hot/actions/workflows/update-data.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | 繁體中文

> 每週六自動更新的 GitHub 熱門開源專案時間線，搭配 Gemini AI 產生繁體中文深度精煉介紹，讓你快速掌握開源世界最新趨勢。

---

## 📖 專案簡介

**GitTrend.tw** 是一個靜態網站，自動抓取 GitHub 上最近**一週、一個月、三個月、一年**內新建立，以及**影音與聲音 AI 專區**中獲得最多星星數的熱門開源專案，並透過 Google Gemini AI 將英文描述翻譯與精煉為**繁體中文**，結構化呈現每個專案的「核心功能與特色」以及「實際應用場景」。

網站每週六由 GitHub Actions 自動更新資料，讓你在週末有充裕的時間研究最新的熱門開源能量。

---

## ✨ 功能特色

| 功能 | 說明 |
| :--- | :--- |
| 🕐 **五段式時間與專區** | 包含「最近一週」「最近一個月」「最近三個月」「最近一年」與「影音與聲音 AI」五個分頁，一鍵切換瀏覽，每個時段收錄前 12 名最熱門的新開源專案 |
| 🤖 **Gemini AI 繁中精煉** | 使用 Google Gemini 3.5 Flash 將英文描述翻譯為自然流暢的繁體中文，包含「核心功能與特色」與「實際應用場景」 |
| ☀️/🌙 **雙主題流暢切換** | 支援深色與亮色雙主題，切換時具有柔和過渡動畫，且會使用 `localStorage` 自動記憶使用者偏好 |
| 🎨 **毛玻璃質感美學** | 採用 Glassmorphism 毛玻璃效果、自適應漸層發光動態背景，不論深色或亮色模式都具備極佳的視覺體驗 |
| 🏅 **排名徽章** | 金、銀、銅牌漸層標記前三名專案，後續專案整齊排版 |
| 📱 **響應式設計 (RWD)** | 完美支援手機、平板與桌機，分頁導覽按鈕在行動裝置上可流暢滑動且不壓縮變形 |
| ⚡ **極速載入** | 純靜態 JSON 資料驅動，無需即時 API 呼叫，毫秒級載入 |
| 🔄 **每週六自動更新** | GitHub Actions 定時任務，台灣時間每週六上午 08:00 自動抓取最新資料 |
| 💰 **完全免費** | GitHub API、Gemini API Free Tier、GitHub Actions、GitHub Pages 全部免費 |

---

## 📄 授權條款

本專案採用 [MIT License](LICENSE) 授權。
