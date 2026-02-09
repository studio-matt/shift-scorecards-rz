export function ShiftLogo({
  className = "",
  size = "default",
}: {
  className?: string
  size?: "sm" | "default" | "lg"
}) {
  const sizeClasses = {
    sm: "text-lg",
    default: "text-xl",
    lg: "text-3xl",
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center justify-center rounded-lg bg-primary p-1.5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`${size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-6 w-6"} text-primary-foreground`}
          aria-hidden="true"
        >
          <path
            d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className={`font-sans font-bold tracking-tight ${sizeClasses[size]}`}>
        <span className="text-foreground">Shift</span>{" "}
        <span className="text-primary">Scorecard</span>
      </div>
    </div>
  )
}
