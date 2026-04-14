"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const THEME_KEY = "shift-theme"

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null
      if (stored === "dark" || stored === "light") {
        setThemeState(stored)
        document.documentElement.classList.toggle("dark", stored === "dark")
      } else {
        // Default to dark premium theme
        document.documentElement.classList.add("dark")
      }
    } catch {
      // localStorage not available (SSR or private browsing)
      document.documentElement.classList.add("dark")
    }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      // localStorage not available
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark")
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light")
  }, [theme, setTheme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
