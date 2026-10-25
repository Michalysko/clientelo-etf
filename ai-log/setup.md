# Inicializace projektu — 2026-10-25

Tento soubor je technické shrnutí skutečně provedené práce, nikoli export konverzace.

## Zadání a AI prompty

Uživatel zadal inicializaci Next.js projektu s TypeScriptem, Tailwind CSS, App Routerem a ESLintem, přípravu `ai-log` a ověření lintem, buildem a spuštěním serveru. Následně výslovně požádal o implementaci předloženého plánu. Jde o shrnutí zadání, nikoli doslovnou citaci promptů. Úplné znění promptů a odpovědí doloží autentický export této konverzace; zatím nebyl dodán. Po jeho uložení sem doplníme odkaz na skutečný soubor.

## Výchozí stav

- Pracovní složka byla prázdná včetně skrytých souborů (`Get-ChildItem -Force`).
- `node --version`: `v24.22.0`.
- `npm --version`: `11.19.1`.
- `git --version`: `git version 2.56.0.windows.2`.

## Provedené kroky

Použitý inicializační příkaz:

```powershell
npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias '@/*' --use-npm --disable-git --yes
```

Volba `--disable-git` brání automatické inicializaci a prvnímu commitu. Generátor vytvořil projekt s Next.js `16.3.5`, React `19.2.8`, adresářem `src/` a aliasem `@/*` mapovaným na `./src/*`. Výchozí stránka, styly a metadata zůstaly ze šablony. Dokumentace `ai-log` vznikla pomocí nástroje `apply_patch`.

Po přerušení instalace kvůli TLS chybě byla podpora systémových certifikátů potvrzena příkazem `node --help | Select-String -Pattern 'system-ca|NODE_USE_SYSTEM_CA'`. Instalace pak úspěšně proběhla takto:

```powershell
$env:NODE_OPTIONS='--use-system-ca'; npm install
```

Ověřování TLS zůstalo zapnuté, nastavení platilo pouze pro daný proces. Instalace přidala 358 balíčků a oznámila jednu kritickou zranitelnost. Podrobnosti byly získány příkazem `$env:NODE_OPTIONS='--use-system-ca'; npm audit --json`. Audit označil Next.js a nabídl opravenou verzi `16.4.3`. Byla proto zahájena aktualizace:

```powershell
$env:NODE_OPTIONS='--use-system-ca'; npm install --save-exact next@16.4.3; if ($LASTEXITCODE -eq 0) { npm install --save-dev --save-exact eslint-config-next@16.4.3 }
```

## Zjištěné chyby

- První pokus o inicializaci v sandboxu selhal na `ENOTFOUND registry.npmjs.org`. Příkaz byl zopakován s vyžádaným síťovým oprávněním a vytvořil projekt.
- Pomocné hledání npm logu přes `$env:LOCALAPPDATA` nenalezlo adresář sandboxové cache. `npm config get cache` také selhalo, protože npm tuto volbu označilo jako chráněnou. `npm config get registry` vrátilo `https://registry.npmjs.org/`. Tyto diagnostické kontroly neměnily projekt.
- Opakovaná inicializace vytvořila soubory, ale instalace závislostí opakovaně hlásila `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Proces byl přerušen pomocí Ctrl+C. Použití systémových certifikátů Windows umožnilo dokončit `npm install`.
- npm upozornilo na ukončenou podporu ESLintu `9.39.5` a neschválený instalační skript `unrs-resolver@1.12.2`. Nebyl spuštěn `npm audit fix --force` ani schvalován dodatečný skript.
- První kombinovaný příkaz `npm run lint; npm run build` dokončil lint bez výpisu nálezů. Build byl záměrně přerušen před dokončením kvůli aktualizaci Next.js; nejde o úspěšné ověření buildu.

## Ověření

- Aktualizace `next` i `eslint-config-next` na `16.4.3` dokončena. Obě instalace zakončil npm audit výsledkem **0 zranitelností**. Přesné závislosti jsou zachycené v `package-lock.json`.
- Samostatné `npm run lint`: návratový kód **0**, bez nálezů.
- `npm run build` v sandboxu selhal při stahování výchozích fontů Geist a Geist Mono z Google Fonts. Opakování `$env:NODE_OPTIONS='--use-system-ca'; npm run build` se síťovým oprávněním: návratový kód **0**, úspěšná kompilace, kontrola TypeScriptu a statické generování `/` i `/_not-found`.
- `$env:NODE_OPTIONS='--use-system-ca'; npm run dev -- --hostname 127.0.0.1 --port 3000`: server oznámil připravenost. HTTP kontrola ze sandboxu byla zablokována oprávněními soketu; kontrola mimo sandbox na server uvnitř sandboxu skončila chybou připojení. Původní server byl ukončen pomocí Ctrl+C.
- Stejný příkaz pro vývojový server byl poté spuštěn mimo sandbox a ověřen příkazem níže. Výsledek: **HTTP 200**, `text/html; charset=utf-8`, přítomen text výchozí šablony `To get started`. Server sám zaznamenal `GET / 200`. Následně byl ukončen pomocí Ctrl+C.

```powershell
$ErrorActionPreference='Stop'
$response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 45
[pscustomobject]@{
  StatusCode=$response.StatusCode
  ContainsStarterText=$response.Content.Contains('To get started')
  ContentType=$response.Headers['Content-Type']
}
```

## Konečný stav

- Vytvořeny výchozí soubory v `src/app/`, SVG soubory v `public/`, konfigurace Next.js, TypeScriptu, Tailwind/PostCSS a ESLintu, `package.json`, `package-lock.json`, `.gitignore` a výchozí `README.md`.
- `next dev` automaticky vytvořil `AGENTS.md` s pokyny od Next.js; soubor byl přečten. `next-env.d.ts`, `node_modules/` a `.next/` jsou generované a ignorované přes `.gitignore`.
- Přidány `ai-log/README.md` a tento technický záznam. Autentický export konverzace stále chybí; nebyl vytvářen žádný smyšlený přepis.
- `Test-Path .git` vrátilo `False`: nevznikl Git repozitář ani commit.
- Nepřidány ETF komponenty, finanční data, kalkulačka, formulář, analytika ani finální design. Do souborů nebyly zapsány přístupové údaje, API klíče ani osobní údaje.
- Pro budoucí buildy je třeba počítat se síťovým stažením fontů výchozí šablony. Upozornění npm na ESLint 9 a instalační skript resolveru zůstávají zaznamenána výše; nebránila úspěšnému lintu, buildu ani HTTP kontrole.
