"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSound } from "@/hooks/use-sound"
import { toast } from "sonner"
import { Building2, Hash, Loader2 } from "lucide-react"

interface GymProfile {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  logoUrl: string | null
  showMachineNumbers: boolean
}

export function GymProfileForm({ gym }: { gym: GymProfile }) {
  const router = useRouter()
  const { play } = useSound()
  const [form, setForm] = useState({
    address: gym.address ?? "",
    phone: gym.phone ?? "",
    email: gym.email ?? "",
    logoUrl: gym.logoUrl ?? "",
    showMachineNumbers: gym.showMachineNumbers,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    play("select")
    const res = await fetch(`/api/gyms/${gym.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        showMachineNumbers: form.showMachineNumbers,
      }),
    })
    if (res.ok) {
      play("success")
      toast.success("Perfil del gimnasio actualizado")
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? "Error al actualizar el gimnasio")
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-5 w-5 text-accent-yellow" />
          Perfil de {gym.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gymAddress">Dirección</Label>
            <Input
              id="gymAddress"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gymPhone">Teléfono</Label>
            <Input
              id="gymPhone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gymEmail">Email</Label>
            <Input
              id="gymEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gymLogo">URL del logo</Label>
            <Input
              id="gymLogo"
              value={form.logoUrl}
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>
        <Button
          type="button"
          variant={form.showMachineNumbers ? "default" : "outline"}
          size="sm"
          onClick={() => setForm((f) => ({ ...f, showMachineNumbers: !f.showMachineNumbers }))}
          className="gap-2"
        >
          <Hash className="h-3.5 w-3.5" />
          {form.showMachineNumbers
            ? "Números de máquina: activados"
            : "Números de máquina: desactivados"}
        </Button>
        <div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar perfil
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
