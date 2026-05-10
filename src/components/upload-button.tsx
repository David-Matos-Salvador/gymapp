"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useSound } from "@/hooks/use-sound"
import { Upload, Loader2 } from "lucide-react"

export function UploadButton({
  folder = "general",
  onUpload,
  label = "Subir foto",
  className,
}: {
  folder?: string
  onUpload: (url: string) => void
  label?: string
  className?: string
}) {
  const { play } = useSound()
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!allowed.includes(file.type)) {
      toast.error("Formato no permitido. Usa JPEG, PNG, WebP o GIF")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Archivo muy grande. Maximo 5MB")
      return
    }

    setUploading(true)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("type", folder)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()
      if (res.ok) {
        play("success")
        toast.success("Foto subida")
        onUpload(data.url)
      } else {
        toast.error(data.error || "Error al subir")
      }
    } catch {
      toast.error("Error de conexion")
    }

    setUploading(false)
    e.target.value = ""
  }

  return (
    <div className={className}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        id={`upload-${folder}`}
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => document.getElementById(`upload-${folder}`)?.click()}
      >
        {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
        {uploading ? "Subiendo..." : label}
      </Button>
    </div>
  )
}
