/**
 * AfricaIcon — simplified outline of Africa continent as an SVG icon.
 * Drop-in replacement for the Lucide <Globe> icon in the language selector.
 */
interface Props {
  size?: number;
  color?: string;
  className?: string;
}

export default function AfricaIcon({ size = 18, color = '#FCD116', className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Africa"
    >
      <path
        d="
          M50,4
          C58,4  72,8  80,18
          C88,28 88,42 90,52
          C92,62 94,70 90,80
          C86,90 78,100 70,106
          C62,112 54,112 46,108
          C38,104 32,96  28,86
          C24,76 24,64  20,54
          C16,44 10,36  12,26
          C14,16 22,8  30,5
          C38,2  42,4  50,4 Z
        "
        stroke={color}
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Horn of Africa bump */}
      <path
        d="M88,52 C92,48 96,44 94,50 C92,56 88,58 88,52 Z"
        stroke={color}
        strokeWidth="5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
