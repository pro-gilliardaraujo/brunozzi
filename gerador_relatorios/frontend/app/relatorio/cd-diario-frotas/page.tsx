"use client"

import React from "react"
import { RelatorioPrintView } from "@/components/relatorios/cd-diario-frotas/RelatorioPrintView"
import { DADOS_MOCK } from "@/components/relatorios/cd-diario-frotas/dados"

// Adapter to ensure DADOS_MOCK matches ColhedoraFrotaData
// Since RelatorioPrintView now expects strict typing, we might need to cast or ensure DADOS_MOCK is compliant.
// For now, we cast to any to allow the mock to render even if types aren't 100% perfect, 
// but in a real scenario we should align DADOS_MOCK.
const data = DADOS_MOCK as any

export default function RelatorioCdDiarioFrotasMockPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-8">
       <div className="mb-4 text-center">
        <h1 className="text-xl font-bold">Visualização de Mock - Layout A4</h1>
        <p className="text-sm text-gray-600">Esta página exibe o layout com dados fictícios para fins de desenvolvimento.</p>
       </div>
       <RelatorioPrintView data={data} period="diario" />
    </div>
  )
}
