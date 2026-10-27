# Opravy po auditu Umami — 27. 10. 2026

## Skutečné zadání a rozhodnutí

Zdroj: aktuální konverzace s uživatelem, zadání „ETF Kompas – oprava problémů nalezených auditem Umami“. Autentický export konverzace zatím není součástí tohoto záznamu; tento soubor je pracovní souhrn, nikoli smyšlený přepis.

Požadavky: bezpečné odvolání při selhání storage, původní atribuce čekajícího požadavku, pořadí form_view/form_start, návrat ze stránky soukromí a expirace. Bez commitu, deploymentu, skutečných e-mailů a produkčních analytických událostí.

## Provedené opravy

- Konzervativní změna: povolení platí pouze v paměti aktuálního dokumentu. Reload vyžaduje nové výslovné povolení. Starší uložená povolení se neobnovují. Odmítnutí se ukládá nejvýše na 180 dní; chyba uložení má pravdivé upozornění, nikoli potvrzení trvalého uložení. Odvolání ihned zavírá odesílací bránu, bez závislosti na fragmentu URL.
- BroadcastChannel přenáší pouze konstantní oznámení odmítnutí; doplňuje storage události. Pokud prohlížeč zablokuje oba mechanismy, okamžité zastavení jiné izolované karty nelze garantovat. Nový dokument přesto nikdy automaticky nepřebírá povolení.
- Obnova z BFCache vyžaduje nové povolení. Controller kontroluje expiraci před odesláním; neplatné nebo expirované záznamy se podle dostupnosti storage odstraňují.
- Kontext pokusu je svázán s epochou analytické navigace. Dokončení starého požadavku po změně vstupu se vynechá a nikdy nepřevezme novou reklamu. Nepřidávají se návštěvnické identifikátory ani analytické idempotency klíče.
- První interakce a navazující události čekají v omezené paměťové frontě na skutečný IntersectionObserver form_view. Emituje se view, start a následné události; mount sám zobrazení neznamená.
- Povolený kontext kampaně zůstává pouze v paměti během klientské navigace přes stránku soukromí. Nová explicitní kampaň jej nahradí; neplatná explicitní atribuce je unknown. Úplný reload kontext nezachovává. Samostatný observer useSearchParams v Suspense zachycuje i změny query bez změny cesty.
- Aktualizovány informace na stránce soukromí, README a analytická dokumentace. Výpočty, ETF data, serverové endpointy a doručovací validace se nemění.

## Skutečné ověření

- Kompletní npm test s lokálním UMAMI_TRACKER_TEST_FILE: 83/83 prošlo, žádný přeskočený test. Fixture trackeru byla již dostupná v dočasné složce; jeho požadavky běží v izolovaném VM s náhradním fetch, nikoli proti produkční analytice.
- Regrese: starý grant → chyba zápisu odmítnutí → reload → změna fragmentu → obnovení storage → focus; více karet; BFCache; expirace; pozdní IntersectionObserver; čekající POST při ad_a → ad_b; návrat přes stránku soukromí; opětovné povolení.
- ESLint a npx tsc --noEmit prošly. Produkční npm run build -- --webpack s NODE_OPTIONS=--use-system-ca prošel. Během kontroly se objevila TypeScript chyba testovacího mocku „hub possibly undefined“; byla opravena a finální build již prošel.
- Lokální produkční server na portu 3010: druhá karta vyžadovala vlastní povolení; odmítnutí v první se promítlo do druhé. V obou byl počet načtených Umami skriptů nula díky produkčnímu guardu. Toto není browser důkaz vypnutí aktivního produkčního trackeru; tento stav pokrývají izolované testy.
- Kalkulačka bez souhlasu: změna měsíčního vkladu z 5000 na 10000 aktualizovala rozdíl z 22 787 Kč na 45 574 Kč. Přítomny oba formuláře, bez jejich odeslání. Desktop bez horizontálního přetékání.
- Pokus o viewport 375 px nebyl průkazný: DOM nadále hlásil 1280 px. Mobilní vizuální kontrola tedy zůstává ručním úkolem, nikoli deklarovaným úspěchem.

## Zbývající ověření

Reálný produkční Network panel a Umami dashboard až po samostatně schváleném nasazení. Ručně zkontrolovat 375 px, blokování obou synchronizačních mechanismů a browser-specifické BFCache chování. Neodesílaly se skutečné e-maily ani produkční Umami události. Nebyl proveden commit, push ani deployment.
