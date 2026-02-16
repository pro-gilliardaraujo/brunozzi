import { notFound } from "next/navigation"
import { getReportByDate } from "@/lib/data/reports"
import { ColhedoraFrotaData } from "@/lib/types"
import { RelatorioPrintView } from "@/components/relatorios/cd-diario-frotas/RelatorioPrintView"

interface PageProps {
  params: {
    data: string
  }
}

export default function ColhedoraFrotasDiarioPage({ params }: PageProps) {
  const data = getReportByDate('colhedora', 'frotas', params.data) as ColhedoraFrotaData | null

  if (!data) {
    notFound()
  }

  return <RelatorioPrintView data={data} period="diario" />
}
