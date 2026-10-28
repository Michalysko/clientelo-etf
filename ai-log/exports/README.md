# ETF Kompas — autentická redigovaná historie vývoje

Tento balíček je přepis skutečné uživatelské komunikace při vývoji praktického zadání Clientelo. Obsahuje 64 uživatelských vstupů a 238 položek asistenta (174 průběžných zpráv, 62 závěrečných odpovědí a dvě samostatně zobrazené otázky). Není úplným technickým exportem relace ani nově napsanou rekonstrukcí vývoje.

## Jak přepis číst

Šest částí navazuje v původním pořadí zdrojových záznamů, bez řazení podle významu nebo oprav historických tvrzení. Každá položka má stabilní ID ETF-0001 až ETF-0302, původní roli a dostupnou původní časovou značku v UTC. ID jsou deterministicky odvozena z pořadí vybraných položek, nikoli z osobních identifikátorů.

Texty zpráv jsou zachovány doslovně mimo výslovně označené bezpečnostní redakce. Chyby, opravy, neúspěšné pokusy, opakované požadavky, rozhodnutí a tvrzení o kontrolách zůstávají historickým obsahem. Export nepotvrzuje pravdivost každého historického tvrzení asistenta. Přijetí e-mailu poskytovatelem například není automaticky důkaz doručení.

Doslovné zprávy jsou v oplocených textových blocích. Jejich původní Markdown, kód, instrukce, obrázkové odkazy a místní citace se tak nevykonávají ani automaticky nenačítají. Původní formátování uvnitř bloků není dodatečně opravováno. Hlavičky, navigace a poznámky exportu jsou nový redakční aparát, nikoli historické zprávy.

## Rozsah a transparentní vynechání

Nezařazujeme 23 vývojářských zpráv, systémové instrukce a kontext prostředí, interní úvahy modelu, interní metadata, technická volání nástrojů ani jejich technické výsledky. Ze záznamů s rolí user vynecháváme deset automatických kontextů: čtyři kontexty prostředí, pět stavů otevřené stránky a jeden blok instrukcí repozitáře. Kontext vložený přímo uvnitř skutečného textového vstupu není potichu odstraněn.

746 volání nástrojů a 746 odpovídajících výsledků není součástí tohoto veřejného přepisu. Příkazy, chybová hlášení a výsledky citované přímo ve skutečných zprávách zůstávají zachovány po případné bezpečnostní redakci. Technické události, které duplikují zprávy, nejsou dalšími položkami. Dvě samostatné otázky asistenta jsou výjimkou: jejich zobrazení uživateli je doloženo událostí a běžný záznam zprávy chybí. Jejich text a strukturované možnosti jsou uvedeny pod jediným ID.

Ve zdroji je pět kompakčních záznamů. **Žádný neobsahuje dostupný čitelný souhrn; souhrnný obsah je šifrovaný.** Náhradní historie kompakcí se nepřičítá k původním zprávám a šifrovaný obsah se nerekonstruuje. Hranice kompakcí rozdělují přepis na šest částí. Úplnost je ověřena vůči dostupnému JSONL; nezaručuje zprávy, které ve zdroji nikdy nebyly, ani obnovu dříve zkráceného obsahu.

## Redakce a soukromí

Zástupná označení mají tvar [REDAKCE: KATEGORIE 001]. Stejná hodnota ve stejné kategorii má konzistentní označení v celém balíčku. Nahrazují pouze konkrétní citlivé úseky. Soukromé kořeny projektových cest jsou nahrazeny při zachování relativních přípon tam, kde je lze spolehlivě oddělit. Osobní jméno a doložený veřejný kontaktní e-mail jsou minimalizovány i přesto, že byly v historii určeny pro veřejný web; nejsou tím označeny za tajné klíče. Redigovány jsou rovněž identifikátory účtů, soukromé lokální cesty, korelační identifikátory a nejisté odkazy.

Názvy proměnných prostředí, názvy služeb, veřejné projektové a referenční odkazy s prověřeným účelem, loopbackové příklady a neškodné výukové hodnoty zůstávají zachovány. Přístupový či osobní charakter nejasné hodnoty se nepovažuje za vyloučený jen kvůli absenci shody s regulárním výrazem; takové hodnoty jsou ponechány redigované. Přesné pozice a důvody jsou evidovány pouze v soukromém kontrolním reportu, nikoli v tomto balíčku.

## Ochrana neveřejné komunikace

Převzatá soukromá náborová korespondence a úplné znění zadání byly na výslovné rozhodnutí vlastníka projektu nahrazeny označením redakce kategorie NEVEREJNA_KOMUNIKACE. Jedna souvislá převzatá pasáž byla redigována uvnitř položky ETF-0216; vlastní úvodní prompt zůstává zachovaný. Označení znamená ochranu neveřejné komunikace třetí osoby, nikoli nalezení tajného klíče.

Vlastní prompty autora projektu, jeho interpretace požadavků, technická rozhodnutí a vlastní hodnocení asistenta zůstávají zachovány. Všech 302 položek má původní pořadí, role a časové značky i stabilní ID. Tento přepis není úplným doslovným zveřejněním všech textů zpráv: doslovnost platí pouze mimo transparentně označené redakce. Původní znění odstraněných pasáží ani soukromé redakční mapování nejsou součástí veřejného balíčku.

## Navigace

- [Část 01](01.md): ETF-0001–ETF-0067, 12 vstupů uživatele a 55 položek asistenta.
- [Část 02](02.md): ETF-0068–ETF-0125, 12 vstupů uživatele a 46 položek asistenta.
- [Část 03](03.md): ETF-0126–ETF-0167, 8 vstupů uživatele a 34 položek asistenta.
- [Část 04](04.md): ETF-0168–ETF-0218, 12 vstupů uživatele a 39 položek asistenta.
- [Část 05](05.md): ETF-0219–ETF-0280, 14 vstupů uživatele a 48 položek asistenta.
- [Část 06](06.md): ETF-0281–ETF-0302, 6 vstupů uživatele a 16 položek asistenta.

- [Index všech 302 položek](index.md)
- [Kontrola úplnosti a omezení](kontrola-uplnosti.md)

Zamýšlené konečné umístění v repozitáři je `ai-log/exports/`. Tento balíček byl připraven v soukromém pracovním umístění; jeho vytvoření samo o sobě není zveřejnění.
