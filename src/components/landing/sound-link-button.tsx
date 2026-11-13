"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useSound } from "@/hooks/use-sound"
import type { sounds } from "@/lib/sounds"

interface SoundLinkButtonProps extends Omit<React.ComponentProps<typeof Button>, "asChild"> {
  href: string
  sound: keyof typeof sounds
}

// Botón-enlace que suena al tocarlo. Es la única parte de estas secciones que necesita
// JavaScript; el resto de la portada se dibuja en el servidor.
export function SoundLinkButton({ href, sound, children, ...props }: SoundLinkButtonProps) {
  const { play } = useSound()

  return (
    <Button asChild onClick={() => play(sound)} {...props}>
      <Link href={href}>{children}</Link>
    </Button>
  )
}
