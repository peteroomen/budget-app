interface TideLogoProps {
  size?: number
  className?: string
}

export function TideLogo({ size = 28, className }: TideLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="38" height="38" rx="10" fill="hsl(var(--primary))" />
      <path
        d="M7 17c3 0 3-3 6-3s3 3 6 3 3-3 6-3 3 3 6 3"
        fill="none"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 25c3 0 3-3 6-3s3 3 6 3 3-3 6-3 3 3 6 3"
        fill="none"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}
