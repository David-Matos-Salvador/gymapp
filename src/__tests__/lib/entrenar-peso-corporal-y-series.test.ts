import { describe, expect, it } from "vitest"
import { finishPartialQuestion, weightLabel } from "@/constants/workout"
import { groupSetsByExercise } from "@/lib/utils"

describe("aviso al finalizar con ejercicios sin series (#174)", () => {
  it("con uno solo no dice «ejercicio(s)»", () => {
    expect(finishPartialQuestion(["Burpees"])).toBe(
      "Vas a finalizar con 1 ejercicio sin series: Burpees. ¿Continuar?"
    )
  })

  it("con varios usa el plural", () => {
    expect(finishPartialQuestion(["Burpees", "Plancha"])).toBe(
      "Vas a finalizar con 2 ejercicios sin series: Burpees, Plancha. ¿Continuar?"
    )
  })
})

describe("rótulo del peso al entrenar (#174)", () => {
  it("en peso corporal el peso es el lastre opcional", () => {
    expect(weightLabel("BODYWEIGHT")).toBe("Lastre")
  })

  it("con equipo sigue siendo kg", () => {
    expect(weightLabel("BARBELL")).toBe("kg")
  })
})

describe("series de un entrenamiento agrupadas por ejercicio (#174)", () => {
  it("no las intercala y respeta el orden en que se hizo cada ejercicio", () => {
    const sets = [
      { exerciseName: "Fondos", reps: 10 },
      { exerciseName: "Press banca", reps: 8 },
      { exerciseName: "Fondos", reps: 9 },
      { exerciseName: "Press banca", reps: 7 },
    ]
    expect(groupSetsByExercise(sets)).toEqual([
      {
        exerciseName: "Fondos",
        sets: [
          { exerciseName: "Fondos", reps: 10 },
          { exerciseName: "Fondos", reps: 9 },
        ],
      },
      {
        exerciseName: "Press banca",
        sets: [
          { exerciseName: "Press banca", reps: 8 },
          { exerciseName: "Press banca", reps: 7 },
        ],
      },
    ])
  })
})
