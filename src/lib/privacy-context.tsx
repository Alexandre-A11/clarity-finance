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

  useEffect(() => {
    setPrivacyMode(hidden);
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
