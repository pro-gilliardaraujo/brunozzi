import { notFound } from "next/navigation"
import { getReportByDate } from "@/lib/data/reports"
import { RelatorioPrintViewTrator } from "@/components/relatorios/tt-diario-frotas/RelatorioPrintView"

interface PageProps {
  params: {
    data: string
  }
}

export default function TratorFrotasDiarioPage({ params }: PageProps) {
  const data = getReportByDate('tratores', 'frotas', params.data) as any

  if (!data) {
    notFound()
  }

  return <RelatorioPrintViewTrator data={data} period="diario" />
}
