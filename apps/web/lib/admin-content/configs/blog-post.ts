import type { ContentTypeConfig } from "../types";

export const blogPostConfig: ContentTypeConfig = {
  type: "blog-post",
  displayName: "Blog post",
  displayNamePlural: "Blog posts",
  listColumns: [
    { key: "title", label: "Title" },
    { key: "instagramUrl", label: "Instagram URL" },
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "image", label: "Image", type: "image", required: true },
    { name: "instagramUrl", label: "Instagram URL", type: "text", required: true },
    { name: "order", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
  ],
};
