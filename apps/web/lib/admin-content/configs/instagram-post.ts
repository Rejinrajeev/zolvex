import type { ContentTypeConfig } from "../types";

export const instagramPostConfig: ContentTypeConfig = {
  type: "instagram-post",
  displayName: "Instagram post",
  displayNamePlural: "Instagram posts",
  listColumns: [{ key: "permalink", label: "Permalink" }],
  fields: [
    { name: "image", label: "Image", type: "image", required: true },
    { name: "permalink", label: "Instagram permalink", type: "text", required: true },
    { name: "order", label: "Display order", type: "number" },
    { name: "isActive", label: "Active", type: "boolean" },
  ],
};
