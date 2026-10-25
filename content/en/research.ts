// English copy for /en/research/ — faithful translation of content/th/research.ts
// (the source of truth). No new facts; unit names follow the Thai divisions.
import type { ResearchContent } from "../th/research";

export const enResearch: ResearchContent = {
  meta: {
    title: "Research administration — The Office of Research and Academic Services",
    description:
      "Scope of work and internal units responsible for research administration at The Office of Research and Academic Services, Maejo University.",
  },
  hero: {
    title: "Research administration",
    lead: "Research administration division: managing, networking and coordinating research projects funded by government subsidies, the university's own income, and external funding sources.",
  },
  intro: {
    title: "Scope of work",
    text: "Preparing and improving the regulations, announcements and criteria related to research, and building and maintaining the university's research databases and publishing research outputs in various forms.",
  },
  units: [
    {
      title: "Research administration and promotion",
      items: [
        "Prepare and review the university's research strategy, regulations, rules and announcements.",
        "Coordinate cooperation and build research networks with units inside and outside the university.",
        "Develop the capacity of researchers and research-related staff.",
        "Coordinate with the university's research committees so that standards are met.",
      ],
    },
    {
      title: "Research funding administration",
      items: [
        "Coordinate budget allocation for projects that serve the university's research strategy.",
        "Administer and coordinate research projects supported by the national budget.",
        "Coordinate research projects funded from sources outside the university.",
        "Administer and coordinate projects funded by the research and development fund.",
        "Monitor and evaluate research projects funded by the university.",
      ],
    },
    {
      title: "Research information and dissemination",
      items: [
        "Build and maintain the university's research databases.",
        "Provide management information systems, data services and research dissemination in various forms.",
        "Produce data and reports on the university's research.",
      ],
    },
    {
      title: "Research database",
      items: ["The university's research database is operated by the university ERP system (external link)."],
    },
  ],
  externalLink: {
    label: "Maejo University research database",
    url: "https://erp.mju.ac.th/researchIndex.aspx",
  },
  source: {
    label: "Source",
    url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1941",
    retrieved: "Retrieved 25 October 2026",
  },
};
