import { notFound } from "next/navigation"
import Link from "next/link"
import { getReportByDate, formatDateForDisplay } from "@/lib/data/reports"
import { ColhedoraOperadoresData, ColhedoraOperadorData } from "@/lib/types"

interface PageProps {
  params: {
    data: string
  }
}

export default function ColhedoraOperadoresDiarioPage({ params }: PageProps) {
  const data = getReportByDate('colhedora', 'operadores', params.data) as ColhedoraOperadoresData | null

  if (!data) {
    notFound()
  }

  // Convert record to array for easier processing
  const operadores = Object.entries(data).map(([nome, dados]) => ({
    nome,
    ...dados
  }))

  // Calculate totals and averages
  const totalHorasRegistradas = operadores.reduce((acc, op) => acc + op.Horas_Registradas, 0)
  const totalHorasProdutivas = operadores.reduce((acc, op) => acc + op.Horas_Produtivas, 0)
  const totalHorasImprodutivas = operadores.reduce((acc, op) => acc + op.Horas_Improdutivas, 0)
  const totalHorasMotorLigado = operadores.reduce((acc, op) => acc + op.Horas_Motor_Ligado, 0)
  const totalHorasMotorOcioso = operadores.reduce((acc, op) => acc + op.Horas_Motor_Ocioso, 0)
  
  const mediaEficienciaOperacional = operadores.reduce((acc, op) => acc + op.Eficiencia_Operacional, 0) / (operadores.length || 1)
  const mediaEficienciaEnergetica = operadores.reduce((acc, op) => acc + op.Eficiencia_Energetica, 0) / (operadores.length || 1)
  const mediaMotorOcioso = operadores.reduce((acc, op) => acc + op.Porcentagem_Motor_Ocioso, 0) / (operadores.length || 1)

  // Format hours to HH:MM
  const formatHours = (decimalHours: number) => {
    const hours = Math.floor(decimalHours)
    const minutes = Math.round((decimalHours - hours) * 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Format percentage
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Relatório Diário - Colhedora Operadores
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Data: {formatDateForDisplay(params.data)} | {operadores.length} operadores
              </p>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Horas Registradas</h3>
            <p className="text-2xl font-bold text-zinc-100">{formatHours(totalHorasRegistradas)}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Horas Produtivas</h3>
            <p className="text-2xl font-bold text-green-400">{formatHours(totalHorasProdutivas)}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Eficiência Média</h3>
            <p className="text-2xl font-bold text-amber-400">{formatPercent(mediaEficienciaOperacional)}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Motor Ocioso Médio</h3>
            <p className="text-2xl font-bold text-red-400">{mediaMotorOcioso.toFixed(1)}%</p>
          </div>
        </section>

        {/* Operators Table */}
        <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Detalhamento por Operador
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900/60">
                <tr>
                  <th className="text-left p-3 font-semibold text-zinc-400">Operador</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">H. Registradas</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">H. Produtivas</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">H. Improdutivas</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">H. Manutenção</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">H. Motor Ligado</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">Motor Ocioso</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">Eficiência Op.</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">Manobras</th>
                  <th className="text-center p-3 font-semibold text-zinc-400">Frotas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {operadores.map((op, index) => (
                  <tr key={op.nome} className={`hover:bg-zinc-800/40 ${index % 2 === 0 ? 'bg-zinc-900/20' : ''}`}>
                    <td className="p-3 font-medium text-zinc-200">{op.nome}</td>
                    <td className="p-3 text-center text-zinc-300">{formatHours(op.Horas_Registradas)}</td>
                    <td className="p-3 text-center text-green-400">{formatHours(op.Horas_Produtivas)}</td>
                    <td className="p-3 text-center text-red-400">{formatHours(op.Horas_Improdutivas)}</td>
                    <td className="p-3 text-center text-amber-400">{formatHours(op.Horas_Manutencao)}</td>
                    <td className="p-3 text-center text-zinc-300">{formatHours(op.Horas_Motor_Ligado)}</td>
                    <td className={`p-3 text-center font-medium ${op.Porcentagem_Motor_Ocioso > 20 ? 'text-red-400' : op.Porcentagem_Motor_Ocioso > 10 ? 'text-amber-400' : 'text-green-400'}`}>
                      {op.Porcentagem_Motor_Ocioso.toFixed(1)}%
                    </td>
                    <td className={`p-3 text-center font-medium ${op.Eficiencia_Operacional > 0.6 ? 'text-green-400' : op.Eficiencia_Operacional > 0.4 ? 'text-amber-400' : 'text-red-400'}`}>
                      {formatPercent(op.Eficiencia_Operacional)}
                    </td>
                    <td className="p-3 text-center text-zinc-300">{op.Quantidade_Manobras}</td>
                    <td className="p-3 text-center text-zinc-400 text-[10px] max-w-[120px] truncate" title={op.Frotas_no_dia}>
                      {op.Frotas_no_dia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Performance Analysis */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Top 5 - Eficiência Operacional
            </h3>
            <div className="space-y-2">
              {operadores
                .sort((a, b) => b.Eficiencia_Operacional - a.Eficiencia_Operacional)
                .slice(0, 5)
                .map((op, index) => (
                  <div key={op.nome} className="flex items-center justify-between bg-zinc-800/40 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-500 text-black' : 
                        index === 1 ? 'bg-zinc-400 text-black' : 
                        index === 2 ? 'bg-amber-700 text-white' : 
                        'bg-zinc-700 text-zinc-300'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm text-zinc-200">{op.nome}</span>
                    </div>
                    <span className="text-sm font-bold text-green-400">{formatPercent(op.Eficiencia_Operacional)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Needs Attention */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Atenção - Alto Motor Ocioso
            </h3>
            <div className="space-y-2">
              {operadores
                .filter(op => op.Porcentagem_Motor_Ocioso > 20)
                .sort((a, b) => b.Porcentagem_Motor_Ocioso - a.Porcentagem_Motor_Ocioso)
                .slice(0, 5)
                .map((op) => (
                  <div key={op.nome} className="flex items-center justify-between bg-red-900/20 border border-red-900/30 rounded-lg p-3">
                    <span className="text-sm text-zinc-200">{op.nome}</span>
                    <span className="text-sm font-bold text-red-400">{op.Porcentagem_Motor_Ocioso.toFixed(1)}%</span>
                  </div>
                ))}
              {operadores.filter(op => op.Porcentagem_Motor_Ocioso > 20).length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">Nenhum operador com motor ocioso acima de 20%</p>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-800 pt-4 mt-8">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Relatório de Colhedora Operadores - {formatDateForDisplay(params.data)}</span>
            <span>{operadores.length} operadores listados</span>
          </div>
        </footer>
      </div>
    </main>
  )
}
