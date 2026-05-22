"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Upload, Loader2, X, ImagePlus } from "lucide-react"

interface ProgressPhotoUploadProps {
  onUpload: (url: string) => void
}

export function ProgressPhotoUpload({ onUpload }: ProgressPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState("")

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowed.includes(selected.type)) {
      toast.error("Formato no permitido. Usa JPEG, PNG, WebP o GIF")
      return
    }

    if (selected.size > 5 * 1024 * 1024) {
      toast.error("Archivo muy grande. Máximo 5MB")
      return
    }

    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  function handleClear() {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleUpload() {
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "progress")

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData })
      if (!uploadRes.ok) {
        const data = await uploadRes.json()
        throw new Error(data.error ?? "Error al subir la imagen")
      }

      const { url } = await uploadRes.json()

      const photoRes = await fetch("/api/progress-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, category: category || undefined }),
      })

      if (!photoRes.ok) {
        const data = await photoRes.json()
        throw new Error(data.error ?? "Error al registrar la foto")
      }

      toast.success("Foto de progreso guardada")
      onUpload(url)
      handleClear()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la foto")
    } finally {
      setUploading(false)
    }
  }

  const categories = ["", "Frente", "Espalda", "Lado", "Piernas", "Brazos", "Otro"]

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />

      {preview ? (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border">
            <img
              src={preview}
              alt="Vista previa"
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-background/80 hover:bg-background transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="progress-category">Categoría</Label>
            <select
              id="progress-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat || "Sin categoría"}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Guardar foto
              </>
            )}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted p-8 text-muted-foreground transition-colors hover:border-accent-yellow/50 hover:text-accent-yellow"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ImagePlus className="size-6" />
          </div>
          <div className="text-sm font-medium">
            Seleccionar foto de progreso
          </div>
          <p className="text-xs">JPEG, PNG, WebP o GIF (máx. 5MB)</p>
        </button>
      )}
    </div>
  )
}
