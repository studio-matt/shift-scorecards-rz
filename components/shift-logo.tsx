import Image from "next/image"

export function ShiftLogo({
  className = "",
  size = "default",
  variant = "color",
}: {
  className?: string
  size?: "sm" | "default" | "lg"
  variant?: "color" | "white"
}) {
  const sizeMap = {
    sm: { img: 28, text: "text-lg" },
    default: { img: 32, text: "text-xl" },
    lg: { img: 44, text: "text-3xl" },
  }

  const { img, text } = sizeMap[size]
  const src = variant === "white" ? "/shift-white.png" : "/shift-logo.webp"

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src={src}
        alt="Shift logo"
        width={img}
        height={img}
        className="object-contain"
        priority
      />
      <div className={`font-sans font-bold tracking-tight ${text}`}>
        <span className={variant === "white" ? "text-white" : "text-foreground"}>
          Shift
        </span>{" "}
        <span className={variant === "white" ? "text-white/80" : "text-primary"}>
          Scorecard
        </span>
      </div>
    </div>
  )
}
