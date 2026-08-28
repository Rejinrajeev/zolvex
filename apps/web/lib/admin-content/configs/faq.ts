import type { ContentTypeConfig } from "../types";

export const faqConfig: ContentTypeConfig = {
  type: "faq",
  displayName: "FAQ",
  displayNamePlural: "FAQs",
  listColumns: [{ key: "question", label: "Question" }],
  fields: [
    { name: "question", label: "Question", type: "text", required: true },
    { name: "answer", label: "Answer", type: "textarea", required: true },
    { name: "order", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
  ],
};
