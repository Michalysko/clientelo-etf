"""Build the private seven-page guide. No environment files or network access."""
from pathlib import Path
import json
import subprocess
import re
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output/pdf/etf-od-nuly.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, filename in [("Sans", "arial.ttf"), ("SansBold", "arialbd.ttf"), ("Serif", "georgia.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(Path("C:/Windows/Fonts") / filename)))
pdfmetrics.registerFontFamily("Sans", normal="Sans", bold="SansBold", italic="Sans", boldItalic="SansBold")

INK, PAPER, GREEN, MUTED, LINE = map(HexColor, ["#173d35", "#f6f5ee", "#d6ee89", "#54665e", "#d4dbce"])
styles = {
    "body": ParagraphStyle("body", fontName="Sans", fontSize=11, leading=17, textColor=INK, spaceAfter=12),
    "title": ParagraphStyle("title", fontName="SansBold", fontSize=29, leading=34, textColor=INK, spaceAfter=18),
    "cover": ParagraphStyle("cover", fontName="SansBold", fontSize=40, leading=46, textColor=INK, spaceAfter=10),
    "sub": ParagraphStyle("sub", fontName="Serif", fontSize=20, leading=27, textColor=INK, spaceAfter=20),
    "small": ParagraphStyle("small", fontName="Sans", fontSize=9, leading=13, textColor=MUTED, spaceAfter=8),
    "source": ParagraphStyle("source", fontName="Sans", fontSize=9, leading=12, textColor=MUTED, spaceAfter=3),
    "kicker": ParagraphStyle("kicker", fontName="SansBold", fontSize=9, leading=14, textColor=MUTED, spaceAfter=14),
    "table": ParagraphStyle("table", fontName="Sans", fontSize=10, leading=15, textColor=INK),
    "tablehead": ParagraphStyle("tablehead", fontName="SansBold", fontSize=10, leading=15, textColor=PAPER),
}

data = json.loads(subprocess.run(["node", "--input-type=module", "-e", """
import {ETFS} from './src/data/etfs.ts';
import {compareInvestments} from './src/lib/investment.ts';
const funds=['SPY','SPYM'].map(t=>ETFS.find(f=>f.ticker===t));
const result=compareInvestments({monthlyContribution:5000,years:20,grossAnnualReturnPercent:7}, funds.map(f=>f.annualExpenseRatioPercent));
console.log(JSON.stringify({funds,result}));
"""], cwd=ROOT, capture_output=True, check=True, text=True, encoding="utf-8").stdout)

SOURCES = [
    ("Investor.gov / SEC: Exchange-Traded Funds", "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-24"),
    ("S&P Dow Jones Indices: S&P 500", "https://www.spglobal.com/spdji/en/indices/equity/sp-500/"),
    ("Vanguard: Income or accumulation", "https://www.vanguardinvestor.co.uk/articles/latest-thoughts/how-it-works/income-or-accumulation-which-option-is-right-for-you"),
    ("Evropská komise: pravidla PRIIPs/KID", "https://finance.ec.europa.eu/consumer-finance-and-payments/retail-financial-services/key-information-documents-packaged-retail-and-insurance-based-investment-products-priips_en"),
    ("LYNX: KID a omezení amerických ETF", "https://www.lynxbroker.com/service/products-and-regulations/regulations/key-information-document/"),
    ("State Street: SPY, ověřeno 26. 10. 2026", data["funds"][0]["sourceUrl"]),
    ("State Street: SPYM, ověřeno 26. 10. 2026", data["funds"][1]["sourceUrl"]),
    ("iShares: Co zkontrolovat při výběru ETF", "https://www.ishares.com/uk/individual/education/getting-started-with-etfs/investor-education/etf-checklist"),
    ("ESMA: společné otázky a odpovědi k PRIIPs/KID", "https://www.esma.europa.eu/sites/default/files/2023-05/JC_2023_22_-_Consolidated_JC_PRIIPs_Q_As.pdf"),
]

def p(text, style="body"):
    # Preserve intentional markup, escape bare ampersands in S&P and link labels.
    return Paragraph(re.sub(r'&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)', '&amp;', text), styles[style])

def box(title, text):
    table = Table([[p(title, "kicker")], [p(text)]], colWidths=[479])
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), GREEN), ("LEFTPADDING", (0, 0), (-1, -1), 14), ("RIGHTPADDING", (0, 0), (-1, -1), 14), ("TOPPADDING", (0, 0), (-1, 0), 12), ("BOTTOMPADDING", (0, -1), (-1, -1), 6)]))
    return KeepTogether([Spacer(1, 7), table, Spacer(1, 16)])

def grid(headers, rows, widths):
    cells = [[p(value, "tablehead") for value in headers]] + [[p(str(value), "table") for value in row] for row in rows]
    table = Table(cells, colWidths=widths, hAlign="LEFT")
    table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), INK), ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10), ("LINEBELOW", (0, 1), (-1, -1), .5, LINE)]))
    return KeepTogether([table, Spacer(1, 16)])

def heading(number, title, intro):
    return [p(f"{number:02d} / SEDM VĚCÍ PŘED PRVNÍ INVESTICÍ", "kicker"), p(title, "title"), p(intro, "sub")]

def cz(n):
    return f"{n:,.0f}".replace(",", " ") + " Kč"

story = []
story += [p("ETF KOMPAS / SROZUMITELNÝ PRŮVODCE", "kicker"), p("ETF od nuly", "cover"), p("7 věcí, které byste měli vědět před první investicí", "sub"), p("Zpracováno 26. 10. 2026 | Vzdělávací materiál", "small"), Spacer(1, 14)]
story += [p("01 / ETF: fond, který se obchoduje na burze", "kicker"), p("ETF sdružuje investice do portfolia. Nákupem jeho podílu získáte ekonomickou účast na tomto portfoliu. Nemusíte nakupovat každou jeho položku zvlášť. Portfolio může držet například akcie nebo dluhopisy; záleží na konkrétním fondu."), p("Podíl ETF se kupuje a prodává na burze během obchodního dne. Tržní cena se může odchýlit od hodnoty majetku připadajícího na podíl (NAV). Slovo ETF samo o sobě neříká, jak bezpečná investice je. [1]"), box("PŘEDSTAVTE SI KOŠ", "Akciové ETF může obsahovat mnoho společností. Tematické ETF ale může být úzce zaměřené. Počet položek sám o sobě není zárukou vyváženého rizika."), p("Ne každé ETF sleduje index. Existují také aktivně řízená, páková či inverzní ETF. Tento průvodce se soustředí na běžná nepáková indexová akciová ETF. Před nákupem vždy čtěte dokumentaci konkrétního fondu. [1, 8]"), p("Nejde o individuální investiční doporučení. Hodnota investice může klesnout a výnos není zaručen. Příklady nejsou příslibem budoucí výkonnosti.", "small")]
story.append(PageBreak())

story += heading(2, "ETF není jedna akcie", "Jedna firma a celý investiční koš jsou dvě různé expozice.")
story += [p("Akcie představuje podíl na konkrétní společnosti. Její výsledek může výrazně ovlivnit jeden produkt, vedení firmy nebo událost v jediném odvětví. Široké akciové ETF rozděluje expozici mezi více společností, ale společný tržní pokles tím nezmizí."), grid(["Otázka", "Jednotlivá akcie", "Široké akciové ETF"], [
    ["Co ovlivňuje výsledek?", "Konkrétní firma a její trh", "Složení a váhy celého portfolia"],
    ["Co průběžně sledujete?", "Zprávy a hospodaření firmy", "Index, náklady, replikaci a správu fondu"],
    ["Je riziko rozložené?", "Jedna firma", "Více firem; koncentrace však může zůstat"],
    ["Může cena klesnout?", "Ano", "Ano"],
], [120, 178, 181]), p("Ilustrační situace: pokud držíte jen akcii výrobce automobilů, problém této firmy zasáhne celou tuto investici. Pokud je stejná firma jednou z mnoha položek širokého ETF, přímý dopad se rozloží podle její váhy. To nechrání před poklesem celého trhu."), box("DIVERZIFIKACE MÁ HRANICE", "Dvě ETF mohou držet téměř stejné akcie. Přidání druhého fondu proto automaticky neznamená větší rozložení rizika. Porovnejte skutečné složení a překryv portfolií."), p("K porovnání patří náklady fondu, ale také provize, spread a případný převod měny u brokera. ETF nemá automaticky nulové náklady jen proto, že je pasivní. [1, 8]", "small")]
story.append(PageBreak())

story += heading(3, "Co znamená S&P 500", "Měřítko velkých amerických firem. Nikoli celý svět.")
story += [p("S&P 500 je index společnosti S&P Dow Jones Indices. Zahrnuje 500 předních amerických společností a slouží jako ukazatel segmentu velkých amerických akcií. Není to seznam všech světových firem ani účet, do kterého lze přímo vložit peníze. ETF se snaží jeho vývoj sledovat. [2]"), box("NE KAŽDÁ FIRMA MÁ STEJNÝ HLAS", "Index váží společnosti podle tržní kapitalizace upravené o volně obchodované akcie. Větší váha znamená větší vliv na výsledek indexu. Nejde o rozdělení peněz rovnoměrně mezi 500 firem. [2]"), p("Fondy SPY, SPYM, VOO a IVV v ETF Kompasu sledují tento index. Rozdíly v nákladovosti lze porovnat, skutečné čisté výnosy se ale mohou lišit i kvůli odchylce sledování, způsobu správy hotovosti nebo dalším nákladům. Model Kompasu izoluje jen nákladovost."), p("Americké společnosti často podnikají mezinárodně, přesto investice do S&P 500 není totéž jako široké globální akciové portfolio. Zůstáváte výrazně vystaveni americkému trhu a složení tohoto konkrétního indexu."), p("Před porovnáním dvou fondů si ověřte přesný název benchmarku a způsob, jak jej fond sleduje. Podobný ticker nebo název nestačí. Ani stejný index nezaručuje shodné obchodní podmínky nebo výsledek pro investora."), p("Otázka pro vás: rozumíte tomu, jaký trh kupujete, a jakou roli má mít tato část v celém vašem portfoliu?", "sub")]
story.append(PageBreak())

r = data["result"]
story += heading(4, "Malý poplatek. Dlouhý dopad.", "Roční nákladovost se promítá do hodnoty fondu průběžně.")
story += [p("Nákladovost není jednorázová vstupní platba. Je to roční poměr provozních nákladů k majetku fondu; fond je průběžně promítá do hodnoty podílu. Nezahrnuje automaticky všechny náklady vašeho investování. [1, 8]"), p("<b>Ilustrační model, nikoli předpověď:</b> počáteční investice 0 Kč, vklad 5 000 Kč na konci měsíce po dobu 20 let a stálý předpokládaný hrubý výnos 7 % ročně u obou fondů. Sazby níže byly ověřeny 26. 10. 2026 na stránkách emitenta. [6, 7]"), grid(["Fond", "Nákladovost ročně", "Modelová konečná hodnota"], [
    [data["funds"][0]["ticker"], str(data["funds"][0]["annualExpenseRatioPercent"]).replace(".", ",") + " %", cz(r["first"]["finalValue"])],
    [data["funds"][1]["ticker"], str(data["funds"][1]["annualExpenseRatioPercent"]).replace(".", ",") + " %", cz(r["second"]["finalValue"])],
], [80, 165, 234]), box("POUZE MODELOVANÝ ROZDÍL", f"Celkem vloženo {cz(r['first']['totalContributions'])}. Rozdíl konečných hodnot činí přibližně <b>{cz(abs(r['finalValueDifference']))}</b>. Není to garantovaná úspora ani součet skutečně stržených poplatků."), p("Model používá měsíční faktor ((1 + g) × (1 - f))^(1/12), kde g je hrubý výnos a f nákladovost v desetinném vyjádření. Výnosy reinvestuje, částky zaokrouhluje až při zobrazení. Počítá přímo stejnou funkcí jako kalkulačka ETF Kompasu."), p("Skutečný výnos kolísá a nákladovost se může změnit. Model nezahrnuje daně, inflaci, změny kurzu, provize brokera ani spread. Vyšší modelová hodnota není doporučením fondu. Částky nejsou historická výkonnost.", "small")]
story.append(PageBreak())

story += heading(5, "Kam putují dividendy", "Akumulační a distribuční třída řeší příjem různě.")
story += [p("Když společnosti v portfoliu vyplácejí dividendy, fond s nimi nakládá podle své distribuční politiky. U <b>akumulační třídy</b> příjem zůstává ve fondu a reinvestuje se. U <b>distribuční třídy</b> se vyplácí investorům. Výplaty nejsou zaručené a mohou se měnit. [3, 8]"), grid(["Varianta", "Co uvidíte", "Na co myslet"], [
    ["Akumulační / Acc", "Příjem zůstává uvnitř fondu", "Nedostáváte jej jako samostatnou hotovost na účet"],
    ["Distribuční / Dist", "Příjem přichází jako výplata", "Reinvestování může vyžadovat další krok nebo náklady"],
], [118, 180, 181]), p("Distribuce není bonus navíc k celkové hodnotě investice. Peníze, které z fondu odejdou, už nejsou součástí jeho majetku. Při srovnávání má proto smysl sledovat celkový výnos včetně výplat, nikoli jen růst ceny jednoho podílu."), box("STEJNÝ INDEX, JINÁ TŘÍDA", "Dvě třídy stejného fondu mohou mít stejnou investiční expozici a lišit se tím, co dělají s příjmem. Zkontrolujte ISIN a distribuční politiku v dokumentaci, ne pouze zkratku v názvu."), p("Akumulace sama o sobě neznamená univerzální osvobození od daní. Daňové dopady závisí na vaší situaci, daňové rezidenci a aktuálních pravidlech; tento průvodce je nepočítá. Konkrétní otázky řešte s kvalifikovaným odborníkem."), p("Kalkulačka ETF Kompasu předpokládá úplné reinvestování výnosů bez dodatečných nákladů. Takto zjednodušený model nemusí odpovídat způsobu, jak skutečně nakládáte s výplatami.", "small")]
story.append(PageBreak())

story += heading(6, "Riziko není jen červené číslo", "Dlouhý horizont pomáhá plánovat. Ztrátu ale nevylučuje.")
story += [p("<b>Tržní riziko:</b> cena akciového ETF může významně klesnout. <b>Koncentrace:</b> několik velkých firem nebo jedno odvětví může mít výrazný vliv. <b>Likvidita a spread:</b> v napjaté situaci mohou být podmínky nákupu a prodeje horší. [1, 8]"), p("<b>Měnové riziko:</b> výsledek v korunách závisí i na měnovém vývoji. Obchodování ETF v eurech samo o sobě neodstraňuje expozici vůči dolaru nebo jiným měnám jeho aktiv. Měnové zajištění je samostatná vlastnost, kterou je třeba ověřit."), box("ČISTĚ ARITMETICKÝ PŘÍKLAD KURZU", "Hodnota investice zůstane 100 USD. Při modelovém kurzu 25 Kč/USD je to 2 500 Kč, při 22 Kč/USD jen 2 200 Kč. Jde o zvolené ilustrační kurzy, ne aktuální data nebo prognózu. Bez poplatků a daní."), p("Volatilita znamená kolísání. Ztráta 20 % vyžaduje následný růst 25 %, aby se hodnota vrátila na začátek: 100 → 80 → 100. Také toto je jen matematický příklad. Vyhlazená křivka kalkulačky skutečné pořadí růstů a propadů neukazuje."), p("Před investicí uvažujte o finanční rezervě, době, kdy budete peníze potřebovat, a o schopnosti snést pokles bez nuceného prodeje. Delší čas sám o sobě neposkytuje záruku návratu na původní hodnotu."), p("Nepůjčujte modelu větší jistotu, než má. Minulá výkonnost ani pravidelné investování nezaručují budoucí zisk.", "sub")]
story.append(PageBreak())

story += heading(7, "Než zadáte první pokyn", "Ověřte produkt, dostupnost i své vlastní předpoklady.")
story += [p("Evropská <b>UCITS ETF</b> podléhají evropskému fondovému rámci; označení však neznamená záruku zisku ani automatickou vhodnost pro každého. U amerických ETF může evropskému retailovému investorovi chybět požadovaný dokument <b>KID</b>, a broker proto nákup zablokuje. Americký prospekt nebo factsheet jej nenahrazuje. Dostupnost ověřte u brokera. [4, 5, 9]"), p("<b>Vlastní kontrolní seznam</b><br/>1. Jaký index, aktiva a region fond drží?<br/>2. Odpovídá ISIN správné třídě a distribuční politice?<br/>3. Jaká je replikace, měnová expozice a případné zajištění?<br/>4. Jaké jsou průběžné i transakční náklady?<br/>5. Rozumím KID, rizikům a podmínkám brokera?<br/>6. Odpovídá horizont a velikost investice mé situaci?"), p("ZDROJE A DATUM", "kicker"), p("Zpracováno a zdroje kontrolovány 26. 10. 2026. Odkazy jsou klikatelné. Údaje se mohou měnit; před rozhodnutím je znovu ověřte.", "small")]
for i, (label, url) in enumerate(SOURCES, 1):
    story.append(p(f'<a href="{url}" color="#173d35">[{i}] {label}</a>', "source"))
story += [Spacer(1, 7), p("Vzdělávací materiál ETF Kompasu. Nikoli individuální investiční doporučení, daňová rada ani nabídka konkrétního produktu. Za rozhodnutí odpovídá investor.", "small")]
story += [box("TEĎ SI VYZKOUŠEJTE VLASTNÍ SCÉNÁŘ", "<b>Vraťte se do kalkulačky ETF Kompasu.</b><br/>Změňte vklad, horizont a výnos. Porovnejte vliv nákladovosti."), p('Vraťte se do kalkulačky ETF Kompasu: <a href="https://etf-kompas-zeta.vercel.app/#kalkulacka" color="#173d35">https://etf-kompas-zeta.vercel.app/#kalkulacka</a>', "small")]

def decorate(c, doc):
    c.saveState()
    c.setFillColor(PAPER); c.rect(0, 0, 595.2756, 841.8898, fill=1, stroke=0)
    c.setFillColor(INK); c.setFont("SansBold", 13); c.drawString(46, 805, "ETF Kompas")
    c.setFont("Sans", 8); c.setFillColor(MUTED); c.drawRightString(549, 807, "V ČÍSLECH JASNO. V ROZHODNUTÍ VLASTNÍ SMĚR.")
    c.setStrokeColor(LINE); c.line(46, 789, 549, 789); c.line(46, 49, 549, 49)
    c.setFont("Sans", 8); c.drawString(46, 32, "Vzdělávací materiál | Bez záruky výnosu | 26. 10. 2026")
    c.setFont("SansBold", 9); c.drawRightString(549, 32, f"{doc.page} / 7")
    c.restoreState()

def deterministic_canvas(*args, **kwargs):
    kwargs["invariant"] = 1
    return canvas.Canvas(*args, **kwargs)

doc = SimpleDocTemplate(str(OUT), pagesize=(595.2756, 841.8898), rightMargin=46, leftMargin=46, topMargin=70, bottomMargin=65, title="ETF od nuly: 7 věcí, které byste měli vědět před první investicí", author="ETF Kompas", pageCompression=1)
doc.build(story, onFirstPage=decorate, onLaterPages=decorate, canvasmaker=deterministic_canvas)
from pypdf import PdfReader
reader = PdfReader(OUT)
assert len(reader.pages) == 7, f"Expected 7 pages, got {len(reader.pages)}"
assert all("\ufffd" not in page.extract_text() for page in reader.pages)
print(f"Created {OUT.name}: {len(reader.pages)} pages, {OUT.stat().st_size} bytes")
