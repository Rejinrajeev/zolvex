import type { ComponentType, SVGProps } from "react";
import {
  IconHome,
  IconOffice,
  IconCarpet,
  IconWindow,
  IconPostConstruction,
  IconFloor,
  IconSanitize,
  IconWrench,
  IconBolt,
} from "@/components/icons";

const ICON_MAP = new Map<string, ComponentType<SVGProps<SVGSVGElement>>>([
  ["home", IconHome],
  ["cleaning", IconHome],
  ["office", IconOffice],
  ["commercial", IconOffice],
  ["carpet", IconCarpet],
  ["window", IconWindow],
  ["post-construction", IconPostConstruction],
  ["floor", IconFloor],
  ["sanitize", IconSanitize],
  ["repair", IconWrench],
  ["maintenance", IconWrench],
  ["handyman", IconWrench],
  ["plumbing", IconWrench],
  ["ac", IconWrench],
  ["installation", IconWrench],
  ["electrical", IconBolt],
]);

const DEFAULT_ICON = IconHome;

/**
 * Service.icon is a free-text field an admin types into; it must never
 * crash the page if the value is blank or doesn't match a known key.
 */
export function iconForServiceKey(key: string | null | undefined): ComponentType<SVGProps<SVGSVGElement>> {
  if (!key) return DEFAULT_ICON;
  return ICON_MAP.get(key) ?? DEFAULT_ICON;
}
