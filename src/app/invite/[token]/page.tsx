"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useSound } from "@/hooks/use-sound"
import { Dumbbell, Check, X, Loader2, Clock, CheckCircle, Building2 } from "lucide-react"

interface InviteInfo {
  trainerName: string | null
  gymName: string | null
  name: string | null
  email: string | null
  phone: string | null
  expiresAt: string
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const { play } = useSound()
  const { status } = useSession()
  const token = params.token as string

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" })

  useEffect(() => {
    fetch(`/api/trainer/invites/${token}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) {
          setError(data.error || "Invitación inválida")
          setLoading(false)
          return
        }
        setInvite(data.invite)
        setForm({
          name: data.invite.name ?? "",
          email: data.invite.email ?? "",
          phone: data.invite.phone ?? "",
          password: "",
          confirmPassword: "",
        })
        setLoading(false)
      })
      .catch(() => {
        setError("Error de conexión")
        setLoading(false)
      })
  }, [token])

  const passwordChecks = [
    { label: "8 caracteres minimo", met: form.password.length >= 8 },
    { label: "1 mayuscula", met: /[A-Z]/.test(form.password) },
    { label: "1 numero", met: /[0-9]/.test(form.password) },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/trainer/invites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al crear la cuenta")
        return
      }

      if (status === "authenticated") {
        await signOut({ redirect: false })
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Cuenta creada pero falló el inicio de sesión automático. Inicia sesión manualmente.")
        setSuccess(false)
        return
      }

      play("success")
      setSuccess(true)
      setTimeout(() => {
        router.push("/onboarding")
        router.refresh()
      }, 900)
    } catch {
      setError("Error de conexión")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invitación no disponible</CardTitle>
            <CardDescription>{error}</CardDescription>
            <Button variant="outline" onClick={() => router.push("/login")}>
              Ir al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 bg-background">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-yellow/10"
            >
              <CheckCircle className="h-10 w-10 text-accent-yellow" />
            </motion.div>
            <CardTitle className="text-xl">Cuenta creada</CardTitle>
            <CardDescription>Ya eres cliente de tu coach. Vamos a configurar tu perfil...</CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-yellow/10 mb-3">
            <Dumbbell className="h-7 w-7 text-accent-yellow" />
          </div>
          <CardTitle className="text-2xl">Únete como cliente</CardTitle>
          <CardDescription>
            {invite?.trainerName ? (
              <>
                <span className="font-medium text-foreground">{invite.trainerName}</span> te invitó
              </>
            ) : (
              "Tu coach te invitó"
            )}
            {invite?.gymName ? (
              <span className="mt-1 flex items-center justify-center gap-1">
                <Building2 className="h-3 w-3" /> {invite.gymName}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invName">Nombre</Label>
              <Input
                id="invName"
                type="text"
                placeholder="Tu nombre completo"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invEmail">Email</Label>
              <Input
                id="invEmail"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invPhone">Teléfono (opcional)</Label>
              <Input
                id="invPhone"
                type="tel"
                placeholder="+52 55 0000 0000"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invPassword">Contraseña</Label>
              <Input
                id="invPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 caracteres, 1 mayuscula, 1 numero"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              {form.password.length > 0 && (
                <div className="space-y-1 pt-1">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2 text-xs">
                      {check.met ? (
                        <Check className="h-3 w-3 text-accent-yellow shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={check.met ? "text-accent-yellow" : "text-muted-foreground"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invConfirm">Confirmar contraseña</Label>
              <Input
                id="invConfirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "Creando cuenta..." : "Crear mi cuenta"}
            </Button>
          </form>
        </CardContent>
        {invite?.expiresAt && (
          <CardFooter className="justify-center">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Expira el {new Date(invite.expiresAt).toLocaleDateString("es")}
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
