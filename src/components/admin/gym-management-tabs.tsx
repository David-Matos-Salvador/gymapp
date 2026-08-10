"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dumbbell, ListTodo, Wrench } from "lucide-react"
import { ExerciseManagement, type Exercise } from "./exercise-management"
import { RoutineManagement, type Plan } from "./routine-management"
import { GymEquipmentManager, type Equipment } from "@/components/gym-equipment/gym-equipment-manager"

interface SerializedMember {
  id: string
  name: string | null
  email: string
}

interface CurrentUser {
  id: string
  role: string
}

interface SerializedGym {
  id: string
  ownerId: string | null
  showMachineNumbers: boolean
}

interface GymManagementTabsProps {
  exercises: Exercise[]
  gymExerciseMap: Record<string, boolean>
  plans: Plan[]
  members: SerializedMember[]
  currentUser: CurrentUser
  systemEquipment: Equipment[]
  equipActiveMap: Record<string, boolean>
  gym: SerializedGym | null
  canManageEquipment: boolean
}

export function GymManagementTabs({
  exercises: initialExercises,
  gymExerciseMap: initialGymExerciseMap,
  plans: initialPlans,
  members,
  currentUser,
  systemEquipment,
  equipActiveMap: initialEquipActiveMap,
  gym,
  canManageEquipment,
}: GymManagementTabsProps) {
  const router = useRouter()
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises)
  const [gymExerciseMap, setGymExerciseMap] = useState<Record<string, boolean>>(initialGymExerciseMap)
  const [plans, setPlans] = useState<Plan[]>(initialPlans)
  const [equipActiveMap, setEquipActiveMap] = useState<Record<string, boolean>>(initialEquipActiveMap)

  const canEditExercise = (exercise: Exercise) =>
    exercise.userId === currentUser.id || currentUser.role === "SUPER_ADMIN"

  const canEditPlan = (plan: Plan) =>
    plan.userId === currentUser.id || currentUser.role === "SUPER_ADMIN"

  const handleToggleExercise = useCallback(async (exerciseId: string, active: boolean) => {
    setGymExerciseMap((prev) => ({ ...prev, [exerciseId]: active }))
    await fetch("/api/gym-exercises", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId, active }),
    })
    router.refresh()
  }, [router])

  const handleToggleEquipment = useCallback(async (equipmentId: string, active: boolean) => {
    setEquipActiveMap((prev) => ({ ...prev, [equipmentId]: active }))
    await fetch("/api/gym-equipment-activations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipmentId, active }),
    })
    router.refresh()
  }, [router])

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold tracking-tight">Gestión del Gimnasio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra ejercicios, rutinas y equipamiento
        </p>
      </div>

      <Tabs defaultValue="exercises">
        <TabsList variant="line" className="w-full justify-start border-b pb-0 rounded-none">
          <TabsTrigger value="exercises" className="gap-2">
            <Dumbbell className="size-4" />
            Ejercicios
          </TabsTrigger>
          <TabsTrigger value="routines" className="gap-2">
            <ListTodo className="size-4" />
            Rutinas
          </TabsTrigger>
          {canManageEquipment && (
            <TabsTrigger value="equipment" className="gap-2">
              <Wrench className="size-4" />
              Equipamiento
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="exercises" className="mt-6">
          <ExerciseManagement
            exercises={exercises}
            gymExerciseMap={gymExerciseMap}
            canEditExercise={canEditExercise}
            onExercisesChange={setExercises}
            onToggleExercise={handleToggleExercise}
          />
        </TabsContent>

        <TabsContent value="routines" className="mt-6">
          <RoutineManagement
            plans={plans}
            exercises={exercises.filter((ex) => gymExerciseMap[ex.id] !== false)}
            members={members}
            canEditPlan={canEditPlan}
            onPlansChange={setPlans}
            onExercisesChange={setExercises}
          />
        </TabsContent>

        {canManageEquipment && (
          <TabsContent value="equipment" className="mt-6">
            <GymEquipmentManager
              initialEquipment={[]}
              systemEquipment={systemEquipment}
              equipActiveMap={equipActiveMap}
              exercises={exercises.map((ex) => ({ id: ex.id, name: ex.name }))}
              gymId={gym?.id}
              showMachineNumbers={gym?.showMachineNumbers ?? false}
              onToggleEquipment={handleToggleEquipment}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
