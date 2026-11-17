"use client"

export const dynamic = "force-dynamic"

import { Suspense, useState, useSyncExternalStore } from "react"
import { useForm, type FieldErrors, type Resolver } from "react-hook-form"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
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
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton"
import { useSound } from "@/hooks/use-sound"
import { validateLogin, type LoginForm } from "@/lib/login-form"

const loginResolver: Resolver<LoginForm> = (values) => {
  const errors: FieldErrors<LoginForm> = {}
  for (const [field, message] of Object.entries(validateLogin(values))) {
    errors[field as keyof LoginForm] = { type: "validate", message }
  }
  return Object.keys(errors).length > 0 ? { values: {}, errors } : { values, errors: {} }
}

const subscribeToNothing = () => () => {}
const getClientMounted = () => true
const getServerMounted = () => false

function LoginFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/my-routine"
  const [error, setError] = useState("")
  // false during SSR/hydration, true once React has mounted on the client.
  const mounted = useSyncExternalStore(subscribeToNothing, getClientMounted, getServerMounted)
  const { play } = useSound()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: loginResolver,
  })

  const { onChange: emailOnChange, ...emailRest } = register("email")
  const { onChange: passwordOnChange, ...passwordRest } = register("password")

  async function onSubmit(data: LoginForm) {
    setError("")
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError("Credenciales inválidas")
      play("delete")
    } else {
      play("success")
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">GymApp</CardTitle>
        <CardDescription>Inicia sesión en tu cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="post" action="/login" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!mounted} className="m-0 min-w-0 space-y-4 border-0 p-0">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                {...emailRest}
                onChange={(e) => {
                  emailOnChange(e)
                  play("click")
                }}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••"
                {...passwordRest}
                onChange={(e) => {
                  passwordOnChange(e)
                  play("click")
                }}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button
              type="submit"
              className="w-full active:scale-[0.96] transition-transform"
              disabled={!mounted || isSubmitting}
            >
              {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
            </Button>
          </fieldset>
        </form>
        <div className="mt-4 flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">o</span>
          <Separator className="flex-1" />
        </div>
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continuar con Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Crear cuenta
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginFormInner />
      </Suspense>
    </div>
  )
}
