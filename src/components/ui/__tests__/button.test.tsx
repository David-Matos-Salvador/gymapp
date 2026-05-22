import React from "react"
import { describe, it, expect } from "vitest"
import { renderToString } from "react-dom/server"
import { Button, buttonVariants } from "@/components/ui/button"

describe("Button", () => {
  it("exports Button as a function", () => {
    expect(Button).toBeDefined()
    expect(typeof Button).toBe("function")
  })

  it("exports buttonVariants", () => {
    expect(buttonVariants).toBeDefined()
    expect(typeof buttonVariants).toBe("function")
  })

  it("renders a button element with default variant and size", () => {
    const html = renderToString(React.createElement(Button, null, "Click me"))
    expect(html).toContain('<button')
    expect(html).toContain('data-slot="button"')
    expect(html).toContain('data-variant="default"')
    expect(html).toContain('data-size="default"')
    expect(html).toContain("Click me")
  })

  it("renders with custom variant and size", () => {
    const html = renderToString(
      React.createElement(Button, { variant: "destructive", size: "lg" }, "Delete"),
    )
    expect(html).toContain('data-variant="destructive"')
    expect(html).toContain('data-size="lg"')
    expect(html).toContain("Delete")
  })

  it("renders as a Slot when asChild is true", () => {
    const html = renderToString(
      React.createElement(Button, { asChild: true }, "Go"),
    )
    expect(html).not.toContain("<button")
  })

  it("passes additional props to the element", () => {
    const html = renderToString(
      React.createElement(
        Button,
        { type: "submit" as React.ButtonHTMLAttributes<HTMLButtonElement>["type"], disabled: true, className: "custom-class" },
        "Submit",
      ),
    )
    expect(html).toContain('type="submit"')
    expect(html).toContain("disabled")
    expect(html).toContain("custom-class")
  })
})

describe("buttonVariants", () => {
  it("returns default classes", () => {
    const cls = buttonVariants()
    expect(cls).toContain("inline-flex")
    expect(cls).toContain("bg-primary")
  })

  it("returns outline variant classes", () => {
    const cls = buttonVariants({ variant: "outline" })
    expect(cls).toContain("border-border")
  })

  it("returns destructive variant classes", () => {
    const cls = buttonVariants({ variant: "destructive" })
    expect(cls).toContain("text-destructive")
  })

  it("returns ghost variant classes", () => {
    const cls = buttonVariants({ variant: "ghost" })
    expect(cls).toContain("hover:bg-muted")
  })

  it("returns link variant classes", () => {
    const cls = buttonVariants({ variant: "link" })
    expect(cls).toContain("underline-offset-4")
  })

  it("returns secondary variant classes", () => {
    const cls = buttonVariants({ variant: "secondary" })
    expect(cls).toContain("bg-secondary")
  })

  it("returns xs size classes", () => {
    const cls = buttonVariants({ size: "xs" })
    expect(cls).toContain("h-6")
    expect(cls).toContain("text-xs")
  })

  it("returns sm size classes", () => {
    const cls = buttonVariants({ size: "sm" })
    expect(cls).toContain("h-7")
  })

  it("returns lg size classes", () => {
    const cls = buttonVariants({ size: "lg" })
    expect(cls).toContain("h-9")
  })

  it("returns icon size classes", () => {
    const cls = buttonVariants({ size: "icon" })
    expect(cls).toContain("size-8")
  })

  it("combines variant and size", () => {
    const cls = buttonVariants({ variant: "outline", size: "sm" })
    expect(cls).toContain("border-border")
    expect(cls).toContain("h-7")
  })

  it("appends custom className", () => {
    const cls = buttonVariants({ className: "my-custom" })
    expect(cls).toContain("my-custom")
  })
})
