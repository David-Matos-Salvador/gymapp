"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton"

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState("")
  const [error, setError] = useState("")

  const checks = [
    { label: "8 caracteres mínimo", met: password.length >= 8 },
    { label: "1 mayúscula", met: /[A-Z]/.test(password) },
    { label: "1 número", met: /[0-9]/.test(password) },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password !== confirm) {
      setError("Las contraseñas no coinciden")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.details?.password?.[0] ?? data.error ?? "No se pudo cambiar la contraseña")
        return
      }
      setDone(data.message)
    } catch {
      setError("Sin conexión. Revisa tu internet e intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle as="h1" className="text-2xl">
          Elige una contraseña nueva
        </CardTitle>
        {!done && token && (
          <CardDescription>La usarás para entrar a GymApp desde ahora.</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm" role="status">
              {done}
            </p>
            <Button asChild className="w-full">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        ) : !token ? (
          <p className="text-sm text-center text-muted-foreground">
            Este enlace no es válido. Pide uno nuevo desde «¿Olvidaste tu contraseña?».
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña nueva</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <ul className="space-y-0.5 text-xs">
                {checks.map((check) => (
                  <li
                    key={check.label}
                    className={check.met ? "text-foreground" : "text-muted-foreground"}
                  >
                    {check.met ? "✓" : "·"} {check.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Repite la contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={saving || !checks.every((check) => check.met) || !confirm}
            >
              {saving ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </CardContent>
      {!done && (
        <CardFooter className="justify-center">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            Pedir otro enlace
          </Link>
        </CardFooter>
      )}
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<AuthCardSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
