"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
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
import { Separator } from "@/components/ui/separator"
import { useSound } from "@/hooks/use-sound"
import { Check, X, CheckCircle } from "lucide-react"

const registerSchema = z
  .object({
    name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
    email: z.string().email("Correo inválido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe contener una mayúscula")
      .regex(/[0-9]/, "Debe contener un número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const { play } = useSound()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch("password", "")

  async function onSubmit(data: RegisterForm) {
    setError("")

    const gymSlug = new URLSearchParams(window.location.search).get("gym") ?? undefined
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        role: "MEMBER",
        ...(gymSlug ? { gymSlug } : {}),
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error || "Error al registrar")
      play("delete")
      return
    }

    play("success")
    setSuccess(true)

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError(
        "Registro exitoso pero falló el inicio de sesión automático. Intenta iniciar sesión."
      )
      setSuccess(false)
    } else {
      router.push("/onboarding")
      router.refresh()
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12 space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent-yellow/10"
            >
              <CheckCircle className="h-10 w-10 text-gold" />
            </motion.div>
            <CardTitle as="h1" className="text-xl">
              Cuenta creada
            </CardTitle>
            <CardDescription>Redirigiendo...</CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  const passwordChecks = [
    { label: "8 caracteres mínimo", met: password.length >= 8 },
    { label: "1 mayúscula", met: /[A-Z]/.test(password) },
    { label: "1 número", met: /[0-9]/.test(password) },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle as="h1" className="text-2xl">
            Crear cuenta
          </CardTitle>
          <CardDescription>Crea tu cuenta para entrenar y seguir tu progreso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" type="text" placeholder="Tu nombre completo" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                {...register("email")}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Mín. 8 caracteres, 1 mayúscula, 1 número"
                {...register("password")}
              />
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2 text-xs">
                      {check.met ? (
                        <Check className="h-3 w-3 text-gold shrink-0" />
                      ) : (
                        <X className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={check.met ? "text-gold" : "text-muted-foreground"}>
                        {check.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
          <div className="mt-4 flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">o</span>
            <Separator className="flex-1" />
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Continuar con Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-gold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
