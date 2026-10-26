// English copy for /en/documents/ — translation of content/th/documents.ts.
// The document files stay on the university's own systems; we only link.
import type { DocumentsContent } from "../th/documents";

export const enDocuments: DocumentsContent = {
  meta: {
    title: "Documents and forms — The Office of Research and Academic Services",
    description:
      "Categories of documents, forms and regulations for administration, research and academic services.",
  },
  hero: {
    title: "Documents and forms",
    lead: "Documents and forms grouped by use. Choose a category to open the list on the university's systems.",
  },
  groups: [
    {
      title: "Administration",
      slug: "administration",
      links: [
        { label: "Administration and general affairs", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1920" },
        { label: "Finance and supplies", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1921" },
        { label: "Policy, planning and quality assurance", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=2076" },
        { label: "Operational manuals", url: "https://researchex.mju.ac.th/handbook2/" },
      ],
    },
    {
      title: "Research",
      slug: "research",
      links: [
        {
          label: "Regulations / announcements / research grants / forms / research standards",
          url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=2064",
        },
      ],
    },
    {
      title: "Academic services",
      slug: "academic-services",
      links: [
        { label: "Manuals", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1925" },
        { label: "Centre of excellence forms", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=2605" },
        { label: "Academic service forms", url: "https://rae.mju.ac.th/wtms_webpageAdminDetail.aspx?wID=2660" },
        { label: "External funding source forms", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1930" },
        { label: "Technology clinic forms", url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1931" },
      ],
    },
  ],
  backToIndex: "Back to all documents",
  note: "The document files live on the university's systems (rae.mju.ac.th / erp.mju.ac.th / researchex.mju.ac.th). This page links straight to the source and does not keep copies.",
  source: {
    label: "Source",
    url: "https://rae.mju.ac.th/wtms_webpageDetail.aspx?wID=1909",
    retrieved: "Retrieved 25 October 2026",
  },
};
