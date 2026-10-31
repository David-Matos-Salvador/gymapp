import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, statSync } from "fs"
import path from "path"
import { scheduleOptions, scheduleLabelMap } from "@/app/onboarding/constants"

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : tsxFiles(full)
    return full.endsWith(".tsx") ? [full] : []
  })
}

describe("onboarding schedule options", () => {
  it("has a distinct label for every option", () => {
    const labels = scheduleOptions.map((o) => o.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("has a distinct summary label for every option", () => {
    const labels = Object.values(scheduleLabelMap)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe("JSX text", () => {
  // React does not interpret \uXXXX inside JSX text, so it shows up literally on screen.
  // Catches text after a tag (`>\u00b7`) and after an expression (`{a}\u00d7{b}`).
  it("does not contain unicode escapes", () => {
    const srcDir = path.resolve(__dirname, "../..")
    const offenders = tsxFiles(srcDir).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => /(>|^\s*\{[^}]*\})[^<{"'`]*\\u[0-9a-fA-F]{4}/.test(line))
        .map(({ i }) => `${path.relative(srcDir, file)}:${i + 1}`)
    )
    expect(offenders).toEqual([])
  })
})
