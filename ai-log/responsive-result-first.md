# Výsledek kalkulačky před nastavením — 27. 10. 2026

Zadání uživatele: přesunout celý výsledkový panel před nastavení v DOM i vizuálně; zachovat společný stav, výpočty a obě e-mailové integrace. Přidat tři zadané výhody pouze na desktop a ověřit 375/390 px a desktop. Tato poznámka je shrnutí skutečné práce, nikoli autentický export konverzace; export dosud není uložen.

Provedeno: přesun existujícího JSX bloku v calculator.tsx bez duplikace stavu; chybový text nyní odkazuje na nastavení níže. V page.tsx přidán seznam tří výhod s dekorativními šipkami. globals.css jej zobrazuje od 1100 px (na mobilu/tabletu display:none) a mírně zkracuje mezery v mobilním úvodu. Žádné nové závislosti, změny modelu, dat, formulářů nebo serverových endpointů.

Přečten místní Next.js průvodce node_modules/next/dist/docs/01-app/01-getting-started/11-css.md. Původně hledaný guides/styling.md neexistoval; nalezen správný soubor. Pokus použít Python pro lokální editaci skončil chybou launcheru při hledání runtime; projektové soubory změněny až následným Node skriptem. První kontroly běžely před úpravami a byly poté zopakovány nad finálními zdroji.

Ověření: npm test 57/57, npm run lint bez chyb; git diff --check bez chyb (Git pouze upozorňuje na normalizaci LF/CRLF). Prohlížeč lokálního dev serveru: DOM pořadí calculator-results → calculator-inputs → report-offer → methodology; právě dva formuláře. Šířky 375, 390, 1024 a 1440 px bez horizontálního přetékání; výhody skryté do 1099 px a viditelné na 1440 px. Na 375 px hlavní číslo začíná přibližně na 495 px, na 390 px přibližně na 501 px. Vizuálně prohlédnut výsledek, nastavení a desktopové výhody. Změna měsíčního vkladu 5000 → 10000 přepočetla rozdíl 22 787 → 45 574 Kč; výběr SPY/SPY zobrazil 0 Kč. Poté obnoveny výchozí hodnoty. Klávesnicový Tab přechází mezi zachovanými vstupy. Žádný formulář nebyl odeslán, CAPTCHA nebyla ručně řešena. Reálné doručení nebylo v této etapě testováno; stávající mockované testy obou formulářů prošly.

Build: používán dokumentovaný npm run build -- --webpack s NODE_OPTIONS=--use-system-ca. První sandboxovaný pokus selhal na EPERM při mkdir v .next/server/app/_global-error.segments; TypeScript a kompilace předtím prošly. Opakován mimo sandbox. Windows Application Control nadále blokuje nativní SWC a Next používá WASM fallback; bezpečnostní nastavení nebylo měněno.

Bez commitu, push, deploymentu a odesílání e-mailů.

Výsledek opakovaného produkčního buildu mimo sandbox: úspěch, exit 0; kompilace, TypeScript, předgenerování všech stránek a build traces dokončeny. Dodatečné porovnání s HEAD potvrdilo shodu stavu/výpočetní části a obsahu výsledkového panelu (s výjimkou směrového slova v chybové větě).
