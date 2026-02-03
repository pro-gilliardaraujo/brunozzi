import { notFound } from "next/navigation";
import { getJsonReportData } from "@/lib/data-service";
import { transformColhedoraFrotas } from "@/lib/transformers";
import RelatorioFrotasCd from "@/componentes_migrados/relatorios/cd-diario-frotas/page";

interface PageProps {
  params: {
    category: string;
    type: "frotas" | "operadores";
    period: "diario" | "semanal";
    file: string;
  };
}

export default function JsonReportPage({ params }: PageProps) {
  const fileIdentifier = decodeURIComponent(params.file);
  const rawData = getJsonReportData(params.category, params.type, params.period, fileIdentifier);

  if (!rawData) {
    notFound();
  }

  // Normalize params for comparison
  const category = params.category.toLowerCase();
  const type = params.type.toLowerCase();
  const period = params.period.toLowerCase();

  // Construct Title and Date for metadata
  let displayDate = fileIdentifier;
  const dateMatch = fileIdentifier.match(/(\d{2}-\d{2}-\d{4})/);
  if (dateMatch) {
      displayDate = dateMatch[1].replace(/-/g, '/');
  }
  
  // Clean up filename noise if present
  if (displayDate.endsWith('.json')) {
      displayDate = displayDate.replace('.json', '').replace(/_/g, ' ');
  }

  const reportTitle = `${category.charAt(0).toUpperCase() + category.slice(1)} ${type.charAt(0).toUpperCase() + type.slice(1)} - ${displayDate}`;

  // Mapping Logic
  // Currently only Colhedora Frotas Diario is fully implemented
  if (category === 'colhedora' && type === 'frotas' && period === 'diario') {
    const transformedData = transformColhedoraFrotas(rawData, {
        title: reportTitle,
        date: new Date().toISOString() // Using current generation time, or could parse dateMatch
    });
    return <RelatorioFrotasCd period="diario" data={transformedData} />;
  }

  // Fallback for unimplemented templates
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
               </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-zinc-100">Visualização em Construção</h1>
            <p className="text-zinc-400 max-w-lg mx-auto">
                O template visual para <strong>{params.category} / {params.type} / {params.period}</strong> está sendo implementado.
            </p>
        </div>
        
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
             <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Dados Brutos (JSON)</span>
                <span className="text-xs text-zinc-600 font-mono">{file}</span>
             </div>
             <pre className="p-4 text-[11px] font-mono text-zinc-500 overflow-auto max-h-[60vh] custom-scrollbar">
                {JSON.stringify(rawData, null, 2)}
             </pre>
        </div>
      </div>
    </main>
  );
}
