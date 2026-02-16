import Image from "next/image"

export function ShiftLogo({
  className = "",
  size = "default",
  variant = "color",
  imageScale = 1,
}: {
  className?: string
  size?: "sm" | "default" | "lg"
  variant?: "color" | "white"
  imageScale?: number
}) {
  const sizeMap = {
    sm: { h: 28, text: "text-lg" },
    default: { h: 32, text: "text-xl" },
    lg: { h: 44, text: "text-3xl" },
  }

  const { h: baseH, text } = sizeMap[size]
  const h = Math.round(baseH * imageScale)
  const src = variant === "white" ? "/shift-white.png" : "/shift-logo.webp"

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src={src}
        alt="Shift logo"
        width={Math.round(h * 0.82)}
        height={h}
        className="object-contain"
        style={{ width: "auto", height: "auto" }}
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
