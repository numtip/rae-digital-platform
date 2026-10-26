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
  breadcrumbLabel: "Breadcrumb",
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
    searchLabel: "Search this site",
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
    systems: "Information systems",
    contact: "Contact",
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
    // Real, linked content only. The mock copy from the Stitch reference (invented
    // services, research projects, news and four sample statistics) was removed on
    // 2026-10-26.
    services: {
      // Internal sub-units, not a catalogue of services a visitor can request.
      title: "Academic-services units",
      subtitle: "The office's sub-units that carry out academic-services work",
      more: "See the academic services page",
      items: [
        { title: "Academic-service project administration and coordination" },
        { title: "Plant and animal improvement and propagation" },
        { title: "Academic-service information and dissemination" },
        { title: "Royal-initiated projects and area development support" },
      ],
    },
    research: {
      title: "Research at the office",
      subtitle: "The office's internal units for research",
      more: "See the research page",
      items: [
        {
          title: "Research administration and promotion",
          description: "Prepare and review the university's research strategy, regulations, rules and announcements.",
        },
        {
          title: "Research funding administration",
          description: "Coordinate budget allocation for projects that serve the university's research strategy.",
        },
        {
          title: "Research information and dissemination",
          description: "Build and maintain the university's research databases.",
        },
      ],
    },
    news: {
      title: "News and activities",
      subtitle: "The latest items from the office",
      more: "See all news",
      readLabel: "Read the story",
    },
    resources: {
      title: "Resources and quick links",
      subtitle: "Information and links visitors ask for most",
      items: [
        {
          title: "Research database",
          description: "Search the university's research through its ERP system",
          href: "https://erp.mju.ac.th/researchIndex.aspx",
          external: true,
        },
        {
          title: "Documents and forms",
          description: "Regulations, announcements, forms and manuals, grouped by area",
          href: "/documents",
        },
        {
          title: "News and activities",
          description: "Past activity news and press releases",
          href: "/news",
        },
        {
          title: "Search this site",
          description: "Search the text of every page here",
          href: "/search",
        },
        {
          title: "Contact the office",
          description: "Address, telephone and the official e-mail",
          href: "/contact",
        },
      ],
    },
  },
  notFound: {
    title: "Page not found",
    body: "The page you opened may have moved or been removed.",
    back: "Back to home",
    search: "Search the site",
  },
  footer: {
    contactLabel: "Contact us",
    address: "63 Moo 4, Nong Han, San Sai, Chiang Mai 50290, Thailand",
    phone: "+66 53 873 400",
    email: "researchmju@mju.ac.th",
    rights: "All rights reserved",
  },
};
