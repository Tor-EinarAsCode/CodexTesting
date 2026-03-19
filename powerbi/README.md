# Power BI-oppsett

Denne mappen inneholder en enkel Power Query-fil som kan brukes som startpunkt for Power BI.

## Fremgangsmåte

1. Start dashboard-appen lokalt eller publiser den internt.
2. Åpne Power BI Desktop.
3. Velg **Blank Query**.
4. Lim inn innholdet fra `workspace-one-dashboard.pq` i Advanced Editor.
5. Bytt eventuelt URL-en `http://localhost:3000/api/dashboard` til din interne URL.
6. Utvid tabellene `comparison`, `platform`, `ownership`, `compliance` og `tracked_apps` til egne visuals.

## Anbefalte visuals

- Kort/KPI for `totalDevices`, `complianceRate` og `seenLast24h`
- Clustered bar chart for `platform`
- Donut chart for `ownership`
- Tabell for `tracked_apps` filtrert på `application = Bliksund EWA`
- Tabell for `tracked_apps` filtrert på `application = Locus Mobile`
