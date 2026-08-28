/** Hugging Face yellow-face mark for Hub links. */
export function HfLogo({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="256" height="256" rx="55" fill="#FFD21E" />
      <circle cx="88" cy="114" r="14" fill="#1B1B1B" />
      <circle cx="168" cy="114" r="14" fill="#1B1B1B" />
      <circle cx="92" cy="110" r="5" fill="#fff" />
      <circle cx="172" cy="110" r="5" fill="#fff" />
      <path
        fill="#1B1B1B"
        d="M128 178c-24 0-44-10-44-22s20-22 44-22 44 10 44 22-20 22-44 22z"
      />
    </svg>
  );
}
