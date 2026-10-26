// English copy for /en/search/ — same shape as content/th/search.ts.
import type { SearchContent } from "../th/search";

export const enSearch: SearchContent = {
  meta: {
    title: "Search — The Office of Research and Academic Services",
    description: "Search the text of every page on the office website.",
  },
  hero: {
    title: "Search",
    lead: "Search the text of every page on this site — content taken from the office's official pages.",
  },
  labels: {
    input: "Search for",
    placeholder: "Type a word, e.g. research, forms, news",
    hint: "Searches the text on these pages only, not the university's systems.",
    results: "Results",
    countTemplate: "{n} results",
    noResults: "Nothing matched that word. Try a shorter one.",
    empty: "Type a word to start searching",

    kindPage: "Page",
    kindItem: "On this page",
    filterLabel: "Filter by category",
    showAll: "Show every category",
    hiddenByFilter: "{n} more matches are hidden by the category filter",
    categories: {
      all: "All",
      home: "Home",
      about: "About us",
      research: "Research & innovation",
      services: "Academic services",
      documents: "Publications",
      news: "News & activities",
      contact: "Contact",
      search: "Search",
    },
  },
};
