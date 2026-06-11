import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Remembers and restores the window scroll position per route path across tab
 * navigation.
 *
 * Why not react-router's <ScrollRestoration>? Our screens load their data
 * client-side asynchronously (no router loaders), so when the user returns to a
 * tab the page is still short and the built-in restore clamps back to the top.
 *
 * This hook re-applies the saved position on every animation frame for a short
 * window, so it "catches up" as async content grows the page back to full
 * height. It relies on PrimaryLayout staying mounted across the tab routes, so
 * the saved positions (a ref) persist between tab switches.
 */
const RESTORE_WINDOW_MS = 1500;
const REACHED_TOLERANCE_PX = 2;

export function useScrollMemory(): void {
  const { pathname } = useLocation();
  const positions = useRef<Record<string, number>>({});
  // True while we are programmatically restoring, so our own scrollTo calls
  // don't get recorded as the user's position.
  const isRestoring = useRef<boolean>(false);

  // Save the live scroll position for the active path.
  useEffect(() => {
    function handleScroll(): void {
      if (isRestoring.current) return;
      positions.current[pathname] = window.scrollY;
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return (): void => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname]);

  // Restore on path change, re-applying each frame so it survives async content
  // that grows the page after navigation.
  useEffect(() => {
    const target = positions.current[pathname] ?? 0;
    isRestoring.current = true;
    const startedAt = performance.now();
    let frame = 0;

    function step(): void {
      window.scrollTo(0, target);
      const reached = Math.abs(window.scrollY - target) <= REACHED_TOLERANCE_PX;
      if (!reached && performance.now() - startedAt < RESTORE_WINDOW_MS) {
        frame = requestAnimationFrame(step);
      } else {
        isRestoring.current = false;
      }
    }
    frame = requestAnimationFrame(step);

    return (): void => {
      cancelAnimationFrame(frame);
      isRestoring.current = false;
    };
  }, [pathname]);
}
