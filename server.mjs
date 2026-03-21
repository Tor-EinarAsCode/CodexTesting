import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, 'public');

loadEnvFile();

const port = Number(process.env.PORT || 3000);
const refreshSeconds = Number(process.env.WS1_REFRESH_SECONDS || 300);
const pageSize = Number(process.env.WS1_PAGE_SIZE || 500);
const ws1Config = parseConfig();
const tokenCache = { accessToken: null, expiresAt: 0 };
const inventoryCache = new Map();

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        hasWorkspaceOneConfig: hasRequiredConfig(),
        orgGroups: ws1Config.orgGroups.map(({ id, label }) => ({ id, label })),
        trackedApps: ws1Config.targetApps,
        refreshSeconds,
      });
    }

    if (url.pathname === '/api/dashboard') {
      if (!hasRequiredConfig()) {
        return sendJson(res, 500, {
          error: 'Workspace ONE-konfigurasjon mangler. Sett miljøvariablene i .env eller shell.',
        });
      }

      return sendJson(res, 200, await buildDashboard());
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || 'Ukjent serverfeil.' });
  }
});

server.listen(port, () => {
  console.log(`Workspace ONE dashboard tilgjengelig på http://localhost:${port}`);
});

function loadEnvFile() {
  const envPath = join(__dirname, '.env');

  try {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env er valgfri.
  }
}

function parseConfig() {
  const orgGroups = parseJsonArray(process.env.WS1_OG_CONFIG).map((group) => ({
    id: String(group.id ?? ''),
    label: group.label || `OG ${group.id}`,
    query: group.query || '',
  })).filter((group) => group.id);

  return {
    baseUrl: trimTrailingSlash(process.env.WS1_BASE_URL || ''),
    tokenUrl: process.env.WS1_TOKEN_URL || '',
    clientId: process.env.WS1_CLIENT_ID || '',
    clientSecret: process.env.WS1_CLIENT_SECRET || '',
    apiKey: process.env.WS1_API_KEY || '',
    orgGroups,
    deviceSearchPath: ensureLeadingSlash(process.env.WS1_DEVICE_SEARCH_PATH || '/api/mdm/devices/search'),
    installedAppsPathTemplate: process.env.WS1_INSTALLED_APPS_PATH_TEMPLATE || '/api/mdm/devices/{deviceUuid}/apps/search',
    targetApps: parseJsonArray(process.env.WS1_TARGET_APPS || '["Bliksund EWA","Locus Mobile"]').map(String),
    appInventoryConcurrency: Number(process.env.WS1_APP_INVENTORY_CONCURRENCY || 5),
    brand: {
      name: process.env.DASHBOARD_BRAND_NAME || 'Operations Center',
      tagline: process.env.DASHBOARD_BRAND_TAGLINE || 'Workspace ONE UEM storskjerm for flåtestatus, appdistribusjon og siste aktivitet.',
      customerName: process.env.DASHBOARD_CUSTOMER_NAME || 'Din organisasjon',
      logoPath: process.env.DASHBOARD_LOGO_PATH || '/brand-mark.svg',
      accent: process.env.DASHBOARD_ACCENT || '#65d4ff',
      accent2: process.env.DASHBOARD_ACCENT_2 || '#7c89ff',
      panelTint: process.env.DASHBOARD_PANEL_TINT || 'rgba(9, 23, 40, 0.86)',
    },
  };
}

function hasRequiredConfig() {
  return Boolean(
    ws1Config.baseUrl &&
    ws1Config.tokenUrl &&
    ws1Config.clientId &&
    ws1Config.clientSecret &&
    ws1Config.apiKey &&
    ws1Config.orgGroups.length
  );
}

async function buildDashboard() {
  const groups = await Promise.all(ws1Config.orgGroups.map(fetchDevicesForGroup));
  const devices = groups.flatMap((group) => group.devices);
  const totals = calculateMetrics(devices);
  const trackedApps = await buildTrackedApps(groups);

  return {
    updatedAt: new Date().toISOString(),
    refreshSeconds,
    brand: ws1Config.brand,
    dataModel: {
      deviceSearchPath: ws1Config.deviceSearchPath,
      installedAppsPathTemplate: ws1Config.installedAppsPathTemplate,
      targetApps: ws1Config.targetApps,
    },
    totals,
    comparison: groups.map((group) => ({
      id: group.id,
      label: group.label,
      ...calculateMetrics(group.devices),
      lastSeenTimeline: buildLastSeenTimeline(group.devices),
    })),
    platformDistribution: summarizeBy(devices, (device) => safeValue(resolvePlatform(device))),
    ownershipDistribution: summarizeBy(devices, (device) => safeValue(resolveOwnership(device))),
    complianceDistribution: summarizeBy(devices, (device) => getComplianceLabel(device)),
    lastSeenTimeline: buildLastSeenTimeline(devices),
    trackedApps,
    rawCount: devices.length,
  };
}

async function buildTrackedApps(groups) {
  const devices = groups.flatMap((group) => group.devices.map((device) => ({ ...device, ogLabel: group.label })));
  const appMap = new Map(ws1Config.targetApps.map((appName) => [appName, []]));
  const warnings = [];

  await mapWithConcurrency(devices, ws1Config.appInventoryConcurrency, async (device) => {
    try {
      const installedApps = await fetchInstalledAppsForDevice(device);
      for (const targetApp of ws1Config.targetApps) {
        if (installedApps.some((app) => isTargetAppMatch(app, targetApp))) {
          appMap.get(targetApp).push(buildTrackedDeviceRow(device));
        }
      }
    } catch (error) {
      warnings.push({
        device: safeValue(resolveDeviceName(device)),
        message: error.message,
      });
    }
  });

  return {
    warnings,
    applications: ws1Config.targetApps.map((name) => ({
      name,
      totalDevices: appMap.get(name).length,
      devices: appMap.get(name)
        .sort((left, right) => left.deviceName.localeCompare(right.deviceName, 'nb')),
    })),
  };
}

async function fetchDevicesForGroup(group) {
  const token = await getAccessToken();
  const firstPage = await fetchDevicePage(group, token, 0);
  const devices = normalizeDevicesPayload(firstPage);
  const total = Number(firstPage.Total || firstPage.total || devices.length);
  const pageTotal = Math.max(1, Math.ceil(total / pageSize));

  for (let page = 1; page < pageTotal; page += 1) {
    const nextPage = await fetchDevicePage(group, token, page);
    devices.push(...normalizeDevicesPayload(nextPage));
  }

  return {
    id: group.id,
    label: group.label,
    devices: devices.filter((device) => matchesOrgGroup(device, group)),
  };
}

async function fetchDevicePage(group, token, page) {
  const params = new URLSearchParams(group.query || '');
  params.set('page', String(page));
  params.set('pagesize', String(pageSize));

  return fetchJson(`${ws1Config.baseUrl}${ws1Config.deviceSearchPath}?${params.toString()}`, {
    headers: authHeaders(token),
  }, 'Workspace ONE device search');
}

async function fetchInstalledAppsForDevice(device) {
  const cacheKey = String(resolveDeviceCacheKey(device));
  const cached = inventoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.apps;
  }

  const token = await getAccessToken();
  const path = resolveInstalledAppsPath(device);
  const payload = await fetchJson(`${ws1Config.baseUrl}${path}`, {
    headers: authHeaders(token),
  }, `installed apps for ${resolveDeviceName(device)}`);

  const apps = normalizeInstalledAppsPayload(payload);
  inventoryCache.set(cacheKey, {
    apps,
    expiresAt: Date.now() + refreshSeconds * 1000,
  });
  return apps;
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: ws1Config.clientId,
    client_secret: ws1Config.clientSecret,
  });

  const response = await fetch(ws1Config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Kunne ikke hente OAuth-token (${response.status}): ${errorBody}`);
  }

  const tokenPayload = await response.json();
  tokenCache.accessToken = tokenPayload.access_token;
  tokenCache.expiresAt = now + Number(tokenPayload.expires_in || 3600) * 1000;
  return tokenCache.accessToken;
}

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'aw-tenant-code': ws1Config.apiKey,
  };
}

async function fetchJson(url, options, context) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API-feil i ${context} (${response.status}): ${errorBody}`);
  }

  return response.json();
}

function normalizeDevicesPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.Devices)) return payload.Devices;
  if (Array.isArray(payload.devices)) return payload.devices;
  return [];
}

function normalizeInstalledAppsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.Application)) return payload.Application;
  if (Array.isArray(payload.Applications)) return payload.Applications;
  if (Array.isArray(payload.apps)) return payload.apps;
  if (Array.isArray(payload.Items)) return payload.Items;
  return [];
}

function matchesOrgGroup(device, group) {
  const candidates = [
    device.LocationGroupId,
    device.OrganizationGroupId,
    device.OGId,
    device.LocationGroupID,
    device.LocationGroup?.Id,
  ].map((value) => String(value ?? '')).filter(Boolean);

  if (!candidates.length) {
    return true;
  }

  return candidates.includes(group.id);
}

function calculateMetrics(devices) {
  const compliant = devices.filter((device) => getComplianceLabel(device) === 'Compliant').length;
  const seenLast24h = devices.filter((device) => {
    const timestamp = getLastSeenDate(device);
    return timestamp && (Date.now() - timestamp.getTime()) <= 86_400_000;
  }).length;

  return {
    totalDevices: devices.length,
    compliantDevices: compliant,
    nonCompliantDevices: devices.length - compliant,
    complianceRate: devices.length ? Math.round((compliant / devices.length) * 100) : 0,
    seenLast24h,
    staleDevices: devices.length - seenLast24h,
  };
}

function summarizeBy(devices, selector) {
  const buckets = new Map();

  for (const device of devices) {
    const key = selector(device);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  return [...buckets.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function buildLastSeenTimeline(devices) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('nb-NO', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      value: 0,
    };
  });

  const lookup = new Map(days.map((entry) => [entry.key, entry]));

  for (const device of devices) {
    const lastSeen = getLastSeenDate(device);
    if (!lastSeen) continue;
    const key = lastSeen.toISOString().slice(0, 10);
    if (lookup.has(key)) {
      lookup.get(key).value += 1;
    }
  }

  return days;
}

function buildTrackedDeviceRow(device) {
  return {
    deviceName: resolveDeviceName(device),
    user: safeValue(device.UserName || device.User || device.Username || device.UserEmailAddress || 'Ingen bruker'),
    platform: safeValue(resolvePlatform(device)),
    ownership: safeValue(resolveOwnership(device)),
    organizationGroup: safeValue(device.ogLabel || device.LocationGroupName || device.OrganizationGroup || 'Ukjent OG'),
    lastSeen: getLastSeenDate(device)?.toISOString() || null,
    serialNumber: safeValue(device.SerialNumber || device.Serial || 'Ukjent'),
  };
}

function resolveInstalledAppsPath(device) {
  const template = ws1Config.installedAppsPathTemplate;
  const replacements = {
    '{deviceId}': resolveDeviceId(device, ['Id', 'DeviceId', 'id']),
    '{deviceUuid}': resolveDeviceId(device, ['Uuid', 'DeviceUuid', 'DeviceUuidV2', 'uuid']),
    '{udid}': resolveDeviceId(device, ['Udid', 'UDID', 'udid']),
    '{serialNumber}': device.SerialNumber,
  };

  const missingTokens = Object.entries(replacements)
    .filter(([token, value]) => template.includes(token) && !value)
    .map(([token]) => token);

  if (missingTokens.length) {
    throw new Error(`Enheten mangler felt for installed apps path: ${missingTokens.join(', ')}`);
  }

  let path = template;
  for (const [token, value] of Object.entries(replacements)) {
    path = path.replaceAll(token, encodeURIComponent(String(value || '')));
  }

  if (path.includes('{')) {
    throw new Error(`Manglende felt for installed apps path: ${template}`);
  }

  return ensureLeadingSlash(path);
}

function resolveDeviceId(device, candidates) {
  for (const candidate of candidates) {
    if (device[candidate]) return device[candidate];
  }
  return null;
}

function resolveDeviceCacheKey(device) {
  return resolveDeviceId(device, ['Uuid', 'DeviceUuid', 'DeviceUuidV2', 'Id', 'DeviceId', 'Udid', 'UDID']) || resolveDeviceName(device);
}

function resolveDeviceName(device) {
  return safeValue(device.DeviceFriendlyName || device.FriendlyName || device.DeviceName || device.Name || 'Ukjent enhet');
}

function resolvePlatform(device) {
  return device.Platform || device.PlatformId || device.OperatingSystem || device.OS || 'Ukjent';
}

function resolveOwnership(device) {
  return device.Ownership || device.OwnershipType || device.OwnershipId || 'Ukjent';
}

function isTargetAppMatch(app, targetName) {
  const normalizedTarget = normalizeName(targetName);
  const appNames = [
    app.ApplicationName,
    app.Name,
    app.AppName,
    app.PackageName,
    app.BundleId,
  ].filter(Boolean);

  return appNames.some((name) => normalizeName(name).includes(normalizedTarget));
}

function getComplianceLabel(device) {
  const raw = String(device.ComplianceStatus || device.CompromisedStatus || '').toLowerCase();
  if (raw.includes('non') || raw.includes('not') || raw.includes('false')) return 'Non-compliant';
  if (raw.includes('compliant') || raw.includes('true')) return 'Compliant';
  return 'Ukjent';
}

function getLastSeenDate(device) {
  const raw = device.LastSeen || device.LastSeenOn || device.LastEnrolledOn || device.LastEventOn;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function mapWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length) {
      const current = queue.shift();
      await worker(current);
    }
  });

  await Promise.all(runners);
}

async function serveStatic(pathname, res) {
  try {
    const target = pathname === '/' ? '/index.html' : pathname;
    const safePath = normalize(target).replace(/^\.\.(\/|\\|$)/, '');
    const filePath = join(publicDir, safePath);
    const extension = extname(filePath);
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentTypes[extension] || 'application/octet-stream' });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: 'Fant ikke ressursen.' });
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function parseJsonArray(rawValue) {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Kunne ikke parse JSON-array fra miljøvariabel.', error.message);
    return [];
  }
}

function ensureLeadingSlash(value) {
  return value.startsWith('/') ? value : `/${value}`;
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, '');
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function safeValue(value) {
  return String(value || 'Ukjent').trim() || 'Ukjent';
}
