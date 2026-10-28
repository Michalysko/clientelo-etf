# Reklamní varianty A/B a vyhodnocení konverzí

Připraveno 28. 10. 2026 pro odevzdání náborového zadání Junior AI Developer, Clientelo. Základ auditu: commit `653798ec439a4323217943a47aafa8676bfbff20`. Reklamy nejsou spuštěné. Dokument neobsahuje výsledky kampaní. Obě varianty vedou na stejnou landing page a oba materiály jsou dostupné všem; testuje se sdělení reklamy, nikoli dvě verze webu. Landing page ani měřicí kód nebyly tímto krokem změněny.

## 1. Schválená atribuce bez změny kódu

Vlastník 28. 10. 2026 schválil používání pouze stávajícího vstupního URL parametru `utm_content`. `src/lib/analytics.ts`, funkce `campaignContext`, z něj načte povolenou hodnotu a do pojmenovaných analytických událostí přidá vlastnost `ad_variant`. `utm_content` je tedy vstup v odkazu, zatímco `ad_variant` je výstupní vlastnost události; není to podporovaný vstupní parametr. Alias se nezavádí a žádná oprava kontroleru není pro schválené odkazy potřeba.

| Schválený vstup při nové návštěvě | Vlastnost analytické události | Stav |
| --- | --- | --- |
| [Varianta A](https://etf-kompas-zeta.vercel.app/?utm_content=ad_a) | `ad_variant=ad_a` | Podporované |
| [Varianta B](https://etf-kompas-zeta.vercel.app/?utm_content=ad_b) | `ad_variant=ad_b` | Podporované |
| `/` bez rozpoznané varianty | `ad_variant=unknown` | Podporované |

Při původním auditu bylo chování ověřeno skutečným kontrolerem s mockovaným transportem, bez produkčních požadavků. Parametr ad_variant v URL se ignoruje; do reklamních odkazů jej nevkládat. Výběr podporovaných UTM odkazů uzavírá dřívější nesoulad URL kontraktu bez změny aplikace. Zachování kontextu při interní navigaci je popsáno níže.

## 2. Přesné reklamní texty

### Varianta A — Úspora na poplatcích

- **Nadpis:** Stejný index. Různé poplatky. Kolik vás stojí rozdíl?
- **Text:** Dva ETF fondy mohou sledovat stejný index, ale mít rozdílné náklady. Spočítejte si, jak se mohou projevit za 20 let.
- **CTA:** Spočítat rozdíl zdarma
- **Motivace:** finanční rozdíl způsobený náklady ETF, ověřený na vlastním modelovém scénáři. Nadpis nesmí být interpretován jako garantovaná úspora nebo příslib výnosu; landing page vysvětluje modelovaný rozdíl konečných hodnot.
- **Navržená cílová skupina:** česky mluvící dospělí začínající drobní investoři, kteří již znají pojem ETF a chtějí porovnat průběžné náklady. Jde o návrh publika, nikoli tvrzení o spuštěném cílení nebo parametrech reklamní platformy.
- **Schválená cílová URL:** https://etf-kompas-zeta.vercel.app/?utm_content=ad_a
- **Směrová hypotéza:** A může zvýšit zájem o report; průvodce zůstává dostupný a konverze se počítají i u něj.

### Varianta B — Jednoduchý začátek

- **Nadpis:** Chcete investovat do ETF, ale nevíte, který vybrat?
- **Text:** Porovnejte čtyři známé ETF, pochopte rozdíly a získejte zdarma průvodce pro začátečníky.
- **CTA:** Porovnat ETF zdarma
- **Motivace:** srozumitelné porovnání a vzdělávání, bez potřeby zadávat e-mail pro základní výsledek.
- **Navržená cílová skupina:** česky mluvící dospělí začátečníci se zájmem pochopit ETF. Pro samotné A/B srovnání použít stejné publikum jako u A; nesměšovat vliv sdělení s jiným cílením.
- **Schválená cílová URL:** https://etf-kompas-zeta.vercel.app/?utm_content=ad_b
- **Směrová hypotéza:** B může zvýšit zájem o průvodce; report zůstává dostupný a konverze se počítají i u něj.

Schválené odkazy obsahují pouze utm_content. Nerozlišují jménem platformu, medium ani campaign; není správné z nich automaticky dovozovat Meta nebo placenou návštěvnost. Varianta se rozliší přes UTM Content a vlastnost ad_variant. Ostatní povolené UTM v knihovně zůstávají technickou možností, nikoli součástí těchto schválených reklamních odkazů.

## 3. Události a jejich skutečné pokrytí

Všech osm pojmenovaných událostí dostává `ad_variant=ad_a/ad_b/unknown`. Bez souhlasu nebo mimo povolenou produkci se nic neodesílá. Pro každou z obou materiálových cest byly hodnoty ověřeny v mock transportu.

| Událost | Co skutečně znamená | Další informace a limity |
| --- | --- | --- |
| `landing_view` | První měřený vstup na `/` v daném vstupu kontroleru | Až po souhlasu; nejde o všechny příchody. Vedle ní jde jeden pageview bez názvu, nesčítat je. |
| `calculator_change` | Dokončená platná změna parametru na blur | Posílá pouze název pole, ne částku/výnos/horizont. Výchozí hodnoty ani každá klávesa nejsou interakce. |
| `etf_change` | Skutečná změna výběru ETF | Pouze povolený ticker a pozice; bez osobních údajů. |
| `form_view` | Observer potvrdil alespoň 10 % formuláře ve viewportu | Jednou na materiál a měřený vstup; mount ani neviditelná sekce nestačí. |
| `form_start` | První focus/pointer interakce s formulářem | Jednou na materiál, uvolní se až po `form_view`. Je to interakce, ne důkaz napsaného e-mailu. |
| `form_submit` | Platný pokus o POST po klientské validaci a splnění podmínek odesílání | Ne pouhé kliknutí, ne samotné zobrazení Turnstile. `attempt=first/repeat` rozlišuje pokusy. |
| `material_accepted` | Klient obdržel HTTP 202 a JSON `status=accepted` | Zachovává `material=report/guide`, `attempt` i variantu. Přijetí Resendem není doručení ani unikátní e-mail; retry může vrátit původní potvrzení. |
| `form_error` | Obecná chyba pokusu nebo validace | `material`, kategorie validation/verification/busy/server/network; není důkaz chyby poskytovatele. |

Formulářové události mají `material`, ale landing_view, calculator_change a etf_change jej nemají. **Globální filtr material=report/guide proto nesmí odstranit společné úvodní kroky funnelu.** Materiál je třeba filtrovat na odpovídajících krocích, pokud to konkrétní report umožňuje.

Kampaň vzniká až po souhlasu a drží se v paměti dokumentu. Běžný SPA návrat `utm_content=ad_a → soukromí → /` zachová A. Holé `/` po této interní cestě není nová neznámá akvizice. Nový dokument bez kampaně je unknown; reload ruší souhlas a paměťový kontext, znovu se čte dostupná URL až po novém opt-in. Předchozí aktivity se neposílají zpětně. Nová explicitní kampaň změní kontext; dokončení starého čekajícího POST se analyticky vynechá místo přiřazení k jiné variantě. Kontext se nepřenáší mezi kartami nebo zařízeními.

Payload i before-send používají allowlist: bez adres a jejich hashů, částek, výnosů, portfolia, UUID žádostí, idempotency klíčů, Turnstile tokenů nebo libovolných query. Umami přesto zpracovává síťová metadata a odvozené identifikátory podle [privacy-review.md](privacy-review.md); nelze tvrdit absolutní anonymitu.

## 4. Přesná definice funnelu

Požadovaná cesta uživatelského chování je:

1. `landing_view`.
2. Volitelně interakce s kalkulačkou: `calculator_change` nebo `etf_change`.
3. `form_view` pro zvolený materiál.
4. `form_start` pro tentýž materiál.
5. `form_submit` pro tentýž materiál.
6. `material_accepted` pro tentýž materiál.

**Hlavní konverzní funnel** je `landing_view → form_view → form_start → form_submit → material_accepted`, zvlášť pro report a guide. Krok kalkulačky není povinný: návštěvník může použít výchozí model nebo požádat o průvodce bez editace. Formulář může být navíc viditelný ještě před editací kalkulačky. Striktní šestikroková posloupnost by tak vyřadila platné konverze.

**Doplňkový diagnostický funnel** s calculator_change mezi landing a form_view lze sledovat pro tuto užší cestu, nikdy jej nepovažovat za všechny konverze. etf_change lze vyhodnotit odděleně; nepředpokládat podporu OR podmínek ve funnel kroku bez kontroly účtu. form_error je vedlejší diagnostika, nikoli povinný krok k úspěchu.

**Hlavní metrika A/B:** podíl měřených účastníků analytického reportu, kteří od landing_view dosáhnou alespoň jednoho material_accepted pro kterýkoli materiál, ve stejném období, atribuci a časovém okně. Vzorec `CR_v = 100 × U_v(landing_view → material_accepted) / U_v(landing_view)`, kde `v` je ad_a nebo ad_b a `U` musí být v čitateli i jmenovateli stejná jednotka účastníka podle použitého Umami reportu. Jednotku a skutečné filtry je nutné potvrdit v dashboardu; není to vlastní identifikace lidí. Pro tento hlavní dvoukrokový konverzní pohled se povinně nevyžaduje pozorování všech mezikroků.

Vedlejší metriky: samostatný CR_report a CR_guide, propady jednotlivých kroků, aktivita kalkulačky a počet chyb/pokusů. Report+guide procenta nesčítat: stejný účastník může získat oba materiály. Hlavní pohled s koncem material_accepted bez filtru materiálu počítá jejich sjednocení podle reportu. Prostý součet material_accepted dělený počtem landing_view je jen poměr událostí; retry a návraty jej mohou zvýšit i nad 100 %, není to konverzní poměr návštěvníků.

## 5. Co lze ověřit v Umami a co zatím ne

Oficiální dokumentace potvrzuje sekvenční funnel z URL/událostí, UTM přehled a vlastnosti událostí. U funnelu je Window maximální doba **mezi po sobě jdoucími kroky**, nikoli nutně limit celé cesty. Navržené jednotné nastavení je 60 minut mezi kroky pro obě varianty a oba materiály.

Vlastník potvrdil účet Hobby a sekce Events, Funnels, UTM; tento krok neotevíral přihlášený účet. **Neověřeno:** filtrování vlastnosti ad_variant v konkrétním funnelu, filtry material na jednotlivých krocích, jednotka deduplikace a přesné chování reportu při opakovaných vstupech. Nenazývat dvě samostatné tabulky počtů událostí spolehlivým sekvenčním funnelem.

Postup ručního ověření po samostatném schválení:

1. Použít podporované UTM odkazy a ověřit po souhlasu Network payload bez citlivých údajů; žádné požadavky před souhlasem/po odmítnutí.
2. V Events ověřit ad_variant u všech událostí a material u formulářových událostí. Nevyvolávat skutečný POST bez zvláštní autorizace vlastníka.
3. V UTM ověřit utm_content. Vytvořit či zkontrolovat dva stejně nastavené konverzní pohledy A/B a zvlášť materiálové cesty. Tento dokument je návod, nastavení účtu nebylo provedeno.
4. Ověřit, že varianta filtruje události celé cesty, nespojuje A start s B dokončením a že material filtr nemaže landing_view. Zkontrolovat deduplikaci opakovaných accepted podle skutečné jednotky reportu.
5. Pokud požadované filtry nejsou dostupné, prezentovat Events/Properties a UTM Views jako omezený rozpad počtů a označit nemožnost ověřeného materiálového/A/B funnelu. Nevyvozovat návštěvnický CR z poměru nesourodých počtů. Případný jiný report/export řešit odděleně, bez přidání vlastních návštěvnických ID.

Bez přístupu k účtu nelze slíbit, že současný Hobby dashboard všechny kombinace filtrů skutečně poskytne. Na úrovni aplikace jsou potřebné varianty a typy materiálu přítomné při použití podporovaného parametru.

## 6. Pracovní konverzní cíl — výslovně hypotéza

Navržený orientační cíl je **5 % měřených účastníků konverzního reportu s alespoň jedním material_accepted**. Není to dosažený výsledek, externí benchmark, předpověď ani příslib. Předpoklady: relevantní české publikum, shodná distribuce A/B, bezplatný užitečný materiál, přiměřeně rychlá mobilní stránka a funkční doručovací cesta. Pro demonstraci jde o zvolenou testovatelnou pracovní hranici, nikoli o statisticky odvozenou hodnotu.

Pokud by bylo možné získat 200 srovnatelných měřených účastníků na variantu, 5 % by odpovídalo 10 konvertujícím účastníkům. To je pouze aritmetická ilustrace: takový vzorek ani 10 konverzí nezaručuje průkazný rozdíl A/B. Malý nebo nulový skutečný provoz do 30. 10. 2026 uvést jako omezení; nenahrazovat ho smyšlenými výsledky.

Očekávaný směr: A může mít vyšší CR_report, B vyšší CR_guide; předem neurčujeme vítěze celkového CR. Shodné publikum, umístění, období a rozpočet, náhodné rozdělení pokud jej platforma podporuje. Neprohlašovat dvě nerovnoměrně doručované reklamy za čistý randomizovaný experiment. Před spuštěním stanovit délku, potřebný vzorek podle pilotní míry a minimálního zajímavého rozdílu; nevypínat variantu po prvních několika konverzích. Uvést čitatele/jmenovatele, absolutní rozdíl procentních bodů a nejistotu, nikoli jen relativní procenta. Bez reklamních nákladů nelze určit cenu za konverzi ani ekonomického vítěze.

## 7. Tři prioritizované hypotézy další optimalizace landing page

Jde o návrhy budoucích samostatných experimentů, žádná změna nebyla implementována. Nesměšovat je současně s testem reklamního sdělení.

| Priorita | Co testovat | Proč | Hlavní metrika | Očekávaný směr |
| --- | --- | --- | --- | --- |
| P1 | Současný nadpis versus stručnější vysvětlení stejného indexu a modelovaného rozdílu poplatků | Mobilní návštěvník musí rychle pochopit návaznost reklamy na výsledek; nezměnit model ani slibovat výnos | Celkový CR landing_view → material_accepted | Srozumitelnější vysvětlení může zvýšit CR a omezit odchody |
| P2 | Současný odstavec o reportu versus tříbodový výčet stejného obsahu „roční přehled, nákladovost, předpoklady“ přímo u CTA | Zpřesnit hodnotu materiálu před zadáním e-mailu bez dalších povinných polí | Podíl účastníků form_view report → material_accepted report | Konkrétnější nabídka může zvýšit reportový CR |
| P3 | Současné představení průvodce versus malá čitelná ukázka skutečné stránky/obsahu | Snížit nejistotu začátečníka, co po zadání adresy obdrží | Podíl účastníků form_view guide → material_accepted guide | Ukázka může zvýšit průvodcový CR; hlídat mobilní čitelnost a rychlost |

U všech sledovat i celkový CR obou materiálů, obecné chyby a přístupnost jako kontrolní metriky. Zlepšení jednoho materiálu nesmí být automaticky vydáno za zlepšení celého projektu.

## 8. Souhlas a hranice interpretace

Měření pokrývá pouze souhlasící, neblokované a technicky zaznamenané aktivity. Odmítnutí nic neomezuje; žádné zpětné doplňování aktivit. Povolení platí jen v dokumentu, po reloadu je potřeba nový opt-in; odmítnutí se pamatuje nejvýše 180 dní. Bez souhlasu nevzniká analytický záznam, proto samotné Umami neurčí počet všech odmítnuvších nebo celkovou míru souhlasu. Z těchto dat nelze spolehlivě odvodit konverzní poměr všech reklamních kliknutí.

Návštěva, unikátní návštěvník, pageview, vlastní landing_view, pokus a doručený e-mail nejsou zaměnitelné metriky. Umami používá odvozené identifikátory; jedna fyzická osoba se může rozdělit nebo více osob sloučit. Souhlas, blokování a výpadky mohou mít jinou četnost v každé variantě. Neprohlašovat výsledky za reprezentativní pro všechny návštěvníky. Žádné naměřené hodnoty v této dokumentaci nejsou.

## Primární zdroje ověřené 28. 10. 2026

- [Umami Funnel](https://docs.umami.is/docs/funnel): pořadí kroků a význam Window.
- [Umami Event data](https://docs.umami.is/docs/event-data): vlastnosti v Events/Properties.
- [Umami UTM](https://docs.umami.is/docs/utm): standardní UTM včetně utm_content, přehled Views.
- [Umami Metric definitions](https://docs.umami.is/docs/metric-definitions): URL/query, odvozené session a rozdíly metrik.

Dokumentační odkaz /docs/filtering nebyl nástrojem dostupný. Žádný závěr o konkrétních oprávněních nebo filtrech účtu se na jeho nedostupnosti nezakládá.
