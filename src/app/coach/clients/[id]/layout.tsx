import type { Metadata } from "next"

// La página es un componente de cliente y no puede exportar metadata: el título va aquí.
export const metadata: Metadata = {
  title: "Ficha del cliente",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
