import { createContext, useContext } from 'react';

/** Height of the floating pill itself. */
export const PILL_HEIGHT = 60;

/** Distance from the bottom edge: on the home indicator where there is one, a margin where not. */
export function pillBottom(safeBottom: number) {
  return safeBottom > 0 ? safeBottom : 16;
}

/**
 * How much bottom space scrolling content inside the tabs needs to clear the floating bar.
 * Zero outside the tab navigator.
 */
export const TabBarInsetContext = createContext(0);

export const useTabBarInset = () => useContext(TabBarInsetContext);
