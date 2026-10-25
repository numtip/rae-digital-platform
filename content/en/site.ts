// English copy — a faithful translation of content/th/site.ts. The TH file is the
// source of truth: a missing or extra key here fails `npm run typecheck`.
// Keys that have no approved English source carry the literal TODO(translate).
import type { SiteContent } from "../th/site";

export const en: SiteContent = {
  meta: {
    title: "RAE – The Office of Research and Academic Services, Maejo University",
    description:
      "Committed to research, academic promotion and agricultural services that advance economic, social and environmental sustainability.",
  },
  a11y: {
    skipToContent: "Skip to main content",
  },
  header: {
    staffLogin: "Staff sign-in",
    orgShort: "RAE",
    // Owner-supplied official English name (decision 2026-10-25). Never translate
    // the office name freely; the old Stitch wording is not used.
    orgFull: "The Office of Research and Academic Services",
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
  sections: {
    services: {
      title: "Our services",
      subtitle: "Academic services and knowledge transfer to society",
      more: "View all",
      items: [
        {
          title: "Analytical testing",
          description: "A standards-compliant laboratory for agricultural analysis",
        },
        {
          title: "Training and transfer",
          description: "Training courses, seminars and agricultural technology transfer",
        },
        {
          title: "Consultancy and advice",
          description: "Research and agricultural development advice for farmers and communities",
        },
        {
          title: "Facilities and equipment",
          description: "Research sites, trial plots and equipment for research",
        },
        {
          title: "Certification",
          description: "Professional certification of agricultural products",
        },
      ],
    },
    // Figures translated as-is from the TH source; they still need owner
    // confirmation there (see the note in content/th/site.ts).
    stats: {
      title: "Outputs and statistics",
      // Sample figures from the Stitch V2 design reference — not verified
      // organisational KPIs. Never present them as official numbers.
      subtitle: "(figures shown are from the design mock-up — the office website does not publish these statistics yet; pending confirmation)",
      more: "View all statistics",
      items: [
        { label: "Active research projects", value: "586", unit: "projects" },
        { label: "Publications", value: "1,248", unit: "articles" },
        { label: "Researchers and staff", value: "124", unit: "people" },
        { label: "Communities reached", value: "8,732", unit: "people" },
      ],
    },
    research: {
      title: "Featured research and innovation",
      more: "View all",
      items: [
        { tag: "Innovation", title: "Automated climate-controlled greenhouse crop system" },
        { tag: "Crops and production technology", title: "Drought-tolerant quality fragrant rice variety" },
        { tag: "Livestock and biotechnology", title: "Local microbial probiotics for animal health" },
      ],
    },
    news: {
      title: "News and activities",
      more: "View all",
      items: [
        { date: "20 May 2024", title: "Signing of a research and innovation cooperation agreement with partner agencies" },
        { date: "15 May 2024", title: "Workshop \"Safe crop production technology\" for a new generation of farmers" },
        { date: "10 May 2024", title: "The 10th Maejo University National Academic Conference" },
        { date: "5 May 2024", title: "Field visit following up the community quality-of-life project" },
      ],
    },
    knowledge: {
      title: "Knowledge hub",
      subtitle: "Access agricultural knowledge and publications",
      items: [
        { title: "Research database", description: "Search and browse research" },
        { title: "Publications", description: "Research reports, manuals and guidelines" },
        { title: "Agricultural knowledge base", description: "Knowledge and technology" },
        { title: "Journals and print", description: "Academic journals, online" },
        { title: "Media and multimedia", description: "Videos, teaching media, infographics" },
      ],
    },
  },
  notFound: {
    title: "Page not found",
    body: "The page you opened may have moved or been removed.",
    back: "Back to home",
  },
  footer: {
    contactLabel: "Contact us",
    address: "63 Moo 4, Nong Han, San Sai, Chiang Mai 50290, Thailand",
    phone: "+66 53 873 400",
    email: "rae@mju.ac.th",
    rights: "All rights reserved",
  },
};
