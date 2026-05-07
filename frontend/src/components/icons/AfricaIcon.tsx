import type { SVGProps } from 'react';

interface AfricaIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Outlined Africa continent icon — matches Lucide's design language:
 * 24×24 viewBox, fill="none", stroke="currentColor", round line caps/joins.
 */
export default function AfricaIcon({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: AfricaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/*
        Simplified Africa continent outline, clockwise from NW Morocco.
        Coordinates mapped from geographic lon/lat to 24×24 SVG space.
        Recognisable landmarks preserved: Mediterranean coast, Suez/Red Sea,
        Horn of Africa (NE protrusion), Gulf of Guinea elbow (W), Cape tip (S).
      */}
      <path d="
        M 6.5 2.5
        L 10  2
        L 15  2.5
        L 17  4
        L 19.5 8
        L 21   9.5
        L 20   11
        L 19   14
        L 18   17
        L 16   21
        L 12.5 22.5
        L 10   21
        L 9.5  18
        L 9.5  14
        L 8.5  12
        L 7.5  11.5
        L 6    11.5
        L 4    11
        L 3    10
        L 2.5  9
        L 3    7
        L 5    5
        Z
      " />
    </svg>
  );
}
