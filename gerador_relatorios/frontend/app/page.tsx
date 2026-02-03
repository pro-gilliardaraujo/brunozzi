import Link from "next/link";
import { getReportFileGroups, normalizeFileName } from "@/lib/data-service";

export default function HomePage() {
  const groups = getReportFileGroups();

  // Flatten all weeklies from all categories
  const allWeeklies = groups.flatMap(group => [
    ...group.buckets.frotas.semanal.map(f => ({ category: group.category, type: 'frotas', period: 'semanal', file: f })),
    ...group.buckets.operadores.semanal.map(f => ({ category: group.category, type: 'operadores', period: 'semanal', file: f }))
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Relatórios Operacionais</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Visão geral dos relatórios diários e semanais por categoria.
            </p>
          </div>
          <div className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
            {groups.length} Categorias &bull; {allWeeklies.length} Semanais
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* DAILY REPORTS SECTION (3 Columns) */}
          <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 self-start">
            {groups.map((group) => (
              <section 
                key={group.category} 
                className="bg-zinc-900/20 border border-zinc-800/60 rounded-xl overflow-hidden flex flex-col hover:border-zinc-700/60 transition-colors"
              >
                <div className="bg-zinc-900/40 px-4 py-3 border-b border-zinc-800/60 flex justify-between items-center">
                  <h2 className="font-semibold capitalize text-zinc-100 tracking-wide">
                    {group.category.replace(/_/g, " ")}
                  </h2>
                  <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                    Diário
                  </span>
                </div>

                <div className="p-4 grid grid-cols-2 gap-4">
                  {/* FROTAS COLUMN */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60 pb-1.5 mb-2">
                      Frotas
                    </h3>
                    {group.buckets.frotas.diario.length === 0 ? (
                      <div className="text-[11px] text-zinc-700 italic pl-1">Vazio</div>
                    ) : (
                      <ul className="space-y-1.5">
                        {group.buckets.frotas.diario.map((file) => {
                          const name = normalizeFileName(file);
                          // Extract date part only for cleaner display inside category card
                          const datePart = name.split('Diário ')[1] || name;
                          
                          return (
                            <li key={file}>
                              <Link
                                href={`/relatorio-json/${group.category}/frotas/diario/${encodeURIComponent(file)}`}
                                target="_blank"
                                className="group flex items-center justify-between rounded bg-zinc-900/40 px-2.5 py-2 text-[11px] text-zinc-300 border border-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
                                title={name}
                              >
                                <span>{datePart}</span>
                                <svg className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {/* OPERADORES COLUMN */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60 pb-1.5 mb-2">
                      Operadores
                    </h3>
                    {group.buckets.operadores.diario.length === 0 ? (
                      <div className="text-[11px] text-zinc-700 italic pl-1">Vazio</div>
                    ) : (
                      <ul className="space-y-1.5">
                        {group.buckets.operadores.diario.map((file) => {
                          const name = normalizeFileName(file);
                          const datePart = name.split('Diário ')[1] || name;
                          
                          // Extract raw date for URL (e.g. 05-10-2025)
                          const dateMatch = file.match(/(\d{2}-\d{2}-\d{4})/);
                          const urlParam = dateMatch ? dateMatch[1] : file.replace('.json', '');

                          return (
                            <li key={file}>
                              <Link
                                href={`/relatorio-json/${group.category}/operadores/diario/${encodeURIComponent(urlParam)}`}
                                target="_blank"
                                className="group flex items-center justify-between rounded bg-zinc-900/40 px-2.5 py-2 text-[11px] text-zinc-300 border border-zinc-800/40 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
                                title={name}
                              >
                                <span>{datePart}</span>
                                <svg className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* WEEKLY REPORTS SECTION (Sidebar) */}
          <div className="xl:col-span-1">
            <section className="bg-emerald-950/5 border border-emerald-900/20 rounded-xl overflow-hidden flex flex-col h-fit sticky top-6">
              <div className="bg-emerald-900/20 px-4 py-3 border-b border-emerald-900/30 flex items-center gap-2">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <h2 className="font-semibold text-emerald-100/90 tracking-wide">Relatórios Semanais</h2>
              </div>
              
              <div className="p-4 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
                {allWeeklies.length === 0 ? (
                  <div className="text-xs text-emerald-900/60 italic p-2 text-center border border-dashed border-emerald-900/20 rounded">
                    Nenhum relatório semanal encontrado
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {allWeeklies.map((item, idx) => {
                       const name = normalizeFileName(item.file);
                       const datePart = name.replace(/.*Semanal /, '');
                       
                       // Extract period for URL
                       const periodMatch = item.file.match(/periodo_(\d{2}-\d{2}-\d{4}_\d{2}-\d{2}-\d{4})/);
                       const urlParam = periodMatch ? periodMatch[1] : item.file.replace('.json', '');
                       
                       return (
                        <li key={`${item.file}-${idx}`}>
                          <Link
                            href={`/relatorio-json/${item.category}/${item.type}/semanal/${encodeURIComponent(urlParam)}`}
                            target="_blank"
                            className="block group rounded-lg bg-emerald-950/30 hover:bg-emerald-900/30 border border-emerald-900/30 hover:border-emerald-700/50 p-3 transition-all"
                            title={name}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/80 bg-emerald-950/50 px-1.5 py-0.5 rounded">
                                {item.category} &bull; {item.type}
                              </span>
                              <svg className="w-3 h-3 text-emerald-700 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                            <div className="text-xs text-emerald-100/90 font-medium">
                              {datePart}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
