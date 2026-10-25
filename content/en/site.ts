// English copy — a faithful translation of content/th/site.ts. The TH file is the
// source of truth: a missing or extra key here fails `npm run typecheck`.
// Keys that have no approved English source carry the literal TODO(translate).
import type { SiteContent } from "../th/site";

export const en: SiteContent = {
  meta: {
    title: "RAE, Maejo University",
    description:
      "Committed to research, academic promotion and agricultural services that advance economic, social and environmental sustainability.",
  },
  header: {
    staffLogin: "Staff sign-in",
    orgShort: "RAE",
    // TODO(translate): the English name of the re-named office is not in any
    // approved RAE document yet, so it is not invented here.
    orgFull: "TODO(translate)",
    orgUniversity: "Maejo University",
    navLabel: "Main menu",
    navLabelMobile: "Main menu (mobile)",
    openMenu: "Open main menu",
    searchPlaceholder: "Search...",
    searchLabel: "Search (not available yet)",
    notAvailable: "Not available yet",
    languageLabel: "Change language",
  },
  nav: {
    home: "Home",
    about: "About us",
    research: "Research & innovation",
    services: "Academic services",
    documents: "Publications",
    news: "News & activities",
  },
  hero: {
    title: "Creating knowledge, driving agricultural innovation",
    titleAccent: "for sustainable communities and society",
    description:
      "Committed to research, academic promotion and agricultural services that advance economic, social and environmental sustainability.",
    primaryCta: "About us",
    secondaryCta: "Our services",
  },
};
