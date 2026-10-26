export interface Etf {
  ticker: string;
  fullName: string;
  issuer: string;
  /** SPY is a unit investment trust: its trustee is identified explicitly. */
  manager: string;
  managerRole: string;
  index: string;
  exchange: string;
  /** Percentage points; null is required for an unverified expense ratio. */
  annualExpenseRatioPercent: number | null;
  expenseRatioLabel: string;
  verificationStatus: "verified" | "unverified";
  sourceUrl: string;
  additionalSourceUrls: readonly string[];
  verifiedOn: string;
  sourceAsOf: string | null;
  previousTicker?: { ticker: string; changedOn: string; sourceUrl: string };
}

/** Manual source snapshot, not a live market data feed. Dates are ISO 8601. */
export const ETFS: readonly Etf[] = [
  {
    ticker: "SPY",
    fullName: "State Street® SPDR® S&P 500® ETF Trust",
    issuer: "State Street Investment Management",
    manager: "State Street Global Advisors Trust Company",
    managerRole: "Trustee",
    index: "S&P 500 Index",
    exchange: "NYSE Arca",
    annualExpenseRatioPercent: 0.0945,
    expenseRatioLabel: "Gross Expense Ratio",
    verificationStatus: "verified",
    sourceUrl: "https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy",
    additionalSourceUrls: [],
    verifiedOn: "2026-10-26",
    sourceAsOf: "2026-10-26",
  },
  {
    ticker: "SPYM",
    fullName: "State Street® SPDR® Portfolio S&P 500® ETF",
    issuer: "State Street Investment Management",
    manager: "SSGA Funds Management, Inc.",
    managerRole: "Investment Manager",
    index: "S&P 500 Index",
    exchange: "NYSE Arca",
    annualExpenseRatioPercent: 0.02,
    expenseRatioLabel: "Gross Expense Ratio",
    verificationStatus: "verified",
    sourceUrl: "https://www.ssga.com/us/en/individual/etfs/state-street-spdr-portfolio-sp-500-etf-spym",
    additionalSourceUrls: [],
    verifiedOn: "2026-10-26",
    sourceAsOf: "2026-10-26",
    previousTicker: {
      ticker: "SPLG",
      changedOn: "2025-10-31",
      sourceUrl: "https://www.ssga.com/library-content/products/fund-docs/etfs/us/information-schedules/ap-notice/notice-to-aps-ticker-fund-name-and-benchmark-index-name-changes-10-31-25.pdf",
    },
  },
  {
    ticker: "VOO",
    fullName: "Vanguard S&P 500 ETF",
    issuer: "Vanguard",
    manager: "Vanguard Capital Management",
    managerRole: "Management (issuer product page)",
    index: "S&P 500 Index",
    exchange: "NYSE Arca",
    annualExpenseRatioPercent: 0.03,
    expenseRatioLabel: "Expense ratio",
    verificationStatus: "verified",
    sourceUrl: "https://workplace.vanguard.com/assets/corp/fund_communications/pdf_publish/us-products/fact-sheet/F0968.pdf",
    additionalSourceUrls: ["https://advisors.vanguard.com/investments/products/voo/vanguard-sp-500-etf?fromSearch=true&source=autosuggest"],
    verifiedOn: "2026-10-26",
    sourceAsOf: "2026-09-30",
  },
  {
    ticker: "IVV",
    fullName: "iShares Core S&P 500 ETF",
    issuer: "iShares / BlackRock",
    manager: "BlackRock Fund Advisors",
    managerRole: "Investment adviser",
    index: "S&P 500 Index",
    exchange: "NYSE Arca",
    annualExpenseRatioPercent: 0.03,
    expenseRatioLabel: "Expense Ratio (current prospectus)",
    verificationStatus: "verified",
    sourceUrl: "https://www.ishares.com/us/products/239726/ishares-core-sp-500-etf-ivv",
    additionalSourceUrls: ["https://www.blackrock.com/us/individual/literature/prospectus/p-ishares-trust-us-sp-cap-non-sector-3-31.pdf"],
    verifiedOn: "2026-10-26",
    sourceAsOf: null,
  },
];
