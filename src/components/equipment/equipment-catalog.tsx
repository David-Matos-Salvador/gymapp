"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dumbbell, Search, MapPin, ImageIcon } from "lucide-react"

interface ExerciseRef {
  id: string
  name: string
}

interface Equipment {
  id: string
  name: string
  category: string | null
  location: string | null
  imageUrl: string | null
  exerciseId: string | null
  exercise: ExerciseRef | null
}

interface EquipmentCatalogProps {
  equipment: Equipment[]
  hasGym: boolean
}

export function EquipmentCatalog({ equipment, hasGym }: EquipmentCatalogProps) {
  const [search, setSearch] = useState("")

  const filtered = search.trim()
    ? equipment.filter((e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.toLowerCase().includes(search.toLowerCase()) ||
        e.location?.toLowerCase().includes(search.toLowerCase()) ||
        e.exercise?.name.toLowerCase().includes(search.toLowerCase())
      )
    : equipment

  if (!hasGym) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">Sin gimnasio asignado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contacta a un administrador para que te asigne a un gimnasio
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar equipamiento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <Dumbbell className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search.trim()
                  ? "No se encontró equipamiento con ese criterio de búsqueda"
                  : "No hay equipamiento registrado en tu gimnasio"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            >
              <Card className="h-full hover:shadow-md transition-all">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-36 w-full object-cover rounded-t-xl"
                  />
                ) : (
                  <div className="h-36 w-full flex items-center justify-center bg-muted rounded-t-xl">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
                <CardContent className="space-y-2 pt-4">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.category && (
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {item.category}
                    </span>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}
                  {item.exercise && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Dumbbell className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.exercise.name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
