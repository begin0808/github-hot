// Main application logic
import { i18nTranslations } from './i18n.js';

let cachedData = null;
let currentPeriod = 'week';
let currentLocale = 'zh-TW';

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
const langSelectEl = document.getElementById('lang-select');

// Formatting utilities
function formatStars(count) {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  
  const prefix = i18nTranslations[currentLocale]['last-updated-prefix'] || '最後更新：';
  return `${prefix}${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// Translate static DOM elements
function translatePage() {
  const translations = i18nTranslations[currentLocale];
  if (!translations) return;

  // Translate standard textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[key]) {
      el.textContent = translations[key];
    }
  });

  // Translate specific attribute-based values (like title/aria-label)
  document.querySelectorAll('[data-i18n-attr]').forEach(el => {
    const attrExpression = el.getAttribute('data-i18n-attr');
    if (attrExpression) {
      attrExpression.split('|').forEach(part => {
        const [attrName, key] = part.split(':');
        if (translations[key]) {
          el.setAttribute(attrName, translations[key]);
        }
      });
    }
  });

  // Update last-updated string format
  if (cachedData && cachedData.lastUpdated) {
    lastUpdatedEl.textContent = formatDateTime(cachedData.lastUpdated);
  }
}

// Render the grid with projects for the selected period
function renderProjects(period) {
  const t = i18nTranslations[currentLocale];
  
  if (!cachedData || !cachedData.periods || !cachedData.periods[period]) {
    showError(t['error-message'] || '無法讀取該時段的開源專案資料。');
    return;
  }

  const projects = cachedData.periods[period];
  
  if (projects.length === 0) {
    projectsGridEl.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(t['empty-state'])}</p>
      </div>
    `;
    return;
  }

  projectsGridEl.innerHTML = '';
  
  projects.forEach(repo => {
    const card = document.createElement('div');
    
    // Determine rank styles and card backgrounds
    let rankClass = 'rank-other';
    let cardRankClass = '';
    if (repo.rank === 1) {
      rankClass = 'rank-1';
      cardRankClass = 'card-rank-1';
    } else if (repo.rank === 2) {
      rankClass = 'rank-2';
      cardRankClass = 'card-rank-2';
    } else if (repo.rank === 3) {
      rankClass = 'rank-3';
      cardRankClass = 'card-rank-3';
    }
    
    card.className = `project-card ${cardRankClass}`.trim();

    // Format Language (escaped)
    const languageBadge = repo.language 
      ? `<span class="lang-badge">${escapeHtml(repo.language)}</span>` 
      : '';

    // Sanitize URLs
    const repoUrl = sanitizeUrl(repo.html_url);
    const avatarUrl = sanitizeUrl(repo.owner?.avatar_url) || 'https://github.com/identicons/github.png';

    // Format License text
    let licenseText = t['license-unspecified'];
    if (repo.license) {
      const spdx = repo.license.spdx_id;
      if (spdx === 'NOASSERTION') {
        licenseText = t['license-custom'];
      } else {
        licenseText = spdx || repo.license.name || licenseText;
      }
    }

    // Read localized repository name, fall back to repo.zhName (old schema) or repo.name
    const displayName = repo.translatedName || repo.zhName || repo.name;

    card.innerHTML = `
      <div class="rank-badge ${rankClass}">#${escapeHtml(repo.rank)}</div>
      
      <div class="card-meta">
        <img class="owner-avatar" src="${avatarUrl}" alt="${escapeHtml(repo.owner?.login || 'owner')}" loading="lazy">
        <span class="owner-name">${escapeHtml(repo.owner?.login || '未知')}</span>
        ${languageBadge}
      </div>

      <div class="card-title-section">
        <h3 class="zh-title">
          <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayName)}</a>
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
          <span class="summary-label label-features">${escapeHtml(t['label-features'])}</span>
          <p class="summary-content">${escapeHtml(repo.features || 'No features description available.')}</p>
        </div>
        <div class="summary-section">
          <span class="summary-label label-applications">${escapeHtml(t['label-applications'])}</span>
          <p class="summary-content">${escapeHtml(repo.applications || 'No application scenarios description available.')}</p>
        </div>
        <div class="summary-section">
          <span class="summary-label label-license">${escapeHtml(t['label-license'])}</span>
          <p class="summary-content license-text">${escapeHtml(licenseText)}</p>
        </div>
      </div>

      <details class="original-details">
        <summary>${escapeHtml(t['original-desc-summary'])}</summary>
        <p class="original-desc">${escapeHtml(repo.description || 'No description available.')}</p>
      </details>

      <a class="github-action-btn" href="${repoUrl}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(t['go-to-github'])} <span class="btn-arrow">→</span>
      </a>
    `;

    projectsGridEl.appendChild(card);
  });
}

// Show error message
function showError(message) {
  const t = i18nTranslations[currentLocale];
  loadingEl.classList.add('hidden');
  projectsGridEl.classList.remove('hidden');
  projectsGridEl.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px;">
      <h3 style="color: #ef4444; margin-bottom: 0.75rem; font-size: 1.2rem;">${escapeHtml(t['error-title'])}</h3>
      <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${escapeHtml(message)}</p>
      <button onclick="window.location.reload()" style="background: var(--gradient-cyan-purple); border: none; padding: 0.6rem 1.5rem; border-radius: 8px; color: white; cursor: pointer; font-weight: 500;">
        ${escapeHtml(t['reload-btn'])}
      </button>
    </div>
  `;
}

// Load dynamic language data
async function loadLanguageData(locale) {
  // Show loading indicator
  loadingEl.classList.remove('hidden');
  projectsGridEl.classList.add('hidden');

  try {
    // Vite dynamic import of JSON files
    const module = await import(`../data/projects_${locale}.json`);
    cachedData = module.default;

    // Refresh UI elements with updated data
    translatePage();

    loadingEl.classList.add('hidden');
    projectsGridEl.classList.remove('hidden');

    // Render projects grid
    renderProjects(currentPeriod);
  } catch (error) {
    console.error(`Error loading locale data for ${locale}:`, error);
    // Fallback to loading basic projects.json if specific locale file is not found
    try {
      console.log('Attempting to load fallback projects.json...');
      const module = await import('../data/projects.json');
      cachedData = module.default;
      translatePage();
      loadingEl.classList.add('hidden');
      projectsGridEl.classList.remove('hidden');
      renderProjects(currentPeriod);
    } catch (fallbackError) {
      showError(i18nTranslations[locale]['error-message'] || '無法讀取開源專案資料。');
    }
  }
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

// Setup Theme switching (Light / Dark mode)
function setupTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;

  const sunIcon = themeToggleBtn.querySelector('.sun-icon');
  const moonIcon = themeToggleBtn.querySelector('.moon-icon');

  // Load theme preference from localStorage or default to dark
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  let isLightTheme = savedTheme === 'light';
  if (savedTheme === null && !prefersDark) {
    isLightTheme = false;
  }

  function updateThemeUI(isLight) {
    if (isLight) {
      document.body.classList.add('light-theme');
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      document.body.classList.remove('light-theme');
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    }
  }

  updateThemeUI(isLightTheme);

  themeToggleBtn.addEventListener('click', () => {
    isLightTheme = !isLightTheme;
    localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
    updateThemeUI(isLightTheme);
  });
}

// Initialize locale
function initLocale() {
  const savedLocale = localStorage.getItem('locale');
  if (savedLocale && i18nTranslations[savedLocale]) {
    currentLocale = savedLocale;
  } else {
    // Detect system browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
      const langLower = browserLang.toLowerCase();
      if (langLower.startsWith('zh-cn')) {
        currentLocale = 'zh-CN';
      } else if (langLower.startsWith('zh')) {
        currentLocale = 'zh-TW';
      } else if (langLower.startsWith('ja')) {
        currentLocale = 'ja';
      } else if (langLower.startsWith('ko')) {
        currentLocale = 'ko';
      } else if (langLower.startsWith('fr')) {
        currentLocale = 'fr';
      } else if (langLower.startsWith('de')) {
        currentLocale = 'de';
      } else {
        currentLocale = 'en';
      }
    } else {
      currentLocale = 'zh-TW';
    }
  }

  if (langSelectEl) {
    langSelectEl.value = currentLocale;
  }
}

// Setup Language Switcher Listener
function setupLanguageSwitcher() {
  if (!langSelectEl) return;
  langSelectEl.addEventListener('change', (e) => {
    const selectedLocale = e.target.value;
    if (i18nTranslations[selectedLocale]) {
      currentLocale = selectedLocale;
      localStorage.setItem('locale', currentLocale);
      loadLanguageData(currentLocale);
    }
  });
}

// Fetch generated JSON data
async function init() {
  setupTheme();
  setupTabs();
  initLocale();
  setupLanguageSwitcher();
  
  // Load data for the selected language
  await loadLanguageData(currentLocale);
}

// Start app
document.addEventListener('DOMContentLoaded', init);
