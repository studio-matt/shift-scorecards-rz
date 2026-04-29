import React from "react"
// Root layout - Firebase App Hosting build fix 2026-04-29
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"

import "./globals.css"

// Initialize performance diagnostics (exposes window.perfSummary)
import "@/lib/perf-diagnostic"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Shift Scorecard | AI Adoption Platform",
  description:
    "The first AI adoption measurement platform. Track your AI journey with scorecards, personalized action plans, and team benchmarking.",
}

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var oe=console.error;
  console.error=function(){
    var m=typeof arguments[0]==='string'?arguments[0]:'';
    if(m.indexOf('Hydration')>-1||m.indexOf('hydrat')>-1||m.indexOf('server rendered')>-1||m.indexOf('did not match')>-1)return;
    oe.apply(console,arguments);
  };
})();
`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
