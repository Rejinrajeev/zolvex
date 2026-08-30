export type FieldType = "text" | "textarea" | "number" | "boolean" | "image";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  helpText?: string;
}

export interface ListColumn {
  key: string;
  label: string;
}

export interface ContentTypeConfig {
  /** Route-param value, must match Express's CONTENT_TYPES exactly. */
  type: string;
  displayName: string;
  displayNamePlural: string;
  listColumns: ListColumn[];
  fields: FieldConfig[];
}
