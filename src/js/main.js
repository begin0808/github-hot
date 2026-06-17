// Main application logic

let cachedData = null;
let currentPeriod = 'week';

// Security: HTML escape to prevent XSS from API data
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Security: Validate URLs to only allow https:// protocol
function sanitizeUrl(url) {
  if (!url) return '#';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return url;
    return '#';
  } catch {
    return '#';
  }
}

// Elements
const loadingEl = document.getElementById('loading');
const projectsGridEl = document.getElementById('projects-grid');
const lastUpdatedEl = document.getElementById('last-updated');
const tabs = document.querySelectorAll('.tab-btn');

// Formatting utilities
function formatStars(count) {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

function formatDateTime(isoString) {
  if (!isoString) return '未知';
  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `最後更新：${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// Render the grid with projects for the selected period
function renderProjects(period) {
  if (!cachedData || !cachedData.periods || !cachedData.periods[period]) {
    showError('無法讀取該時段的開源專案資料。');
    return;
  }

  const projects = cachedData.periods[period];
  
  if (projects.length === 0) {
    projectsGridEl.innerHTML = `
      <div class="empty-state">
        <p>目前此時段尚無資料，請稍後再試或重新抓取。</p>
      </div>
    `;
    return;
  }

  projectsGridEl.innerHTML = '';
  
  projects.forEach(repo => {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    // Determine rank styles
    let rankClass = 'rank-other';
    if (repo.rank === 1) rankClass = 'rank-1';
    else if (repo.rank === 2) rankClass = 'rank-2';
    else if (repo.rank === 3) rankClass = 'rank-3';

    // Format Language (escaped)
    const languageBadge = repo.language 
      ? `<span class="lang-badge">${escapeHtml(repo.language)}</span>` 
      : '';

    // Sanitize URLs
    const repoUrl = sanitizeUrl(repo.html_url);
    const avatarUrl = sanitizeUrl(repo.owner?.avatar_url) || 'https://github.com/identicons/github.png';

    card.innerHTML = `
      <div class="rank-badge ${rankClass}">#${escapeHtml(repo.rank)}</div>
      
      <div class="card-meta">
        <img class="owner-avatar" src="${avatarUrl}" alt="${escapeHtml(repo.owner?.login || 'owner')}" loading="lazy">
        <span class="owner-name">${escapeHtml(repo.owner?.login || '未知')}</span>
        ${languageBadge}
      </div>

      <div class="card-title-section">
        <h3 class="zh-title">
          <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.zhName || repo.name)}</a>
        </h3>
        <p class="original-title">${escapeHtml(repo.full_name)}</p>
      </div>

      <div class="stars-block">
        <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.849 1.4-8.168L.132 9.209l8.2-1.191L12 .587z"/>
        </svg>
        <span>${formatStars(repo.stargazers_count)}</span>
      </div>

      <div class="ai-summary">
        <div class="summary-section">
          <span class="summary-label label-features">核心功能與特色</span>
          <p class="summary-content">${escapeHtml(repo.features || '無功能描述')}</p>
        </div>
        <div class="summary-section">
          <span class="summary-label label-applications">實際應用場景</span>
          <p class="summary-content">${escapeHtml(repo.applications || '無應用描述')}</p>
        </div>
      </div>

      <details class="original-details">
        <summary>檢視原始英文描述</summary>
        <p class="original-desc">${escapeHtml(repo.description || 'No description available.')}</p>
      </details>

      <a class="github-action-btn" href="${repoUrl}" target="_blank" rel="noopener noreferrer">
        前往 GitHub 專案 <span class="btn-arrow">→</span>
      </a>
    `;

    projectsGridEl.appendChild(card);
  });
}

// Show error message
function showError(message) {
  loadingEl.classList.add('hidden');
  projectsGridEl.classList.remove('hidden');
  projectsGridEl.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px;">
      <h3 style="color: #ef4444; margin-bottom: 0.75rem; font-size: 1.2rem;">資料載入失敗</h3>
      <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${message}</p>
      <button onclick="window.location.reload()" style="background: var(--gradient-cyan-purple); border: none; padding: 0.6rem 1.5rem; border-radius: 8px; color: white; cursor: pointer; font-weight: 500;">
        重新載入網頁
      </button>
    </div>
  `;
}

// Setup Event Listeners for Tabs
function setupTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Switch active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update grid
      currentPeriod = tab.getAttribute('data-period');
      renderProjects(currentPeriod);
    });
  });
}

// Fetch generated JSON data
async function init() {
  setupTabs();
  
  try {
    // Vite will resolve src/data/projects.json relative path or serve it directly
    const response = await fetch('/src/data/projects.json');
    
    if (!response.ok) {
      throw new Error(`無法讀取 JSON 資料，伺服器回應狀態碼 ${response.status}`);
    }

    cachedData = await response.json();
    
    // Render last updated badge
    if (cachedData.lastUpdated) {
      lastUpdatedEl.textContent = formatDateTime(cachedData.lastUpdated);
    } else {
      lastUpdatedEl.textContent = '最後更新：未知';
    }

    // Hide loader, show grid
    loadingEl.classList.add('hidden');
    projectsGridEl.classList.remove('hidden');

    // Initial render
    renderProjects(currentPeriod);

  } catch (error) {
    console.error('Initialization error:', error);
    showError(
      '無法獲取開源專案數據。如果您是在本地開發環境，請確認是否已執行過 <code>npm run fetch</code> 以取得資料並產生 projects.json 檔。'
    );
  }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
