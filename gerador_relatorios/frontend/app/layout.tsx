import type { ReactNode } from "react"
import "./globals.css"

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{props.children}</body>
    </html>
  )
}

