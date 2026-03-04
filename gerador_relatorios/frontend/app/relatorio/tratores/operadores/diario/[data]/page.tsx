import { notFound } from "next/navigation"
import { getReportByDate, formatDateForDisplay } from "@/lib/data/reports"
import { RelatorioPrintViewTrator } from "@/components/relatorios/tt-diario-operadores/RelatorioPrintView"

interface PageProps {
  params: {
    data: string
  }
}

export default function TratorOperadoresDiarioPage({ params }: PageProps) {
  const rawData = getReportByDate('tratores', 'operadores', params.data)

  if (!rawData) {
    notFound()
  }

  // Garantir que a data esteja presente no metadata para o componente usar
  const data = {
    ...(rawData as any),
    metadata: {
      ...((rawData as any).metadata || {}),
      date: (rawData as any).metadata?.date || params.data
    }
  }

  return <RelatorioPrintViewTrator data={data} />
}
