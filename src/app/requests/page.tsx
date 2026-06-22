"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AppShell } from "@/components/layout/shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { Users, Check, X, Mail, Award, Clock, Loader2, Upload, CreditCard } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface TrainerRequest {
  id: string
  trainerId: string
  clientId: string
  status: string
  createdAt: string
  trainer: {
    id: string
    name: string | null
    email: string
    bio: string | null
    specialties: string[] | null
    yearsExperience: number | null
  }
}

interface MembershipPlan {
  id: string
  name: string
  price: number
  currency: string
  durationDays: number
  description: string | null
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<TrainerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [acceptedTrainerId, setAcceptedTrainerId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/user/trainer-requests")
      if (!res.ok) throw new Error("Error")
      const data = await res.json()
      setRequests(data.requests || [])
    } catch { toast.error("Error al cargar solicitudes") }
    finally { setLoading(false) }
  }, [])

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/membership-plans")
      if (!res.ok) return
      const data = await res.json()
      setPlans(data.plans || [])
    } catch {}
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])
  useEffect(() => { fetchPlans() }, [fetchPlans])

  const handleAccept = useCallback(async (requestId: string, trainerId: string) => {
    setAccepting(requestId)
    try {
      const res = await fetch(`/api/user/trainer-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPTED" }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Error al aceptar"); return }
      toast.success("Entrenador aceptado. Ahora realiza tu pago.")
      setAcceptedTrainerId(trainerId)
      setShowPayment(true)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch { toast.error("Error de conexion") }
    finally { setAccepting(null) }
  }, [])

  const handleReject = useCallback(async (requestId: string) => {
    setAccepting(requestId)
    try {
      const res = await fetch(`/api/user/trainer-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECTED" }),
      })
      if (!res.ok) { toast.error("Error al rechazar"); return }
      toast.success("Solicitud rechazada")
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch { toast.error("Error de conexion") }
    finally { setAccepting(null) }
  }, [])

  const handleUploadPayment = useCallback(async () => {
    if (!selectedPlan || !receiptFile) {
      toast.error("Selecciona un plan y sube el comprobante")
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", receiptFile)
      formData.append("planId", selectedPlan)
      formData.append("method", "YAPE")
      const res = await fetch("/api/payments", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Error al procesar pago"); return }
      toast.success("Comprobante subido. Espera la confirmación de tu entrenador.")
      setShowPayment(false)
      setSelectedPlan("")
      setReceiptFile(null)
    } catch { toast.error("Error de conexion") }
    finally { setUploading(false) }
  }, [selectedPlan, receiptFile])

  const pending = requests.filter((r) => r.status === "PENDING")
  const processed = requests.filter((r) => r.status !== "PENDING")

  if (loading) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    )
  }

  const selectedPlanData = plans.find((p) => p.id === selectedPlan)

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitudes de entrenador</h1>
          <p className="text-muted-foreground">Gestiona las solicitudes de entrenadores que quieren ser tu coach</p>
        </div>

        {showPayment && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-accent-yellow/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-accent-yellow" />
                  <CardTitle>Realizar pago de membresía</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Selecciona tu plan</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige un plan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} — {plan.currency} ${plan.price} / {plan.durationDays} días
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlanData && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <p className="text-sm font-medium">{selectedPlanData.name}</p>
                    <p className="text-2xl font-bold text-accent-yellow">
                      {selectedPlanData.currency} ${selectedPlanData.price}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Duración: {selectedPlanData.durationDays} días
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Paga mediante Yape y sube tu comprobante.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Comprobante de Yape</Label>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} type="button">
                      <Upload className="h-4 w-4 mr-2" /> Seleccionar imagen
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />
                    {receiptFile && <span className="text-sm text-muted-foreground">{receiptFile.name}</span>}
                  </div>
                </div>

                <Button
                  onClick={handleUploadPayment}
                  disabled={uploading || !selectedPlan || !receiptFile}
                  className="w-full"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Subir comprobante y activar membresía
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {pending.length === 0 && !showPayment && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <p className="text-base font-medium">No tienes solicitudes pendientes</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cuando un entrenador te envíe una solicitud, aparecerá aquí.
              </p>
            </CardContent>
          </Card>
        )}

        {pending.map((req) => (
          <motion.div key={req.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-yellow/10">
                    <Users className="h-6 w-6 text-accent-yellow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold">{req.trainer.name || "Sin nombre"}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />{req.trainer.email}
                      </span>
                      {req.trainer.yearsExperience && (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Award className="h-3.5 w-3.5" />{req.trainer.yearsExperience} años exp.
                        </span>
                      )}
                    </div>
                    {req.trainer.bio && (
                      <p className="text-sm text-muted-foreground mt-2">{req.trainer.bio}</p>
                    )}
                    {req.trainer.specialties && req.trainer.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {req.trainer.specialties.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Recibida {new Date(req.createdAt).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(req.id)}
                    disabled={accepting === req.id}
                  >
                    {accepting === req.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(req.id, req.trainerId)}
                    disabled={accepting === req.id}
                  >
                    {accepting === req.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    Aceptar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {processed.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-semibold mb-3">Historial</h2>
            <div className="space-y-2">
              {processed.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{req.trainer.name || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground">{req.trainer.email}</p>
                    </div>
                  </div>
                  <Badge variant={req.status === "ACCEPTED" ? "default" : "destructive"} className="text-xs">
                    {req.status === "ACCEPTED" ? "Aceptado" : "Rechazado"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
