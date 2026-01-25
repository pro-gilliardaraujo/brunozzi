import Link from 'next/link';
import { getReportList } from "@/lib/data-service";

export default function HomePage() {
  const reports = getReportList();

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Relatórios Disponíveis</h1>
      <div className="grid gap-4">
        {reports.length === 0 ? (
          <p className="text-slate-500">Nenhum relatório encontrado na pasta de dados.</p>
        ) : (
          reports.map((file) => (
            <Link 
              key={file} 
              href={`/relatorio/${file}`}
              className="block p-6 border rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 transition-all"
            >
              <div className="font-medium text-lg text-blue-600">{file}</div>
              <div className="text-sm text-slate-500 mt-1">Clique para visualizar o relatório completo</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
