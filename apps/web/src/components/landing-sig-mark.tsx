export function LandingSigMark({ animated = false }: { animated?: boolean }) {
  return (
    <svg
      className="pointer-events-none absolute left-0 top-[88%] h-[0.38em] w-full overflow-visible"
      viewBox="0 0 120 14"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className={animated ? "landing-sig-stroke" : undefined}
        d="M1.5 9.4C16 5.2 32 11.6 52 7.2C72 2.8 90 11.2 108 6.8C112.5 5.6 116.5 7.4 118.8 8.2"
        stroke="#A63D2F"
        strokeWidth="1.35"
        strokeLinecap="round"
        pathLength={1}
      />
    </svg>
  );
}
