import { createContext, useContext } from "react";
import { buildGroupTheme, SYSTEM_ACCENTS } from "../theme";

const GroupThemeContext = createContext(buildGroupTheme(SYSTEM_ACCENTS.default));

export const GroupThemeProvider = GroupThemeContext.Provider;

export function useGroupTheme() {
  return useContext(GroupThemeContext);
}
