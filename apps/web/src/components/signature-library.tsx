"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  LandingComposeMockup,
  type MockupVariant,
} from "@/components/landing-compose-mockup";

type Strip = {
  title: string;
  functionLine: string;
  to: string;
  subject: string;
  body: string;
  variant: MockupVariant;
  cta?: string;
  ctaContext?: string;
  banner?: string;
};

type Chrome = {
  title: string;
  toLabel: string;
  subjectLabel: string;
  send: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
};

const CLOSED_COL = "minmax(12rem, 12rem)";
const OPEN_COL = "minmax(20rem, 1fr)";

export function SignatureLibrary({
  chrome,
  strips,
}: {
  chrome: Chrome;
  strips: [Strip, Strip, Strip];
}) {
  const [active, setActive] = useState(0);
  const [hoverable, setHoverable] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHoverable(mq.matches && window.innerWidth >= 768);
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const columns = strips.map((_, index) => (index === active ? OPEN_COL : CLOSED_COL)).join(" ");

  return (
    <div className="sig-library select-none" style={{ gridTemplateColumns: columns }}>
      {strips.map((strip, index) => {
        const open = active === index;
        return (
          <div
            key={strip.title}
            className="sig-library-strip min-w-0 self-start outline-none"
            tabIndex={hoverable ? 0 : undefined}
            aria-label={strip.title}
            onMouseEnter={() => {
              if (hoverable) setActive(index);
            }}
            onFocus={() => {
              if (hoverable) setActive(index);
            }}
          >
            <button
              type="button"
              className="sig-library-mobile-trigger flex w-full items-center justify-between py-3.5 text-left"
              aria-expanded={open}
              onClick={() => setActive(index)}
            >
              <span className="text-[14px] font-medium text-ink">{strip.title}</span>
            </button>

            <p className="sig-library-label mb-2 text-[11px] leading-4 tracking-[0.04em] text-lead/70">
              {strip.title}
            </p>

            <p
              className={cn(
                "sig-library-fn text-[16px] font-medium leading-snug text-ink",
                open ? "sig-library-fn-open" : "sig-library-fn-closed",
              )}
            >
              {strip.functionLine}
            </p>
            <div
              className={cn(
                "sig-library-window",
                open ? "sig-library-window-open" : "sig-library-window-closed",
              )}
            >
              <LandingComposeMockup
                className="min-h-[22rem]"
                title={chrome.title}
                toLabel={chrome.toLabel}
                toValue={strip.to}
                subjectLabel={chrome.subjectLabel}
                subjectValue={strip.subject}
                body={strip.body}
                name={chrome.name}
                role={chrome.role}
                company={chrome.company}
                phone={chrome.phone}
                email={chrome.email}
                send={chrome.send}
                variant={strip.variant}
                cta={strip.cta}
                ctaContext={strip.ctaContext}
                banner={strip.banner}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}