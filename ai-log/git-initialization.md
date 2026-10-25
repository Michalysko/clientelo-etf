# Kontrola před prvním commitem — 2026-10-25

Technické shrnutí skutečné práce; nejde o autentický export konverzace. Uživatel požádal o kontrolu Git stavu, inicializaci repozitáře a první lokální commit bez vzdáleného repozitáře. Po upozornění na neúplná pravidla ignorování výslovně schválil jejich doplnění a commit. Toto je shrnutí promptů; autentický export zatím není uložen.

## První kontrola a nalezený problém

- `Test-Path .git` vrátilo `False`; `git status --short --branch` potvrdilo, že složka není Git repozitář.
- `git init` úspěšně vytvořilo prázdný repozitář na větvi `master`.
- Byly přečteny konfigurační soubory, zdrojové soubory, SVG a dokumentace. Textový obsah včetně lockfilu byl prohledán pomocí `rg` na soukromé klíče, běžné tokeny, hesla, autentizační URL a e-mailové adresy. Nebyly nalezeny citlivé údaje. Favicon pochází z výchozí šablony.
- `git check-ignore -v` potvrdilo ignorování `node_modules`, `.next`, `.env`, `.env.local`, `.env.production`, vnořeného `.env.local` a `*.pem`.
- Stejná kontrola ukázala, že `private.key`, `credentials.p12`, `.npmrc` a `.aws/credentials` ignorovány nejsou. Šlo o testovací názvy předané příkazu, nikoli vytvořené soubory.
- Práce byla před commitem zastavena a problém oznámen uživateli. `git remote -v` nevypsalo žádný vzdálený repozitář.

## Schválená oprava

Stávající `.gitignore` byl zachován a rozšířen o soukromé klíče a úložiště klíčů, běžné soubory přístupových údajů, lokální konfigurace npm a cloudových nástrojů, adresáře SSH, lokální nastavení editorů a soubory operačního systému. Úpravy byly provedeny nástrojem `apply_patch`. V repozitáři nejsou ukládány skutečné přístupové údaje.

## Kontrola po opravě

- `git check-ignore -v` znovu potvrdilo původní pravidla i nově přidané testovací cesty pro klíče, npm, SSH, cloudové přístupy, `secrets.json`, service account JSON a nastavení VS Code. Žádné testovací soubory nebyly vytvářeny.
- První `git add -- .` v sandboxu selhalo na oprávnění k `.git/index.lock`; příkaz byl úspěšně zopakován s vyžádaným oprávněním. Kontroly původně spuštěné po neúspěšném přidání nebyly považovány za platnou kontrolu obsahu a byly zopakovány po úspěšném přidání.
- Git oznámil budoucí převod LF na CRLF v některých pracovních souborech. Nastavení konců řádků nebylo měněno.
- `git diff --cached --check` skončilo kódem **0**.
- `git diff --cached --stat` a `git diff --cached --name-only` ukázaly **21 souborů**: výchozí zdroje, konfigurace, veřejné obrázky, npm lockfile a dokumentaci. V indexu nejsou závislosti, buildy ani lokální přístupové údaje.
- `git grep --cached -l -I -i -E` nad textovými soubory v indexu hledalo hlavičky soukromých klíčů, běžné AWS/GitHub/API tokeny, autentizační položky, URL s heslem a e-mailové adresy. Skončilo kódem **1** bez nálezů. Jde o kontrolu běžných vzorů doplněnou předchozím čtením souborů, nikoli záruku detekce všech myslitelných tajných údajů.
- `git remote -v` zůstalo prázdné. Nebyl vytvořen vzdálený repozitář ani nic odesláno.
- Tento záznam je připraven před prvním commitem s uživatelem schválenou zprávou `chore: initialize Next.js project and AI documentation`. Výsledek commitu bude ověřen následným čtením Git stavu a oznámen v chatu; vlastní hash není součástí tohoto souboru.
