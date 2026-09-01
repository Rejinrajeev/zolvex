import type { ComponentType, SVGProps } from "react";
import {
  IconOffice,
  IconCarpet,
  IconWindow,
  IconPostConstruction,
  IconFloor,
  IconSanitize,
} from "@/components/icons";

const ICON_MAP = new Map<string, ComponentType<SVGProps<SVGSVGElement>>>([
  ["office", IconOffice],
  ["carpet", IconCarpet],
  ["window", IconWindow],
  ["post-construction", IconPostConstruction],
  ["floor", IconFloor],
  ["sanitize", IconSanitize],
]);

const DEFAULT_ICON = IconOffice;

/**
 * Service.icon is a free-text field an admin types into; it must never
 * crash the page if the value is blank or doesn't match a known key.
 */
export function iconForServiceKey(key: string | null | undefined): ComponentType<SVGProps<SVGSVGElement>> {
  if (!key) return DEFAULT_ICON;
  return ICON_MAP.get(key) ?? DEFAULT_ICON;
}
