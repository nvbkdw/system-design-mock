import { useCallback, useState } from "react";
import { loadPrefs, savePrefs, type Prefs } from "./storage";

export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState(loadPrefs);
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);
  return [prefs, update];
}
