import Link from "next/link"
import { getAvailableReports, formatDateForDisplay } from "@/lib/data/reports"

export default function HomePage() {
  const reports = getAvailableReports()
  
  // Group reports by date
  const reportsByDate = reports.reduce((acc, report) => {
    if (!acc[report.date]) {
      acc[report.date] = []
    }
    acc[report.date].push(report)
    return acc
  }, {} as Record<string, typeof reports>)

  // Sort dates descending
  const sortedDates = Object.keys(reportsByDate).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('-').map(Number)
    const [dayB, monthB, yearB] = b.split('-').map(Number)
    return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime()
  })

  const getEquipmentLabel = (equipment: string) => {
    return equipment === 'colhedora' ? 'Colhedora' : 'Trator'
  }

  const getTypeLabel = (type: string) => {
    return type === 'frotas' ? 'Frotas' : 'Operadores'
  }

  const getEquipmentIcon = (equipment: string) => {
    if (equipment === 'colhedora') {
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m-8 4h8m-8 4h4m4.5 2.5l-1.5 1.5m0 0l-1.5-1.5m1.5 1.5V17m0-10V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2h6m4-6h2a2 2 0 012 2v2a2 2 0 01-2 2h-2" />
        </svg>
      )
    }
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m-8 4h8m-4 4v4m-4-4h8a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h2" />
      </svg>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Relatórios Operacionais
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Visualização de relatórios diários de colhedoras e tratores
            </p>
          </div>
          <div className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
            {reports.length} Relatórios Disponíveis
          </div>
        </header>

        {/* Reports Grid by Date */}
        {sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-400 mb-2">Nenhum relatório encontrado</h2>
            <p className="text-zinc-500 text-sm">
              Os arquivos JSON de relatórios não foram encontrados no diretório esperado.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <section key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-100">
                      {formatDateForDisplay(date)}
                    </h2>
                    <p className="text-xs text-zinc-500">
                      {reportsByDate[date].length} relatório{reportsByDate[date].length > 1 ? 's' : ''} disponível{reportsByDate[date].length > 1 ? 'is' : ''}
                    </p>
                  </div>
                </div>

                {/* Report Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {reportsByDate[date].map((report) => (
                    <Link
                      key={`${report.equipment}-${report.type}-${report.date}`}
                      href={`/relatorio/${report.equipment}/${report.type}/diario/${report.date}`}
                      className="group"
                    >
                      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all h-full">
                        {/* Equipment Type Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              report.equipment === 'colhedora' 
                                ? 'bg-amber-900/30 text-amber-400' 
                                : 'bg-blue-900/30 text-blue-400'
                            }`}>
                              {getEquipmentIcon(report.equipment)}
                            </div>
                            <span className="font-semibold text-zinc-100">
                              {getEquipmentLabel(report.equipment)}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            report.type === 'frotas'
                              ? 'bg-violet-900/30 text-violet-400'
                              : 'bg-teal-900/30 text-teal-400'
                          }`}>
                            {getTypeLabel(report.type)}
                          </span>
                        </div>

                        {/* Info Row */}
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Diário
                          </span>
                          <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-zinc-800 pt-4 mt-8">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Gerador de Relatórios Operacionais</span>
            <span>Última atualização: {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </footer>
      </div>
    </main>
  )
}
