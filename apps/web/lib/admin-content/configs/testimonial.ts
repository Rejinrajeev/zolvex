import type { ContentTypeConfig } from "../types";

export const testimonialConfig: ContentTypeConfig = {
  type: "testimonial",
  displayName: "Testimonial",
  displayNamePlural: "Testimonials",
  listColumns: [
    { key: "name", label: "Name" },
    { key: "rating", label: "Rating" },
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "rating", label: "Rating (1-5)", type: "number", required: true, helpText: "Whole number from 1 to 5." },
    { name: "message", label: "Message", type: "textarea", required: true },
    { name: "isFeatured", label: "Featured", type: "boolean" },
    { name: "isActive", label: "Active", type: "boolean" },
  ],
};
