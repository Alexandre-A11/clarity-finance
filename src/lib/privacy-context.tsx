import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setPrivacyMode } from "@/lib/finance";

type Ctx = {
  hidden: boolean;
  toggle: () => void;
  setHidden: (v: boolean) => void;
};

const PrivacyContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "finanças.privacy";

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Sync the module-level flag DURING render so that any fmtMoney() called
  // in the same render pass reads the new value (the previous useEffect
  // approach updated AFTER children rendered → required a manual refresh).
  setPrivacyMode(hidden);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [hidden]);

  const value = useMemo<Ctx>(
    () => ({ hidden, toggle: () => setHidden((v) => !v), setHidden }),
    [hidden],
  );

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): Ctx {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used inside <PrivacyProvider>");
  return ctx;
}
