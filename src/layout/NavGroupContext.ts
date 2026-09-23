import { createContext, useContext } from "react";
import type { NavGroup, NavPage } from "../config/navigation";

export interface NavGroupContextValue {
  group: NavGroup;
  page: NavPage;
  /** Grup birden fazla sekme gösteriyorsa true — sayfalar kendi büyük başlığını basmaz. */
  isTabbed: boolean;
}

/** `GroupLayout` sağlar; `PageHeader` buradan sekmeli olup olmadığını öğrenir. */
export const NavGroupContext = createContext<NavGroupContextValue | null>(null);

export function useNavGroup(): NavGroupContextValue | null {
  return useContext(NavGroupContext);
}
