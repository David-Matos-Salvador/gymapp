import React from "react"
import { describe, it, expect } from "vitest"
import { renderToString } from "react-dom/server"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

describe("Card", () => {
  it("exports Card as a function", () => {
    expect(Card).toBeDefined()
    expect(typeof Card).toBe("function")
  })

  it("renders a div with card data-slot", () => {
    const html = renderToString(React.createElement(Card, null, "Content"))
    expect(html).toContain('<div')
    expect(html).toContain('data-slot="card"')
    expect(html).toContain('data-size="default"')
    expect(html).toContain("Content")
  })

  it("renders with sm size", () => {
    const html = renderToString(React.createElement(Card, { size: "sm" }, "Small"))
    expect(html).toContain('data-size="sm"')
  })

  it("applies custom className", () => {
    const html = renderToString(
      React.createElement(Card, { className: "custom-card" }, "Test"),
    )
    expect(html).toContain("custom-card")
  })

  it("passes additional props", () => {
    const html = renderToString(
      React.createElement(Card, { id: "my-card", "data-testid": "card-1" }, "Test"),
    )
    expect(html).toContain('id="my-card"')
    expect(html).toContain('data-testid="card-1"')
  })
})

describe("CardHeader", () => {
  it("exports CardHeader as a function", () => {
    expect(CardHeader).toBeDefined()
    expect(typeof CardHeader).toBe("function")
  })

  it("renders with card-header data-slot", () => {
    const html = renderToString(React.createElement(CardHeader, null, "Header"))
    expect(html).toContain('data-slot="card-header"')
    expect(html).toContain("Header")
  })
})

describe("CardTitle", () => {
  it("exports CardTitle as a function", () => {
    expect(CardTitle).toBeDefined()
    expect(typeof CardTitle).toBe("function")
  })

  it("renders with card-title data-slot", () => {
    const html = renderToString(React.createElement(CardTitle, null, "Title"))
    expect(html).toContain('data-slot="card-title"')
    expect(html).toContain("Title")
  })
})

describe("CardDescription", () => {
  it("exports CardDescription as a function", () => {
    expect(CardDescription).toBeDefined()
    expect(typeof CardDescription).toBe("function")
  })

  it("renders with card-description data-slot", () => {
    const html = renderToString(
      React.createElement(CardDescription, null, "Description"),
    )
    expect(html).toContain('data-slot="card-description"')
    expect(html).toContain("Description")
  })
})

describe("CardAction", () => {
  it("exports CardAction as a function", () => {
    expect(CardAction).toBeDefined()
    expect(typeof CardAction).toBe("function")
  })

  it("renders with card-action data-slot", () => {
    const html = renderToString(React.createElement(CardAction, null, "Action"))
    expect(html).toContain('data-slot="card-action"')
    expect(html).toContain("Action")
  })
})

describe("CardContent", () => {
  it("exports CardContent as a function", () => {
    expect(CardContent).toBeDefined()
    expect(typeof CardContent).toBe("function")
  })

  it("renders with card-content data-slot", () => {
    const html = renderToString(React.createElement(CardContent, null, "Body"))
    expect(html).toContain('data-slot="card-content"')
    expect(html).toContain("Body")
  })
})

describe("CardFooter", () => {
  it("exports CardFooter as a function", () => {
    expect(CardFooter).toBeDefined()
    expect(typeof CardFooter).toBe("function")
  })

  it("renders with card-footer data-slot", () => {
    const html = renderToString(React.createElement(CardFooter, null, "Footer"))
    expect(html).toContain('data-slot="card-footer"')
    expect(html).toContain("Footer")
  })
})

describe("Card composition", () => {
  it("renders a full card with all sub-components", () => {
    const html = renderToString(
      React.createElement(
        Card,
        null,
        React.createElement(CardHeader, null, React.createElement(CardTitle, null, "Rutina A")),
        React.createElement(CardContent, null, "3 ejercicios"),
        React.createElement(CardFooter, null, "Iniciar"),
      ),
    )
    expect(html).toContain("Rutina A")
    expect(html).toContain("3 ejercicios")
    expect(html).toContain("Iniciar")
  })
})
