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
      subtitle: "(brief figures)",
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
  footer: {
    contactLabel: "Contact us",
    address: "63 Moo 4, Nong Han, San Sai, Chiang Mai 50290, Thailand",
    phone: "+66 53 873 400",
    phoneHref: "tel:+6653873400",
    email: "rae@mju.ac.th",
    rights: "All rights reserved",
  },
};
