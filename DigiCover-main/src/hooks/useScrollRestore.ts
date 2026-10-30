import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type RestoreState = {
  restoreScrollY?: number;
};

/**
 * Restores a saved scroll position from router state once the page is ready.
 * Pass `ready` as true when the content that determines page height has rendered
 * (e.g. books fetched). The hook scrolls only once and then clears the stored
 * state so subsequent renders or refreshes don't re-scroll.
 */
export function useScrollRestore(ready: boolean) {
  const location = useLocation();
  const navigate = useNavigate();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    if (!ready) return;

    const state = (location.state as RestoreState | null) ?? null;
    const target = state?.restoreScrollY;

    if (typeof target !== "number") return;

    requestAnimationFrame(() => {
      window.scrollTo(0, Math.max(0, target));
    });

    restoredRef.current = true;
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }, [ready, location, navigate]);
}
