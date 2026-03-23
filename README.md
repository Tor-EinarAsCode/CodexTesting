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

## Hvorfor dette oppsettet er nyttig for deg

Du sa ja til alle fire neste steg fra forrige runde, så løsningen er nå utvidet med:

1. **Mer presise API-spor** – både device search path og installed apps path er eksplisitt konfigurerbare.
2. **Branding** – du kan sette firmanavn, tagline, logo og accent-farger fra miljøvariabler.
3. **App-oversikter i stedet for ikke-compliant-liste** – dashboardet viser nå egne tabeller for Bliksund EWA og Locus Mobile.
4. **Power BI-startpunkt** – det ligger en Power Query-fil i `powerbi/` som kan lese samme datamodell fra `GET /api/dashboard`.

## Krav

- Node.js 18 eller nyere
- Workspace ONE UEM API-tilgang
- OAuth-klient med `client_credentials`
- REST API Key / tenant code fra Workspace ONE UEM
- Et Workspace ONE-endepunkt som kan returnere installerte apper per enhet

## Kort svar på spørsmålene dine

### Må jeg laste ned filene fra GitHub og ha dem lokalt?

**Ja, hvis du skal kjøre appen selv på din PC**, må du ha prosjektfilene tilgjengelig lokalt på maskinen som skal kjøre dashboardet.

Du har to enkle valg:

1. **Laste ned ZIP fra GitHub**
   - Enkelt hvis du bare vil prøve appen.
   - Du trykker **Code > Download ZIP** i GitHub.
   - Så pakker du ut mappen lokalt.

2. **Klon prosjektet med Git**
   - Best hvis du vil oppdatere prosjektet senere.
   - Da kan du hente nye endringer med en kommando i stedet for å laste ned ZIP på nytt.

### Må jeg ha Node.js på maskinen min?

**Ja**, for denne appen kjører som en liten Node.js-server lokalt.

VS Code **erstatter ikke** Node.js. VS Code er bare editoren/verktøyet du bruker for å åpne filer og kjøre kommandoer. Selve appen trenger Node.js installert på maskinen.

Kort sagt:

- **VS Code** = verktøyet du jobber i
- **Node.js** = det som faktisk kjører appen

### Må jeg ha Git?

**Nei, ikke nødvendigvis.**

Hvis du bare vil kjøre appen lokalt, kan du laste ned ZIP fra GitHub og hoppe over Git.

Du bør bruke **Git** hvis du vil:

- oppdatere prosjektet enkelt senere
- lagre egne endringer på en ryddig måte
- samarbeide med andre
- ha versjonskontroll og kunne gå tilbake til tidligere versjoner

### Hva brukes Git til – og hvorfor?

Git er et **versjonskontrollsystem**. Det betyr at det holder orden på endringer i filene dine over tid.

Praktisk betyr det:

- du kan se hva som er endret
- du kan lagre “sjekkpunkter” med `commit`
- du kan hente oppdateringer fra GitHub med `pull`
- du kan publisere egne endringer med `push`

Hvis du bare skal bruke dashboardet internt og ikke endre mye, er Git mer et **pluss** enn et krav.

## Anbefalt enkleste måte å komme i gang på

Hvis du vil ha minst mulig friksjon, gjør dette:

1. Installer **Node.js LTS** på PC-en som skal kjøre dashboardet.
2. Last ned prosjektet fra GitHub som ZIP.
3. Pakk det ut i en mappe, for eksempel `C:\workspace-one-dashboard`.
4. Åpne mappen i VS Code.
5. Lag en `.env`-fil basert på `.env.example`.
6. Fyll inn Workspace ONE-verdiene dine.
7. Åpne terminal i VS Code.
8. Kjør `npm start`.
9. Åpne `http://localhost:3000` i nettleseren.
10. Sett nettleseren i fullscreen på skjermen.

## Steg-for-steg: slik bruker du appen

### Alternativ A – uten Git (lettest)

1. Gå til GitHub-repoet.
2. Klikk **Code**.
3. Velg **Download ZIP**.
4. Pakk ut ZIP-filen til en lokal mappe.
5. Åpne mappen i VS Code.
6. Åpne terminalen i VS Code.
7. Kopier `.env.example` til `.env`.
8. Fyll inn dine Workspace ONE-verdier i `.env`.
9. Kjør appen med `npm start`.
10. Åpne `http://localhost:3000` i Edge eller Chrome.

### Alternativ B – med Git (best hvis du vil oppdatere senere)

1. Installer Git på PC-en.
2. Åpne terminal eller VS Code.
3. Kjør:

```bash
git clone <repo-url>
cd <repo-mappe>
```

4. Kopier `.env.example` til `.env`.
5. Fyll inn konfigurasjonen din.
6. Start appen med:

```bash
npm start
```

7. Når du senere vil hente siste versjon fra GitHub, kjører du:

```bash
git pull
```

## Hvordan installere det du trenger

### 1. Installer Node.js

- Gå til Node.js sin nettside.
- Installer **LTS-versjonen**.
- Når installasjonen er ferdig, test i terminal:

```bash
node -v
npm -v
```

Hvis du får versjonsnummer tilbake, er Node.js riktig installert.

### 2. Installer VS Code (valgfritt, men anbefalt)

Du kan kjøre appen uten VS Code, men VS Code gjør det mye enklere å:

- redigere `.env`
- åpne prosjektmappen
- kjøre terminalkommandoer
- se logger og feil

### 3. Installer Git (valgfritt)

Installer Git bare hvis du vil jobbe med repoet på en ryddig måte over tid.

Test etter installasjon:

```bash
git --version
```

## Konfigurasjon

Kopier `.env.example` til `.env` og fyll inn verdiene:

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### macOS / Linux / Git Bash

```bash
cp .env.example .env
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
WS1_TARGET_APPS=["Bliksund EWA","Locus Mobile"]
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
DASHBOARD_CUSTOMER_NAME=Bliksund
DASHBOARD_BRAND_NAME=Field Operations Center
DASHBOARD_BRAND_TAGLINE=Workspace ONE UEM oversikt for enheter, appdistribusjon og aktivitet.
DASHBOARD_LOGO_PATH=/brand-mark.svg
DASHBOARD_ACCENT=#65d4ff
DASHBOARD_ACCENT_2=#7c89ff
DASHBOARD_PANEL_TINT=rgba(9, 23, 40, 0.86)
```

Hvis du vil bruke egen logo, kan du erstatte `public/brand-mark.svg` eller peke `DASHBOARD_LOGO_PATH` til en annen fil under `public/`.

## Starte appen

Når `.env` er klar, starter du appen slik:

```bash
npm start
```

Åpne deretter:

- `http://localhost:3000`

## Hva skjer når appen kjører?

Når du starter appen:

1. Node.js starter den lokale serveren.
2. Appen leser verdiene i `.env`.
3. Den henter token fra Workspace ONE.
4. Den henter enheter fra de valgte Organisation Groups.
5. Den prøver å hente appinventar per enhet.
6. Dashboardet vises i nettleseren.

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
