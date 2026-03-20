# Workspace ONE UEM Dashboard

Et fullscreen-dashboard for storskjermer som henter enhetsdata direkte fra **Workspace ONE UEM API** for to eller flere Organisation Groups – og som i tillegg viser hvilke enheter som har installert **Bliksund EWA** og **Locus Mobile**.

## Hva løsningen gjør nå

Denne repoen inneholder en liten Node.js-app som:

- henter OAuth-token med `client_credentials`
- kaller Workspace ONE sitt devices-endepunkt per Organisation Group
- kan kalle et separat endepunkt for installerte applikasjoner per enhet
- viser hovedtall, sammenligning per Organisation Group og aktivitetsgraf
- viser oversiktstabeller for:
  - enheter med **Bliksund EWA** installert
  - enheter med **Locus Mobile** installert
- gjør branding via navn, tagline, logo og farger
- eksponerer et JSON-endepunkt som også kan brukes i Power BI

## Hvorfor dette oppsettet

løsningen er utvidet med:

1. **Mer presise API-spor** – både device search path og installed apps path er konfigurerbare
2. **Branding** – man kan sette firmanavn, tagline, logo og accent-farger fra .env
3. **App-oversikter** – dashboardet viser nå egne filtrerbare tabeller for Bliksund EWA og Locus Mobile
4. **Power BI-startpunkt** – det ligger en Power Query-fil i `powerbi/` som kan lese samme datamodell fra `GET /api/dashboard`

## Krav

- Node.js 18 eller nyere
- Workspace ONE UEM API-tilgang
- OAuth-klient med `client_credentials`
- REST API Key / tenant code fra Workspace ONE UEM
- Et Workspace ONE-endepunkt som kan returnere installerte apper per enhet

## Konfig

kopier og fyll inn egne verdier i `.env` 

```bash
cp .env
```

### Viktigste variabler

```env
PORT=3000
WS1_BASE_URL=https://asXXX.awmdm.com
WS1_TOKEN_URL=https://na.uemauth.vmwservices.com/connect/token
WS1_CLIENT_ID=your-client-id
WS1_CLIENT_SECRET=your-client-secret
WS1_API_KEY=your-rest-api-key
WS1_OG_CONFIG=[{"id":"123","label":"HQ","query":"organizationgroupid=123"},{"id":"456","label":"Branch","query":"organizationgroupid=456"}]
WS1_DEVICE_SEARCH_PATH=/api/mdm/devices/search
WS1_INSTALLED_APPS_PATH_TEMPLATE=/api/mdm/devices/{deviceUuid}/apps/search
WS1_TARGET_APPS=["***","***"]
WS1_APP_INVENTORY_CONCURRENCY=5
```

### `WS1_OG_CONFIG`

JSON-liste med Organisation Groups som skal vises i dashboardet.

Eksempel:

```json
[
  {
    "id": "123",
    "label": "Oslo",
    "query": "organizationgroupid=123"
  },
  {
    "id": "456",
    "label": "Trondheim",
    "query": "organizationgroupid=456"
  }
]
```

### `WS1_INSTALLED_APPS_PATH_TEMPLATE`

Denne brukes for å hente appinventar per enhet. Den støtter disse tokenene:

- `{deviceUuid}`
- `{deviceId}`
- `{udid}`
- `{serialNumber}`

Eksempel:

```env
WS1_INSTALLED_APPS_PATH_TEMPLATE=/api/mdm/devices/{deviceUuid}/apps/search
```

> Hvis tenant-en din bruker et annet apps-endepunkt, kan du bytte template uten å endre frontend-koden.

### Branding

Du kan sette disse variablene:

```env
DASHBOARD_CUSTOMER_NAME=***
DASHBOARD_BRAND_NAME=***
DASHBOARD_BRAND_TAGLINE=Workspace ONE UEM oversikt for enheter, appdistribusjon og aktivitet.
DASHBOARD_LOGO_PATH=***
DASHBOARD_ACCENT=#65d4ff
DASHBOARD_ACCENT_2=#7c89ff
DASHBOARD_PANEL_TINT=rgba(9, 23, 40, 0.86)
```

Hvis du vil bruke en anna logo, kan du peke `DASHBOARD_LOGO_PATH` til en annen fil under `public/`.

## Starte appen

```bash
npm start
```

Åpne deretter:

- `http://localhost:3000`

## Nyttige endepunkter

- `GET /api/health` – enkel helsesjekk og konfig-status
- `GET /api/dashboard` – komplett datamodell for dashboard og Power BI

## Power BI

Det ligger et startpunkt i `powerbi/`:

- `powerbi/workspace-one-dashboard.pq`
- `powerbi/README.md`

Der kan du lese samme JSON-modell inn i Power BI Desktop og bygge visuals for både KPI-er og appoversiktene.

## Anbefalt bruk på visningsskjerm

1. Legg appen på en liten Windows-PC eller mini-PC koblet til skjermen.
2. Sett maskinen til å åpne `http://localhost:3000` i Edge/Chrome ved oppstart.
3. Bruk kiosk mode / fullscreen.
4. Sett Windows til å ikke sove.
5. Oppdater `.env` lokalt med dine Workspace ONE-verdier.

## Neste naturlige forbedringer

Hvis du vil fortsette etter dette, er de mest nyttige stegene sannsynligvis:

- klikkbar drilldown til enhetsside i Workspace ONE
- filtrering på plattform, eierform eller Organisation Group i UI-et
- lokal cache/database for raskere oppdatering ved store enhetsmengder
- eksport til CSV/Excel for app-oversiktene
- alarmfelt som viser når en tracked app mangler i en bestemt gruppe

## Utvikling

Kjør med auto-reload:

```bash
npm run dev
```

Syntakssjekk:

```bash
npm run check
```
