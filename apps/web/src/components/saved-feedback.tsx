"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const SavedFeedbackContext = createContext<(() => void) | null>(null);

export function useNotifySaved() {
  const notify = useContext(SavedFeedbackContext);
  return notify ?? (() => {});
}

export function SavedFeedbackProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notifySaved = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2600);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <SavedFeedbackContext.Provider value={notifySaved}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 transition-all duration-200",
          visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <p className="border border-rule bg-ink px-4 py-2.5 text-sm font-medium text-paper shadow-sm">
          {t("saved")}
        </p>
      </div>
    </SavedFeedbackContext.Provider>
  );
}
