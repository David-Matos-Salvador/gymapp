"use client"

import { useState } from "react"
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
  plans: Plan[]
  members: SerializedMember[]
  currentUser: CurrentUser
  equipment: Equipment[]
  gym: SerializedGym | null
  canManageEquipment: boolean
}

export function GymManagementTabs({
  exercises: initialExercises,
  plans: initialPlans,
  members,
  currentUser,
  equipment: initialEquipment,
  gym,
  canManageEquipment,
}: GymManagementTabsProps) {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises)
  const [plans, setPlans] = useState<Plan[]>(initialPlans)

  const canEditExercise = (exercise: Exercise) =>
    exercise.userId === currentUser.id || currentUser.role === "SUPER_ADMIN"

  const canEditPlan = (plan: Plan) =>
    plan.userId === currentUser.id || currentUser.role === "SUPER_ADMIN"

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
            canEditExercise={canEditExercise}
            onExercisesChange={setExercises}
          />
        </TabsContent>

        <TabsContent value="routines" className="mt-6">
          <RoutineManagement
            plans={plans}
            exercises={exercises}
            members={members}
            canEditPlan={canEditPlan}
            onPlansChange={setPlans}
            onExercisesChange={setExercises}
          />
        </TabsContent>

        {canManageEquipment && (
          <TabsContent value="equipment" className="mt-6">
            <GymEquipmentManager
              initialEquipment={initialEquipment}
              exercises={exercises.map((ex) => ({ id: ex.id, name: ex.name }))}
              gymId={gym?.id}
              showMachineNumbers={gym?.showMachineNumbers ?? false}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
