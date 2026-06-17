(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=null,t=`week`;function n(e){return e==null?``:String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#039;`)}function r(e){if(!e)return`#`;try{return new URL(e).protocol===`https:`?e:`#`}catch{return`#`}}var i=document.getElementById(`loading`),a=document.getElementById(`projects-grid`),o=document.getElementById(`last-updated`),s=document.querySelectorAll(`.tab-btn`);function c(e){return e>=1e3?(e/1e3).toFixed(1)+`k`:e.toString()}function l(e){if(!e)return`未知`;let t=new Date(e);return`最後更新：${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,`0`)}-${String(t.getDate()).padStart(2,`0`)} ${String(t.getHours()).padStart(2,`0`)}:${String(t.getMinutes()).padStart(2,`0`)}`}function u(t){if(!e||!e.periods||!e.periods[t]){d(`無法讀取該時段的開源專案資料。`);return}let i=e.periods[t];if(i.length===0){a.innerHTML=`
      <div class="empty-state">
        <p>目前此時段尚無資料，請稍後再試或重新抓取。</p>
      </div>
    `;return}a.innerHTML=``,i.forEach(e=>{let t=document.createElement(`div`);t.className=`project-card`;let i=`rank-other`;e.rank===1?i=`rank-1`:e.rank===2?i=`rank-2`:e.rank===3&&(i=`rank-3`);let o=e.language?`<span class="lang-badge">${n(e.language)}</span>`:``,s=r(e.html_url),l=r(e.owner?.avatar_url)||`https://github.com/identicons/github.png`;t.innerHTML=`
      <div class="rank-badge ${i}">#${n(e.rank)}</div>
      
      <div class="card-meta">
        <img class="owner-avatar" src="${l}" alt="${n(e.owner?.login||`owner`)}" loading="lazy">
        <span class="owner-name">${n(e.owner?.login||`未知`)}</span>
        ${o}
      </div>

      <div class="card-title-section">
        <h3 class="zh-title">
          <a href="${s}" target="_blank" rel="noopener noreferrer">${n(e.zhName||e.name)}</a>
        </h3>
        <p class="original-title">${n(e.full_name)}</p>
      </div>

      <div class="stars-block">
        <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.849 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/>
        </svg>
        <span>${c(e.stargazers_count)}</span>
      </div>

      <div class="ai-summary">
        <div class="summary-section">
          <span class="summary-label label-features">核心功能與特色</span>
          <p class="summary-content">${n(e.features||`無功能描述`)}</p>
        </div>
        <div class="summary-section">
          <span class="summary-label label-applications">實際應用場景</span>
          <p class="summary-content">${n(e.applications||`無應用描述`)}</p>
        </div>
      </div>

      <details class="original-details">
        <summary>檢視原始英文描述</summary>
        <p class="original-desc">${n(e.description||`No description available.`)}</p>
      </details>

      <a class="github-action-btn" href="${s}" target="_blank" rel="noopener noreferrer">
        前往 GitHub 專案 <span class="btn-arrow">→</span>
      </a>
    `,a.appendChild(t)})}function d(e){i.classList.add(`hidden`),a.classList.remove(`hidden`),a.innerHTML=`
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px;">
      <h3 style="color: #ef4444; margin-bottom: 0.75rem; font-size: 1.2rem;">資料載入失敗</h3>
      <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${e}</p>
      <button onclick="window.location.reload()" style="background: var(--gradient-cyan-purple); border: none; padding: 0.6rem 1.5rem; border-radius: 8px; color: white; cursor: pointer; font-weight: 500;">
        重新載入網頁
      </button>
    </div>
  `}function f(){s.forEach(e=>{e.addEventListener(`click`,()=>{s.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),t=e.getAttribute(`data-period`),u(t)})})}async function p(){f();try{let n=await fetch(`/src/data/projects.json`);if(!n.ok)throw Error(`無法讀取 JSON 資料，伺服器回應狀態碼 ${n.status}`);e=await n.json(),e.lastUpdated?o.textContent=l(e.lastUpdated):o.textContent=`最後更新：未知`,i.classList.add(`hidden`),a.classList.remove(`hidden`),u(t)}catch(e){console.error(`Initialization error:`,e),d(`無法獲取開源專案數據。如果您是在本地開發環境，請確認是否已執行過 <code>npm run fetch</code> 以取得資料並產生 projects.json 檔。`)}}document.addEventListener(`DOMContentLoaded`,p);