"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ShiftLogo } from "@/components/shift-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [departmentName, setDepartmentName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"login" | "signup">("login")
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const { login, signup, loginWithProvider, isAuthenticated, ready, authError, clearAuthError } = useAuth()
  const router = useRouter()

  // Show auth error from context (e.g., uninvited user trying to sign in)
  useEffect(() => {
    if (authError) {
      setError(authError)
      clearAuthError()
      setLoading(false)
    }
  }, [authError, clearAuthError])

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [ready, isAuthenticated, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (mode === "signup") {
      if (!fullName.trim()) {
        setError("Please enter your full name.")
        return
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.")
        return
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.")
        return
      }
    }

    setLoading(true)
    try {
      if (mode === "signup") {
        await signup(email, password, fullName, companyName, departmentName)
      } else {
        await login(email, password)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed"
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setError("Invalid email or password. Please try again.")
      } else if (msg.includes("email-already-in-use")) {
        setError("An account with this email already exists. Try signing in.")
      } else if (msg.includes("weak-password")) {
        setError("Password is too weak. Use at least 6 characters.")
      } else {
        setError(msg)
      }
      setLoading(false)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetEmail.trim()) {
      setResetMessage({ type: "error", text: "Please enter your email address." })
      return
    }
    
    setResetLoading(true)
    setResetMessage(null)
    
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      })
      
      const data = await res.json()
      setResetMessage({ type: "success", text: data.message || "Password reset email sent!" })
      
      // Clear email after success and close after delay
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetEmail("")
        setResetMessage(null)
      }, 3000)
    } catch {
      setResetMessage({ type: "error", text: "Failed to send reset email. Please try again." })
    } finally {
      setResetLoading(false)
    }
  }

  async function handleProviderLogin(provider: "google" | "microsoft") {
    setError("")
    setLoading(true)
    try {
      await loginWithProvider(provider)
      // Note: loading will be reset by authError useEffect if access is denied
      // or by the redirect if login succeeds. But we set a timeout fallback
      // in case something goes wrong with the auth flow.
      setTimeout(() => setLoading(false), 5000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed"
      if (msg.includes("popup-closed")) {
        setError("Sign-in popup was closed. Please try again.")
      } else {
        setError(msg)
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <ShiftLogo size="lg" imageScale={0.7} className="mb-4" />
          <CardTitle className="text-2xl font-bold text-foreground">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to your account to continue"
              : "Set up your account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-lpignore="true">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                data-lpignore="true"
                data-form-type="other"
              />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={mode === "signup" ? "Create a password (min 6 characters)" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            {mode === "signup" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="companyName">
                      Company <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="departmentName">
                      Department <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="departmentName"
                      type="text"
                      placeholder="Department"
                      value={departmentName}
                      onChange={(e) => setDepartmentName(e.target.value)}
                      data-lpignore="true"
                      data-form-type="other"
                    />
                  </div>
                </div>
              </>
            )}
            {mode === "login" && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox id="remember" />
                  <Label htmlFor="remember" className="text-sm font-normal">
                    Remember me
                  </Label>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  className="text-sm font-medium text-primary hover:underline cursor-pointer"
                  onClick={() => {
                    alert("Forgot password clicked!")
                    setShowForgotPassword(true)
                    setResetEmail(email)
                    setResetMessage(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setShowForgotPassword(true)
                      setResetEmail(email)
                      setResetMessage(null)
                    }
                  }}
                >
                  Forgot password?
                </span>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => handleProviderLogin("google")}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => handleProviderLogin("microsoft")}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#F25022" d="M1 1h10v10H1z" />
                <path fill="#00A4EF" d="M1 13h10v10H1z" />
                <path fill="#7FBA00" d="M13 1h10v10H13z" />
                <path fill="#FFB900" d="M13 13h10v10H13z" />
              </svg>
              Microsoft
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login")
                setError("")
                setPassword("")
                setConfirmPassword("")
                setCompanyName("")
                setDepartmentName("")
              }}
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Need help? Contact Support
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {resetMessage && (
              <div
                className={`rounded-md p-3 text-sm ${
                  resetMessage.type === "success"
                    ? "bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-300"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {resetMessage.text}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={resetLoading}>
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
