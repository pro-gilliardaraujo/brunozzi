import { getReportData } from "@/lib/data-service";
import RelatorioDiarioFrotas from "@/componentes_migrados/relatorios/cd-diario-frotas/page";

interface PageProps {
  params: {
    filename: string;
  };
}

export default function RelatorioPage({ params }: PageProps) {
  const filename = decodeURIComponent(params.filename);
  const data = getReportData(filename);

  return <RelatorioDiarioFrotas data={data} />;
}
