# Kontrola úplnosti veřejného přepisu

[Úvod](README.md) · [Index](index.md)

## Rozsah

Zdroj obsahuje 6 281 záznamů. Výběr zahrnuje všech 64 skutečných textových vstupů uživatele, 174 průběžných zpráv asistenta, 62 závěrečných odpovědí asistenta a dvě další uživateli zobrazené otázky. Celkem 302 položek v původním pořadí, bez sloučení opakovaných požadavků.

První položka: ETF-0001, 2026-10-25T14:41:53.995Z. Poslední položka: ETF-0302, 2026-10-28T17:25:39.720Z.

| Část | Uživatel | Asistent | Rozsah ID |
|---|---:|---:|---|
| 01 | 12 | 55 | ETF-0001–ETF-0067 |
| 02 | 12 | 46 | ETF-0068–ETF-0125 |
| 03 | 8 | 34 | ETF-0126–ETF-0167 |
| 04 | 12 | 39 | ETF-0168–ETF-0218 |
| 05 | 14 | 48 | ETF-0219–ETF-0280 |
| 06 | 6 | 16 | ETF-0281–ETF-0302 |

## Automatické kontroly

- Počet, role, původní pořadí, časové značky a jedinečnost stabilních ID: ověřeno pro všech 302 položek.
- Všech šest etap mezi pěti kompakcemi: pokryto.
- Doslovnost: texty byly zpětně načteny z výsledných Markdown souborů a každý úsek mimo evidované redakce byl porovnán se zdrojem, včetně konců řádků a Unicode.
- Obě samostatné otázky: zachován text a hodnoty strukturovaných otázek a možností; formát JSON je prezentační rámování.
- Oplocení zpráv, kotvy, počet hlaviček, místní navigace a odkazy indexu: ověřeno. Původní Markdown uvnitř doslovných bloků se neopravuje a jeho odkazy ani obrázky se nenačítají.
- Původní soukromý zdroj a export: kontrola SHA-256 před převodem a po převodu.

## Počty bezpečnostních redakcí

Počty označují nahrazené výskyty, nikoli počet aktivních tajemství. Veřejný kontakt a osobní identita jsou redigovány kvůli minimalizaci údajů; korelační ID nejsou automaticky klasifikována jako hesla.

| Kategorie | Výskyty |
|---|---:|
| CESTA_PROJEKTU | 226 |
| E_MAIL | 9 |
| IDENTITA_UCTU | 5 |
| INTERNI_IDENTIFIKATOR | 10 |
| NEVEREJNA_KOMUNIKACE | 1 |
| ODKAZ | 11 |
| OSOBNI_DOMENA | 3 |
| OSOBNI_JMENO | 6 |
| REFERENCE_OTAZKY | 2 |
| SOUKROMA_CESTA | 11 |

## Omezení

Nejde o úplný technický export. Vynechané kategorie jsou vysvětleny v README. Pět kompakcí nemá dostupné čitelné souhrny. Šifrovaný nebo už zdrojem zkrácený obsah se nerekonstruuje. Historická tvrzení o testech, nasazení a doručení nejsou tímto převodem nezávisle ověřena. Kontextová kontrola a automatický screening nejsou matematickým důkazem absence všech možných osobních údajů. Nejasné hodnoty jsou ponechány redigované; soukromé důvody a pozice se nezveřejňují.

## Ochrana neveřejné komunikace

Na výslovné rozhodnutí vlastníka byla uvnitř ETF-0216 nahrazena jedna souvislá převzatá pasáž soukromé náborové korespondence včetně úplného zadání. Vlastní úvodní prompt a celá položka zůstávají zachovány. Nová redakce kategorie NEVEREJNA_KOMUNIKACE nahrazuje také dvě dřívější dílčí osobní redakce uvnitř této pasáže; proto se nesčítají jako další samostatné náhrady. V ostatních položkách nebyla nalezena další rozsáhlá doslovná kopie této komunikace. Vlastní interpretace, rozhodnutí a hodnocení zůstávají doslovné mimo ostatní evidované redakce.

## Závěrečný screening všech souborů

Všech devět souborů prošlo konečným automatickým screeningem bez nevyřešeného zbytkového nálezu. Nejasnosti byly redigovány a zaznamenány soukromě. Soubor nebyl zveřejněn.
