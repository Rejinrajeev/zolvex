import type { ContentTypeConfig } from "../types";

export const serviceConfig: ContentTypeConfig = {
  type: "service",
  displayName: "Service",
  displayNamePlural: "Services",
  listColumns: [
    { key: "name", label: "Name" },
    { key: "shortDescription", label: "Short description" },
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "slug", label: "Slug", type: "text", required: true, helpText: "URL-friendly identifier; must be unique." },
    { name: "shortDescription", label: "Short description", type: "textarea", required: true },
    { name: "fullDescription", label: "Full description", type: "textarea", required: true },
    { name: "image", label: "Image", type: "image" },
    { name: "icon", label: "Icon name", type: "text" },
    { name: "isHighlighted", label: "Highlighted", type: "boolean" },
    { name: "order", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
    { name: "metaTitle", label: "Meta title", type: "text" },
    { name: "metaDescription", label: "Meta description", type: "textarea" },
    { name: "ogImage", label: "Social share image", type: "image" },
  ],
};
