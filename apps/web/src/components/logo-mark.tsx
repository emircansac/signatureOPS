export const LOGO_PATH =
  "M32 78 C32 78 40 42 58 42 C72 42 60 62 74 62 C86 62 82 44 88 40";

export function LogoMark({
  size = 30,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="120" height="120" rx="14" fill="#1C2B3A" />
      <path
        d={LOGO_PATH}
        fill="none"
        stroke="#F6F4EF"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}