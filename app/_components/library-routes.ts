import {
  BookOpen,
  Buildings,
  FileText,
  Info,
  Scales,
  Scroll,
  type Icon,
} from "@phosphor-icons/react";

/**
 * The research library's sections.
 *
 * One source for both navigations — the desktop header row and the mobile dock
 * — so a section added here appears in both rather than drifting apart.
 */
export const LIBRARY_TABS: Array<{ href: string; label: string; icon: Icon }> = [
  { href: "/codes", label: "Codes", icon: BookOpen },
  { href: "/bills", label: "Bills", icon: Scroll },
  { href: "/rules", label: "Rules of Court", icon: Scales },
  { href: "/forms", label: "Forms", icon: FileText },
  { href: "/directory", label: "Directory", icon: Buildings },
  { href: "/method", label: "Method", icon: Info },
];
