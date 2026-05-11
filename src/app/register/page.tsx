
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useSound } from "@/hooks/use-sound"
import { User, Dumbbell, Building2, ChevronLeft } from "lucide-react"

const registerSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener una mayuscula")
    .regex(/[0-9]/, "Debe contener un numero"),
  confirmPassword: z.string(),
  gymName: z.string().optional(),
  gymAddress: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contrasenas no coinciden",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

type RegisterMode = "select" | "member" | "trainer" | "gym_owner"

const modeLabels: Record<Exclude<RegisterMode, "select">, string> = {
  member: "Usuario",
  trainer: "Entrenador",
  gym_owner: "Dueno de gym",
}

const modeOptions = [
  {
    key: "member" as const,
    title: "Soy usuario",
    description: "Quiero entrenar, seguir mi progreso y tener mis rutinas",
    icon: User,
    color: "border-accent-yellow text-accent-yellow",
    bg: "bg-accent-yellow/5 hover:bg-accent-yellow/10",
  },
  {
    key: "trainer" as const,
    title: "Soy entrenador",
    description: "Quiero gestionar clientes, crear rutinas y dar seguimiento",
    icon: Dumbbell,
    color: "border-gym-violet text-gym-violet",
    bg: "bg-gym-violet/5 hover:bg-gym-violet/10",
  },
  {
    key: "gym_owner" as const,
    title: "Soy dueno de un gym",
    description: "Quiero digitalizar mi gimnasio, membresias y empleados",
    icon: Building2,
    color: "border-accent-yellow text-accent-yellow",
    bg: "bg-accent-yellow/5 hover:bg-accent-yellow/10",
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const { play } = useSound()
  const [mode, setMode] = useState<RegisterMode>("select")
  const [error, setError] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  function selectMode(key: RegisterMode) {
    play("select")
    setMode(key)
    setError("")
  }

  async function onSubmit(data: RegisterForm) {
    setError("")
    setSuccessMsg("")

    const roleMap: Record<string, string> = {
      member: "MEMBER",
      trainer: "TRAINER",
      gym_owner: "ADMIN",
    }

    const body: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      password: data.password,
      role: roleMap[mode] ?? "MEMBER",
    }

    if (mode === "gym_owner" && data.gymName) {
      body.gymName = data.gymName
      body.gymAddress = data.gymAddress
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error || "Error al registrar")
      play("delete")
      return
    }

    play("success")
    setSuccessMsg("Cuenta creada. Iniciando sesion...")

    const redirectMap: Record<string, string> = {
      member: "/rutina",
      trainer: "/coach",
      gym_owner: "/admin",
    }

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError("Registro exitoso pero fallo el inicio de sesion automatico. Intenta iniciar sesion.")
      setSuccessMsg("")
    } else {
      router.push(redirectMap[mode] || "/dashboard")
      router.refresh()
    }
  }

  if (mode === "select") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Crear cuenta</CardTitle>
            <CardDescription>Selecciona como quieres usar GymApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {modeOptions.map((opt) => (
              <motion.button
                key={opt.key}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectMode(opt.key)}
                className={`w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${opt.bg} ${opt.color}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 current">
                  <opt.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">{opt.title}</p>
                  <p className="text-sm text-muted-foreground">{opt.description}</p>
                </div>
              </motion.button>
            ))}
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Ya tienes cuenta?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Inicia sesion
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const displayMode = modeLabels[mode]

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>
            Registrate como {displayMode.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {successMsg && (
            <p className="text-sm text-accent-yellow text-center mb-4 font-medium">{successMsg}</p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre completo"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            {mode === "gym_owner" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="gymName">Nombre del gimnasio</Label>
                  <Input
                    id="gymName"
                    type="text"
                    placeholder="Fitness Total"
                    {...register("gymName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gymAddress">Direccion del gimnasio</Label>
                  <Input
                    id="gymAddress"
                    type="text"
                    placeholder="Av. Revolucion 123, CDMX"
                    {...register("gymAddress")}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 caracteres, 1 mayuscula, 1 numero"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contrasena"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>
          <button
            onClick={() => setMode("select")}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Cambiar modo
          </button>
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
            Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Inicia sesion
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
