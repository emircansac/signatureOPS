import { LandingSigMark } from "@/components/landing-sig-mark";
import { cn } from "@/lib/utils";

const mockupSans = { fontFamily: "Arial, Helvetica, sans-serif" } as const;

export type MockupVariant = "cta" | "banner" | "plain";

function IdentityBlock({
  name,
  role,
  company,
  phone,
  email,
}: {
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
}) {
  return (
    <div>
      <p className="relative inline-block pb-1 text-[13px] leading-5 text-ink">
        {name}
        <LandingSigMark />
      </p>
      <p className="text-[12px] leading-5 text-[#5f6368]">
        {role} · {company}
      </p>
      <p className="text-[12px] leading-5 text-[#5f6368]">
        {phone} | {email}
      </p>
    </div>
  );
}

export function ComposeTitleBar({
  title,
  framed = false,
}: {
  title: string;
  framed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-between bg-[#404040] px-3",
        framed && "overflow-hidden rounded-[8px] border border-[#dadce0]",
      )}
      style={mockupSans}
      aria-hidden="true"
    >
      <span className="truncate text-[13px] font-medium text-white">{title}</span>
      <div className="ml-2 flex shrink-0 items-center gap-3 text-white">
        <span className="block h-px w-2.5 bg-white" />
        <span className="block h-2 w-2 border border-white" />
        <span className="block text-[12px] leading-none">×</span>
      </div>
    </div>
  );
}

export function LandingComposeMockup({
  title,
  toLabel,
  toValue,
  subjectLabel,
  subjectValue,
  body,
  name,
  role,
  company,
  phone,
  email,
  send,
  variant,
  cta,
  ctaContext,
  banner,
  className,
}: {
  title: string;
  toLabel: string;
  toValue: string;
  subjectLabel: string;
  subjectValue: string;
  body: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  send: string;
  variant: MockupVariant;
  cta?: string;
  ctaContext?: string;
  banner?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[8px] border border-[#dadce0] bg-white",
        className,
      )}
      style={mockupSans}
      aria-hidden="true"
    >
      <ComposeTitleBar title={title} />

      <div className="flex shrink-0 items-center gap-3 border-b border-[#e8eaed] px-3 py-[7px]">
        <span className="shrink-0 text-[12px] text-lead">{toLabel}</span>
        <span className="min-w-0 truncate text-[13px] text-ink">{toValue}</span>
        <span className="ml-auto shrink-0 text-[12px] text-lead">Cc&nbsp;&nbsp;Bcc</span>
      </div>
      <div className="flex shrink-0 items-baseline gap-3 border-b border-[#e8eaed] px-3 py-[7px]">
        <span className="shrink-0 text-[12px] text-lead">{subjectLabel}</span>
        <span className="min-w-0 truncate text-[13px] text-ink">{subjectValue}</span>
      </div>

      <div className="min-h-0 flex-1 px-3 py-3">
        <p className="whitespace-pre-line text-[13px] leading-6 text-ink">{body}</p>
        <div className="mt-5 max-w-[22rem]">
          <IdentityBlock
            name={name}
            role={role}
            company={company}
            phone={phone}
            email={email}
          />
          {variant === "cta" && cta ? (
            <>
              <span className="mt-2.5 inline-block rounded-[3px] bg-[#1a73e8] px-2.5 py-[6px] text-[11px] font-medium leading-none text-white">
                {cta}
              </span>
              {ctaContext ? (
                <p className="mt-1.5 text-[11px] leading-4 text-lead">{ctaContext}</p>
              ) : null}
            </>
          ) : null}
          {variant === "banner" && banner ? (
            <div className="mt-2.5 bg-ink px-2.5 py-[6px] text-[11px] leading-4 text-paper">
              {banner}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex shrink-0 items-center gap-3 border-t border-[#e8eaed] px-3 py-2">
        <span className="inline-block rounded-[4px] bg-[#1a73e8] px-4 py-1.5 text-[13px] font-medium text-white">
          {send}
        </span>
        <div className="flex items-center gap-2.5 text-[#80868b]">
          <span className="flex h-[15px] w-[12px] flex-col items-center justify-end">
            <span className="text-[10px] font-bold leading-none">A</span>
            <span className="mt-px block h-px w-full bg-current" />
          </span>
          <span className="block h-[13px] w-[9px] rounded-[1px] bg-current" />
          <span className="block h-[13px] w-[9px] -skew-x-12 bg-current" />
          <span className="block h-2.5 w-2.5 rounded-sm border border-current" />
          <span className="block h-2.5 w-2.5 rounded-full border border-current" />
          <span className="flex flex-col gap-0.5">
            <span className="block h-px w-3 bg-current" />
            <span className="block h-px w-2.5 bg-current" />
            <span className="block h-px w-2 bg-current" />
          </span>
        </div>
      </div>
    </div>
  );
}
