const kpiGrid = document.getElementById('kpi-grid');
const comparisonGrid = document.getElementById('comparison-grid');
const platformChart = document.getElementById('platform-chart');
const complianceChart = document.getElementById('compliance-chart');
const ownershipChart = document.getElementById('ownership-chart');
const timeline = document.getElementById('timeline');
const updatedAt = document.getElementById('updated-at');
const refreshInfo = document.getElementById('refresh-info');
const refreshButton = document.getElementById('refresh-button');
const apiModel = document.getElementById('api-model');
const trackedApps = document.getElementById('tracked-apps');
const trackedWarnings = document.getElementById('tracked-warnings');
const customerName = document.getElementById('customer-name');
const brandName = document.getElementById('brand-name');
const brandTagline = document.getElementById('brand-tagline');
const brandLogo = document.getElementById('brand-logo');
const kpiTemplate = document.getElementById('kpi-card-template');

let refreshTimer;

refreshButton.addEventListener('click', () => loadDashboard(true));
loadDashboard();

async function loadDashboard(manual = false) {
  if (manual) {
    refreshButton.disabled = true;
    refreshButton.textContent = 'Oppdaterer…';
  }

  try {
    const response = await fetch('/api/dashboard');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Kunne ikke laste dashboarddata.');
    }

    applyBrand(payload.brand);
    renderDashboard(payload);
    scheduleRefresh(payload.refreshSeconds);
  } catch (error) {
    renderError(error.message);
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Oppdater nå';
  }
}

function applyBrand(brand) {
  if (!brand) return;
  customerName.textContent = brand.customerName || 'Din organisasjon';
  brandName.textContent = brand.name || 'Operations Center';
  brandTagline.textContent = brand.tagline || '';
  brandLogo.src = brand.logoPath || '/brand-mark.svg';

  document.documentElement.style.setProperty('--accent', brand.accent || '#65d4ff');
  document.documentElement.style.setProperty('--accent-2', brand.accent2 || '#7c89ff');
  document.documentElement.style.setProperty('--panel', brand.panelTint || 'rgba(9, 23, 40, 0.86)');
}

function renderDashboard(data) {
  updatedAt.textContent = `Oppdatert ${formatDateTime(data.updatedAt)}`;
  refreshInfo.textContent = `Auto refresh ${data.refreshSeconds}s`;

  const trackedAppsByName = Object.fromEntries(data.trackedApps.applications.map((app) => [app.name, app]));

  renderKpis([
    { label: 'Totalt antall enheter', value: data.totals.totalDevices, footnote: `${data.comparison.length} Organisation Groups` },
    { label: 'Compliance-rate', value: `${data.totals.complianceRate}%`, footnote: `${data.totals.compliantDevices} compliant` },
    { label: 'Sett siste 24 timer', value: data.totals.seenLast24h, footnote: `${data.totals.staleDevices} stale` },
    { label: 'Bliksund EWA', value: trackedAppsByName['Bliksund EWA']?.totalDevices || 0, footnote: 'Enheter med app installert' },
    { label: 'Locus Mobile', value: trackedAppsByName['Locus Mobile']?.totalDevices || 0, footnote: 'Enheter med app installert' },
  ]);

  comparisonGrid.innerHTML = data.comparison.map((group) => `
    <article class="comparison-card">
      <div class="comparison-header">
        <h3 class="comparison-title">${escapeHtml(group.label)}</h3>
        <span class="${group.complianceRate >= 90 ? 'status-ok' : 'status-danger'}">${group.complianceRate}% compliant</span>
      </div>
      <div class="comparison-kpis">
        ${miniKpi('Enheter', group.totalDevices)}
        ${miniKpi('Compliant', group.compliantDevices)}
        ${miniKpi('Ikke compliant', group.nonCompliantDevices)}
        ${miniKpi('Sett siste 24t', group.seenLast24h)}
      </div>
    </article>
  `).join('');

  renderBars(platformChart, data.platformDistribution);
  renderBars(complianceChart, data.complianceDistribution);
  renderBars(ownershipChart, data.ownershipDistribution);
  renderTimeline(data.lastSeenTimeline);
  renderApiModel(data.dataModel);
  renderTrackedApps(data.trackedApps);
}

function renderApiModel(model) {
  apiModel.innerHTML = `
    <div class="api-item">
      <span class="api-label">Device search path</span>
      <code>${escapeHtml(model.deviceSearchPath)}</code>
    </div>
    <div class="api-item">
      <span class="api-label">Installed apps path</span>
      <code>${escapeHtml(model.installedAppsPathTemplate)}</code>
    </div>
    <div class="api-item">
      <span class="api-label">Sporede apper</span>
      <div class="tag-list">${model.targetApps.map((app) => `<span class="tag">${escapeHtml(app)}</span>`).join('')}</div>
    </div>
  `;
}

function renderTrackedApps(data) {
  trackedApps.innerHTML = data.applications.map((application) => `
    <article class="tracked-card">
      <div class="comparison-header">
        <div>
          <h3 class="comparison-title">${escapeHtml(application.name)}</h3>
          <p class="section-copy">${application.totalDevices} enheter med app installert.</p>
        </div>
      </div>
      ${renderTrackedTable(application.devices)}
    </article>
  `).join('');

  trackedWarnings.innerHTML = data.warnings.length
    ? data.warnings.map((warning) => `<div class="warning-chip">${escapeHtml(warning.device)}: ${escapeHtml(warning.message)}</div>`).join('')
    : '';
}

function renderTrackedTable(devices) {
  if (!devices.length) {
    return '<div class="empty-state">Fant ingen enheter som matcher denne appen i de valgte Organisation Groups.</div>';
  }

  return `
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Enhet</th>
            <th>Bruker</th>
            <th>Plattform</th>
            <th>Ownership</th>
            <th>Organisation Group</th>
            <th>Sist sett</th>
            <th>Serienummer</th>
          </tr>
        </thead>
        <tbody>
          ${devices.map((device) => `
            <tr>
              <td>${escapeHtml(device.deviceName)}</td>
              <td>${escapeHtml(device.user)}</td>
              <td>${escapeHtml(device.platform)}</td>
              <td>${escapeHtml(device.ownership)}</td>
              <td>${escapeHtml(device.organizationGroup)}</td>
              <td>${device.lastSeen ? escapeHtml(formatDateTime(device.lastSeen)) : '—'}</td>
              <td>${escapeHtml(device.serialNumber)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderKpis(items) {
  kpiGrid.innerHTML = '';
  for (const item of items) {
    const node = kpiTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.kpi-label').textContent = item.label;
    node.querySelector('.kpi-value').textContent = item.value;
    node.querySelector('.kpi-footnote').textContent = item.footnote;
    kpiGrid.appendChild(node);
  }
}

function renderBars(container, items) {
  const max = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = items.map((item) => `
    <div class="bar-row">
      <span>${escapeHtml(item.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(item.value / max) * 100}%"></div></div>
      <strong>${item.value}</strong>
    </div>
  `).join('');
}

function renderTimeline(items) {
  const max = Math.max(...items.map((item) => item.value), 1);
  timeline.innerHTML = items.map((item) => `
    <div class="timeline-column">
      <span class="timeline-value">${item.value}</span>
      <div class="timeline-bar" style="height:${Math.max((item.value / max) * 180, 10)}px"></div>
      <span class="timeline-label">${escapeHtml(item.label)}</span>
    </div>
  `).join('');
}

function renderError(message) {
  kpiGrid.innerHTML = `<div class="error-state">${escapeHtml(message)}</div>`;
  comparisonGrid.innerHTML = '';
  platformChart.innerHTML = '';
  complianceChart.innerHTML = '';
  ownershipChart.innerHTML = '';
  timeline.innerHTML = '';
  apiModel.innerHTML = '';
  trackedApps.innerHTML = '';
  trackedWarnings.innerHTML = '';
}

function scheduleRefresh(seconds) {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => loadDashboard(), seconds * 1000);
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('nb-NO');
}

function miniKpi(label, value) {
  return `<div class="mini-kpi"><div class="kpi-label">${escapeHtml(label)}</div><strong>${value}</strong></div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
