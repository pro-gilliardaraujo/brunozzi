import { notFound } from "next/navigation"
import Link from "next/link"
import { getReportByDate, formatDateForDisplay } from "@/lib/data/reports"
import { TratorFrotaData } from "@/lib/types"
import { 
  GraficoEficiencia, 
  GraficoMotorOcioso, 
  GraficoManobras, 
  GraficoMediaVelocidade, 
  GraficoDisponibilidadeMecanica,
  GraficoIntervalos,
  GraficoTop5Ofensores,
  CardIndicador,
  TabelaResumo
} from "@/components/shared"
import { GraficoBasculamento, GraficoFaltaApontamento } from "@/components/trator"

interface PageProps {
  params: {
    data: string
  }
}

export default function TratorFrotasDiarioPage({ params }: PageProps) {
  const data = getReportByDate('tratores', 'frotas', params.data) as TratorFrotaData | null

  if (!data) {
    notFound()
  }

  const { metadata, metas, eficiencia_energetica, motor_ocioso, 
          manobras_frotas, media_velocidade, disponibilidade_mecanica, 
          intervalos_operacao, ofensores, dados_case } = data

  // Calculate averages for indicator cards
  const dadosEficienciaValidos = eficiencia_energetica.filter(d => d.eficiencia > 0)
  const mediaEficiencia = dadosEficienciaValidos.reduce((acc, curr) => acc + curr.eficiencia, 0) / (dadosEficienciaValidos.length || 1)
  
  const dadosMotorOciosoValidos = motor_ocioso.filter(d => d.percentual > 0)
  const mediaMotorOcioso = dadosMotorOciosoValidos.reduce((acc, curr) => acc + curr.percentual, 0) / (dadosMotorOciosoValidos.length || 1)

  const dadosDisponibilidadeValidos = disponibilidade_mecanica.filter(d => d.disponibilidade > 0)
  const mediaDisponibilidade = dadosDisponibilidadeValidos.reduce((acc, curr) => acc + curr.disponibilidade, 0) / (dadosDisponibilidadeValidos.length || 1)

  const dadosVelocidadeValidos = media_velocidade.filter(d => d.velocidade > 0)
  const mediaVelocidade = dadosVelocidadeValidos.reduce((acc, curr) => acc + curr.velocidade, 0) / (dadosVelocidadeValidos.length || 1)

  // Prepare data for manobras chart
  const dadosManobras = manobras_frotas.map(m => ({
    Frota: m.Frota,
    "Tempo Total": m["Tempo Total"],
    "Tempo Médio": m["Tempo Médio"],
    "Intervalos Válidos": m["Intervalos Válidos"],
    "Tempo Total (hh:mm)": m["Tempo Total (hh:mm)"],
    "Tempo Médio (hh:mm)": m["Tempo Médio (hh:mm)"]
  }))

  // Prepare data for top 5 ofensores
  const dadosOfensores = ofensores.map(o => ({
    nome: o.nome,
    percentual: o.percentual,
    duracao: o.duracao
  }))

  // Prepare data for tabela resumo
  const dadosResumo = eficiencia_energetica.map(f => {
    const disp = disponibilidade_mecanica.find(d => d.nome === f.nome)
    const ocioso = motor_ocioso.find(d => d.nome === f.nome)
    const vel = media_velocidade.find(d => d.nome === f.nome)
    const man = manobras_frotas.find(d => d.Frota === f.nome)

    return {
      frota: f.nome,
      eficiencia: f.eficiencia || 0,
      horasElevador: f.horasElevador || 0,
      producao: 0,
      velocidade: vel?.velocidade || 0,
      gps: 0,
      manobra: man ? Number(man["Tempo Total"] || 0) * 60 : 0,
      ocioso: ocioso?.percentual || 0,
      disponibilidade: disp?.disponibilidade || 0
    }
  })

  // Group intervalos by equipamento for GraficoIntervalos
  type Intervalo = {
    tipo: 'Produtivo' | 'Disponível' | 'Manutenção' | 'Falta de Informação'
    inicio: string
    duracaoHoras: number
  }
  
  const intervalosAgrupados = intervalos_operacao.reduce((acc, item) => {
    if (!acc[item.equipamento]) {
      acc[item.equipamento] = []
    }
    acc[item.equipamento].push({
      tipo: item.tipo,
      inicio: item.inicio,
      duracaoHoras: item.duracaoHoras
    })
    return acc
  }, {} as Record<string, Intervalo[]>)

  // Prepare data for basculamento (using manobras data as placeholder)
  const dadosBasculamento = manobras_frotas.map(m => ({
    Frota: m.Frota,
    "Tempo Total": m["Tempo Total"],
    "Tempo Médio": m["Tempo Médio"],
    "Intervalos Válidos": m["Intervalos Válidos"],
    "Tempo Total (hh:mm)": m["Tempo Total (hh:mm)"],
    "Tempo Médio (hh:mm)": m["Tempo Médio (hh:mm)"]
  }))

  // Prepare data for falta de apontamento (using motor_ocioso data as placeholder)
  const dadosFaltaApontamento = motor_ocioso.map(m => ({
    id: m.id,
    nome: m.nome,
    percentual: m.percentual,
    tempoLigado: m.tempoLigado,
    tempoOcioso: m.tempoOcioso
  }))

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
                Relatório Diário - Trator Frotas
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Data: {formatDateForDisplay(params.data)} | Frente: {metadata.frente || 'N/A'}
              </p>
            </div>
          </div>
          <div className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
            Gerado em: {new Date(metadata.generated_at).toLocaleString('pt-BR')}
          </div>
        </header>

        {/* Indicator Cards */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <CardIndicador
            titulo="Eficiência Operacional"
            meta={metas.eficienciaOperacional}
            unidade="%"
            dados={dadosEficienciaValidos.map(d => ({ valor: d.eficiencia }))}
            tipo="asc"
            formatarValor={(v) => v.toFixed(1)}
          />
          <CardIndicador
            titulo="Motor Ocioso"
            meta={metas.motorOcioso}
            unidade="%"
            dados={dadosMotorOciosoValidos.map(d => ({ valor: d.percentual }))}
            tipo="desc"
            formatarValor={(v) => v.toFixed(1)}
          />
          <CardIndicador
            titulo="Disponibilidade Mecânica"
            meta={metas.disponibilidadeMecanica}
            unidade="%"
            dados={dadosDisponibilidadeValidos.map(d => ({ valor: d.disponibilidade }))}
            tipo="asc"
            formatarValor={(v) => v.toFixed(1)}
          />
          <CardIndicador
            titulo="Velocidade Média"
            meta={metas.mediaVelocidade}
            unidade=" km/h"
            dados={dadosVelocidadeValidos.map(d => ({ valor: d.velocidade }))}
            tipo="asc"
            formatarValor={(v) => v.toFixed(1)}
          />
        </section>

        {/* Charts Grid - Row 1 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Eficiência */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Eficiência Energética
            </h3>
            <GraficoEficiencia 
              dados={eficiencia_energetica.map(d => ({
                id: d.id,
                nome: d.nome,
                eficiencia: d.eficiencia,
                horasMotor: d.horasMotor,
                horasElevador: d.horasElevador
              }))}
              meta={metas.eficienciaEnergetica}
            />
          </div>

          {/* Motor Ocioso */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              Motor Ocioso
            </h3>
            <GraficoMotorOcioso 
              dados={motor_ocioso.map(d => ({
                id: d.id,
                nome: d.nome,
                percentual: d.percentual,
                tempoLigado: d.tempoLigado,
                tempoOcioso: d.tempoOcioso
              }))}
              meta={metas.motorOcioso}
            />
          </div>
        </section>

        {/* Charts Grid - Row 2 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manobras */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Manobras
            </h3>
            <GraficoManobras 
              dados={dadosManobras}
              meta={metas.manobras}
            />
          </div>

          {/* Velocidade Média */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Velocidade Média
            </h3>
            <GraficoMediaVelocidade 
              dados={media_velocidade.map(d => ({
                id: d.id,
                nome: d.nome,
                velocidade: d.velocidade
              }))}
              meta={metas.mediaVelocidade}
            />
          </div>
        </section>

        {/* Charts Grid - Row 3 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Disponibilidade Mecânica */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Disponibilidade Mecânica
            </h3>
            <GraficoDisponibilidadeMecanica 
              dados={disponibilidade_mecanica.map(d => ({
                id: d.id,
                nome: d.nome,
                disponibilidade: d.disponibilidade,
                horasMotor: d.horasMotor,
                tempoManutencao: d.tempoManutencao
              }))}
              meta={metas.disponibilidadeMecanica}
            />
          </div>

          {/* Basculamento */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              Basculamento
            </h3>
            <GraficoBasculamento 
              dados={dadosBasculamento}
              meta={metas.manobras}
            />
          </div>
        </section>

        {/* Charts Grid - Row 4 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Falta de Apontamento */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Falta de Apontamento
            </h3>
            <GraficoFaltaApontamento 
              dados={dadosFaltaApontamento}
              meta={metas.motorOcioso}
            />
          </div>

          {/* Top 5 Ofensores */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Top 5 Ofensores
            </h3>
            <GraficoTop5Ofensores dados={dadosOfensores} />
          </div>
        </section>

        {/* Intervalos de Operação */}
        {intervalos_operacao.length > 0 && (
          <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Intervalos de Operação
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {Object.entries(intervalosAgrupados).map(([equipamento, intervalos]) => (
                <GraficoIntervalos 
                  key={equipamento}
                  equipamento={equipamento}
                  intervalos={intervalos}
                />
              ))}
            </div>
          </section>
        )}

        {/* Dados Case - Trator Specific */}
        {dados_case && Object.keys(dados_case).length > 0 && (
          <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              Dados do Equipamento (Case)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900/60">
                  <tr>
                    <th className="text-left p-3 font-semibold text-zinc-400">Frota</th>
                    <th className="text-center p-3 font-semibold text-zinc-400">Horas Motor</th>
                    <th className="text-center p-3 font-semibold text-zinc-400">RPM</th>
                    <th className="text-center p-3 font-semibold text-zinc-400">Temp. Arrefecimento</th>
                    <th className="text-center p-3 font-semibold text-zinc-400">Temp. Transmissão</th>
                    <th className="text-center p-3 font-semibold text-zinc-400">Velocidade Média</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {Object.entries(dados_case).map(([frota, dados], index) => (
                    <tr key={frota} className={`hover:bg-zinc-800/40 ${index % 2 === 0 ? 'bg-zinc-900/20' : ''}`}>
                      <td className="p-3 font-medium text-zinc-200">{frota}</td>
                      <td className="p-3 text-center text-zinc-300">{dados.horasMotor?.toFixed(2) || '0.00'}</td>
                      <td className="p-3 text-center text-zinc-300">{dados.rpm?.toFixed(0) || '0'}</td>
                      <td className="p-3 text-center text-zinc-300">{dados.temperaturaArrefecimento?.toFixed(1) || '0.0'}°C</td>
                      <td className="p-3 text-center text-zinc-300">{dados.temperaturaTransmissao?.toFixed(1) || '0.0'}°C</td>
                      <td className="p-3 text-center text-zinc-300">{dados.velocidadeMedia?.toFixed(2) || '0.00'} km/h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tabela Resumo */}
        <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Tabela Resumo
          </h3>
          <TabelaResumo 
            dados={dadosResumo}
            metas={{
              eficienciaEnergetica: metas.eficienciaEnergetica,
              horaElevador: metas.horaElevador,
              mediaVelocidade: metas.mediaVelocidade,
              usoGPS: metas.usoGPS,
              manobras: metas.manobras,
              motorOcioso: metas.motorOcioso,
              disponibilidadeMecanica: metas.disponibilidadeMecanica
            }}
          />
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-800 pt-4 mt-8">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <span>Relatório de Trator Frotas - {formatDateForDisplay(params.data)}</span>
            <span>Fontes: {metadata.fontes?.join(', ') || 'N/A'}</span>
          </div>
        </footer>
      </div>
    </main>
  )
}
