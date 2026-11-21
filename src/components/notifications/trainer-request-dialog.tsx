"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Users,
  Check,
  X,
  Mail,
  Award,
  Clock,
  Loader2,
  Upload,
  CreditCard,
  CheckCircle2,
} from "lucide-react"

interface TrainerRequestDetail {
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
}

interface TrainerRequestDialogProps {
  requestId: string | null
  onClose: () => void
  onResolved?: () => void
}

export function TrainerRequestDialog({
  requestId,
  onClose,
  onResolved,
}: TrainerRequestDialogProps) {
  const [request, setRequest] = useState<TrainerRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!requestId) return
    let cancelled = false

    fetch(`/api/user/trainer-requests/${requestId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) setRequest(d.request ?? null)
      })
      .catch(() => {
        if (!cancelled) toast.error("Error al cargar la solicitud")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    fetch("/api/membership-plans")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) setPlans(d.plans ?? [])
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [requestId])

  const finishResolved = useCallback(() => {
    onResolved?.()
    onClose()
  }, [onResolved, onClose])

  const handleAccept = useCallback(async () => {
    if (!request) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/user/trainer-requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPTED" }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al aceptar")
        return
      }
      if (data.hasActiveMembership) {
        toast.success("Entrenador aceptado")
        setDone(true)
      } else {
        toast.success("Entrenador aceptado. Ahora elige tu plan y sube tu comprobante.")
        setShowPayment(true)
      }
    } catch {
      toast.error("Error de conexión")
    } finally {
      setProcessing(false)
    }
  }, [request])

  const handleReject = useCallback(async () => {
    if (!request) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/user/trainer-requests/${request.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECTED" }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Error al rechazar")
        return
      }
      toast.success("Solicitud rechazada")
      setDone(true)
    } catch {
      toast.error("Error de conexión")
    } finally {
      setProcessing(false)
    }
  }, [request])

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
      const data = await res.json().catch(() => ({ error: "Error al procesar pago" }))
      if (!res.ok) {
        toast.error(data.error || "Error al procesar pago")
        return
      }
      toast.success("Comprobante subido. Espera la confirmación de tu entrenador.")
      setDone(true)
    } catch {
      toast.error("Error de conexión")
    } finally {
      setUploading(false)
    }
  }, [selectedPlan, receiptFile])

  const selectedPlanData = plans.find((p) => p.id === selectedPlan)

  return (
    <Dialog open={requestId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <DialogTitle className="sr-only">Cargando solicitud</DialogTitle>
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !request && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <DialogTitle className="sr-only">Error al cargar la solicitud</DialogTitle>
            <p className="text-sm text-muted-foreground">No se pudo cargar la solicitud.</p>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}

        {!loading && request && done && (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <DialogTitle className="sr-only">Solicitud procesada</DialogTitle>
            <div className="flex size-12 items-center justify-center rounded-full bg-accent-yellow/10">
              <CheckCircle2 className="size-6 text-gold" />
            </div>
            <p className="text-base font-medium">Listo</p>
            <p className="text-sm text-muted-foreground">
              {showPayment ? "Comprobante enviado a tu entrenador." : "Tu solicitud fue procesada."}
            </p>
            <Button onClick={finishResolved} className="mt-2">
              Entendido
            </Button>
          </div>
        )}

        {!loading && request && !done && !showPayment && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gold" />
                Solicitud de entrenador
              </DialogTitle>
              <DialogDescription>
                {request.trainer.name || "Un entrenador"} quiere ser tu coach.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-yellow/10">
                  <Users className="h-6 w-6 text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold">{request.trainer.name || "Sin nombre"}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {request.trainer.email}
                    </span>
                    {request.trainer.yearsExperience != null && (
                      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <Award className="h-3.5 w-3.5" />
                        {request.trainer.yearsExperience} años exp.
                      </span>
                    )}
                  </div>
                  {request.trainer.bio && (
                    <p className="text-sm text-muted-foreground mt-2">{request.trainer.bio}</p>
                  )}
                  {request.trainer.specialties && request.trainer.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {request.trainer.specialties.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Recibida {new Date(request.createdAt).toLocaleDateString("es-PE")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleReject} disabled={processing}>
                  {processing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <X className="h-3 w-3 mr-1" />
                  )}
                  Rechazar
                </Button>
                <Button size="sm" onClick={handleAccept} disabled={processing}>
                  {processing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  Aceptar
                </Button>
              </div>
            </div>
          </>
        )}

        {!loading && request && !done && showPayment && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gold" />
                Activar tu membresía
              </DialogTitle>
              <DialogDescription>
                {request.trainer.name || "Tu entrenador"} fue aceptado. Elige un plan y sube tu
                comprobante de Yape.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                  <p className="text-2xl font-bold text-gold">
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
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <Upload className="h-4 w-4 mr-2" /> Seleccionar imagen
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  {receiptFile && (
                    <span className="text-sm text-muted-foreground truncate max-w-[160px]">
                      {receiptFile.name}
                    </span>
                  )}
                </div>
              </div>

              <Button
                onClick={handleUploadPayment}
                disabled={uploading || !selectedPlan || !receiptFile}
                className="w-full"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Subir comprobante y activar membresía
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
