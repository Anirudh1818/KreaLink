"use client";

import { useEffect, useState } from "react";
import { isThemeKey, themes, type ThemeKey } from "./themes";

/**
 * Loads the user's saved FanStreak theme from localStorage after mount and
 * keeps it in sync when changed. The read must happen in an effect (not a
 * useState initializer) so the server-rendered HTML and the first client
 * render match — otherwise React reports a hydration mismatch.
 */
export function useStoredTheme() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("flame");

  useEffect(() => {
    const savedTheme = localStorage.getItem("fanstreak-theme");

    if (isThemeKey(savedTheme)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration-safe localStorage read
      setActiveTheme(savedTheme);
    }
  }, []);

  function changeTheme(themeKey: ThemeKey) {
    setActiveTheme(themeKey);
    localStorage.setItem("fanstreak-theme", themeKey);
  }

  return { activeTheme, setActiveTheme, changeTheme, theme: themes[activeTheme] };
}
