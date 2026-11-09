// The one file buyers edit first: product name, copy, pricing and credit costs.
// Prices are in the smallest currency unit (cents). Nothing else in the codebase should
// hardcode a price, a credit amount or a model name.

export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  highlight?: boolean;
};

export type Plan = {
  id: string;
  name: string;
  /** Credits granted at the start of every billing period. */
  monthlyCredits: number;
  priceCents: number;
  features: string[];
};

export type SiteConfig = {
  name: string;
  tagline: string;
  description: string;
  supportEmail: string;
  links: { github: string; docs: string };
  /** ISO currency code for prices, lowercase (e.g. "usd"). */
  currency: string;
  billing: {
    /**
     * Which payment provider takes payments. "auto" uses the first one configured:
     * Polar (merchant of record, works for sellers in more countries), then Stripe.
     */
    provider: "auto" | "polar" | "stripe";
  };
  /** Credits every new account starts with. 0 turns the free trial off. */
  signupCredits: number;
  creditPacks: CreditPack[];
  plans: Plan[];
  /** Default cost per generation. A tool's own config can override its entry. */
  creditCosts: { chatMessage: number; image: number; video: number };
  ai: {
    /** Which text AI the chat tool uses. "auto" uses Anthropic if configured, else OpenAI. */
    textProvider: "auto" | "anthropic" | "openai";
  };
  jobs: {
    /** How many image/video generations one user can have running at once. */
    maxActivePerUser: number;
    /** A generation still unfinished after this long is marked failed and refunded. */
    timeoutMinutes: number;
  };
};

export const siteConfig: SiteConfig = {
  name: "IngotKit",
  tagline: "Launch a paid AI app on flat-rate hosting this weekend.",
  description:
    "Auth, credits, payments and AI image and video generation, already wired up. Built for Next.js and MySQL on Hostinger.",
  supportEmail: "support@example.com",
  links: {
    github: "https://github.com/IngotKit/ingotkit",
    docs: "https://github.com/IngotKit/ingotkit#readme",
  },
  currency: "usd",
  billing: { provider: "auto" },
  signupCredits: 20,
  creditPacks: [
    { id: "starter", name: "Starter", credits: 100, priceCents: 500 },
    { id: "creator", name: "Creator", credits: 500, priceCents: 2000, highlight: true },
    { id: "studio", name: "Studio", credits: 1500, priceCents: 5000 },
  ],
  plans: [
    {
      id: "pro-monthly",
      name: "Pro",
      monthlyCredits: 800,
      priceCents: 2500,
      features: ["800 credits every month", "All AI tools", "Priority generation queue"],
    },
  ],
  creditCosts: { chatMessage: 1, image: 5, video: 25 },
  ai: { textProvider: "auto" },
  jobs: { maxActivePerUser: 3, timeoutMinutes: 60 },
};
