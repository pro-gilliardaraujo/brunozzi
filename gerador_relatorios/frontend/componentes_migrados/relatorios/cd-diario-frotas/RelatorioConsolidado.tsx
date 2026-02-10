"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { generateRelatorioPdfFromUrl } from "@/config/pdf-server";
import { downloadPdfBuffer } from "@/lib/pdf-utils";

// Componentes Solinftec (reutilizados)
import { CabecalhoMeta } from "./componentes/CabecalhoMeta";
import { GraficoEficiencia } from "./componentes/GraficoEficiencia";
import { GraficoEficienciaOperacional } from "./componentes/GraficoEficienciaOperacional";
import { GraficoHorasElevador } from "./componentes/GraficoHorasElevador";
import { GraficoUsoGPS } from "./componentes/GraficoUsoGPS";
import { GraficoMediaVelocidade } from "./componentes/GraficoMediaVelocidade";
import { GraficoManobras } from "./componentes/GraficoManobras";
import { TabelaLavagem } from "./componentes/TabelaLavagem";
import { TabelaRoletes } from "./componentes/TabelaRoletes";
import { GraficoMotorOcioso } from "./componentes/GraficoMotorOcioso";
import { GraficoTop5Ofensores } from "./componentes/GraficoTop5Ofensores";
import { GraficoDisponibilidadeMecanica } from "./componentes/GraficoDisponibilidadeMecanica";
import { GraficoIntervalos, Intervalo } from "./componentes/GraficoIntervalos";
import { CardProducao } from "./componentes/CardProducao";

const LOGO_URL = "/logo.png";

// ─── Componentes Auxiliares (cópia exata do original) ───

function Header({ tituloCompleto, date }: { tituloCompleto: string; date: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 mb-2">
      <img src={LOGO_URL} alt="Logo" className="h-12 object-contain" />
      <div className="text-center">
        <div className="text-lg font-bold text-black">{tituloCompleto}</div>
        <div className="text-sm font-medium text-gray-700 mt-1">{date}</div>
      </div>
      <img src={LOGO_URL} alt="Logo" className="h-12 object-contain" />
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="text-center text-base font-bold text-black mb-2">
      {title}
    </div>
  );
}

function PageOriginal({ children, titulo, date }: { children: React.ReactNode; titulo: string; date: string }) {
  return (
    <div 
      data-pdf-page 
      className="bg-white shadow-lg mx-auto mb-8 relative print:shadow-none print:mb-0 print:break-after-page"
      style={{ width: "210mm", height: "297mm" }}
    >
       <div 
         className="flex flex-col border border-black m-2 p-2 rounded-sm"
         style={{ height: "calc(297mm - 16px)" }}
       >
          <Header tituloCompleto={titulo} date={date} />
          {children}
       </div>
    </div>
  );
}

// ─── Tabela Case IH ───
function TabelaCase({ data }: { data: any }) {
    // ... (mesmo código anterior)
  if (!data || !data.dados_por_frota) return null;
  const frotas = Object.keys(data.dados_por_frota).sort();
  if (frotas.length === 0) return null;
  return (
    <div className="flex-1 overflow-hidden">
        <SectionTitle title="Case IH (Conectividade)" />
        <div className="border border-black rounded-lg overflow-hidden">
            <table className="w-full text-xs">
            <thead>
                <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                <th className="px-3 py-2 text-left">Frota</th>
                <th className="px-3 py-2 text-right">Velocidade Média (km/h)</th>
                <th className="px-3 py-2 text-right">RPM Médio</th>
                <th className="px-3 py-2 text-right">Temp. Transmissão (°C)</th>
                <th className="px-3 py-2 text-right">Temp. Arrefecimento (°C)</th>
                <th className="px-3 py-2 text-right">Horas Motor</th>
                </tr>
            </thead>
            <tbody>
                {frotas.map((frota) => {
                const d = data.dados_por_frota[frota];
                return (
                    <tr key={frota} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{frota}</td>
                    <td className="px-3 py-2 text-right">{d.velocidadeMedia?.toFixed(1) ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{d.rpm?.toFixed(0) ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{d.temperaturaTransmissao?.toFixed(1) ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{d.temperaturaArrefecimento?.toFixed(1) ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{d.horasMotor?.toFixed(1) ?? "-"}</td>
                    </tr>
                );
                })}
            </tbody>
            </table>
        </div>
    </div>
  );
}

// ─── Tabela OPC ───
function TabelaOPC({ data }: { data: any }) {
    // ... (mesmo código anterior)
    if (!data || !data.tipos) return null;
    return (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden mt-4">
             <SectionTitle title="OPC (Operações)" />
            {Object.keys(data.tipos).map((tipo) => {
                const tipoData = data.tipos[tipo];
                const frotas = tipoData.frotas || [];
                const dados = tipoData.dados_por_frota || {};
                if (frotas.length === 0) return null;
                return (
                    <div key={tipo} className="w-full">
                        <div className="text-xs font-bold text-gray-600 mb-1 uppercase text-center">{tipo}</div>
                        <div className="border border-black rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                                        <th className="px-3 py-2 text-left">Frota</th>
                                        <th className="px-3 py-2 text-right">H. Prod.</th>
                                        <th className="px-3 py-2 text-right">H. Motor</th>
                                        <th className="px-3 py-2 text-right">Ef. Oper. (%)</th>
                                        <th className="px-3 py-2 text-right">Ef. Energ. (%)</th>
                                        <th className="px-3 py-2 text-right">Manobras</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {frotas.map((frota: string) => {
                                        const d = dados[frota];
                                        return (
                                            <tr key={frota} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-3 py-2 font-medium">{frota}</td>
                                                <td className="px-3 py-2 text-right">{d.horas_produtivas?.toFixed(1) ?? "-"}</td>
                                                <td className="px-3 py-2 text-right">{d.horas_motor_ligado?.toFixed(1) ?? "-"}</td>
                                                <td className="px-3 py-2 text-right">{d.eficiencia_operacional?.toFixed(1) ?? "-"}</td>
                                                <td className="px-3 py-2 text-right">{d.eficiencia_energetica?.toFixed(1) ?? "-"}</td>
                                                <td className="px-3 py-2 text-right">{d.manobras_qtd ?? "-"}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function RelatorioConsolidado({ period, data }: { period: "diario" | "semanal"; data: any }) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const metadata = data.metadata || {};
  const metas = data.metas || {};
  const solinftec = data.solinftec;
  const caseData = data.case;
  const opcData = data.opc;
  const dateStr = metadata.date ? new Date(metadata.date + "T12:00:00").toLocaleDateString("pt-BR") : "";
  const titulo = `Relatório Integrado de Frotas - ${dateStr}`;

  // Agrupar intervalos e paginar (4 por página, igual original)
  const intervalosAgrupados = React.useMemo(() => {
    if (!solinftec || !solinftec.intervalos_operacao) return [];
    const grouped: Record<string, Intervalo[]> = {};
    (solinftec.intervalos_operacao as any[]).forEach((item) => {
      if (!grouped[item.equipamento]) grouped[item.equipamento] = [];
      grouped[item.equipamento].push(item);
    });
    return Object.entries(grouped)
      .map(([equipamento, intervalos]) => ({ equipamento, intervalos }))
      .sort((a, b) => a.equipamento.localeCompare(b.equipamento));
  }, [solinftec]);
  
  const INTERVALOS_PER_PAGE = 4;
  const intervaloPages = [];
  for (let i = 0; i < intervalosAgrupados.length; i += INTERVALOS_PER_PAGE) {
    intervaloPages.push(intervalosAgrupados.slice(i, i + INTERVALOS_PER_PAGE));
  }

  const handleDownloadPdf = async () => {
    try {
      setIsGenerating(true);
      const filename = `Relatorio_Consolidado_${dateStr.replace(/\//g, "-")}.pdf`;
      const pdfBuffer = await generateRelatorioPdfFromUrl(window.location.href, filename, { cookieHeader: document.cookie, localStorage: {} });
      downloadPdfBuffer(pdfBuffer, filename);
      toast({ title: "PDF Gerado", description: "Download iniciado." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Falha ao gerar PDF." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center bg-gray-100 min-h-screen py-8 overflow-auto print:bg-white print:p-0">

      {/* ─── SOLINFTEC ─── */}
      {solinftec && (
        <>
            {/* PÁGINA 1: Capa (Metas, Produção, Eficiência) */}
            <PageOriginal titulo={titulo} date={dateStr}>
                <div className="flex-1 flex flex-col gap-2">
                    <CabecalhoMeta metas={{
                        eficiencia: solinftec.eficiencia_operacional,
                        disponibilidade: solinftec.disponibilidade_mecanica,
                        usoGPS: solinftec.uso_gps,
                        manobras: solinftec.manobras_frotas
                    }} metasConfig={metas} />
                    
                    {solinftec.producao && (
                        <CardProducao 
                            valorTotal={solinftec.producao} 
                            totalFrotas={solinftec.frotas?.length || 0}
                        />
                    )}

                    <div className="flex-1 border border-black rounded-lg p-3 overflow-hidden flex flex-col">
                        <SectionTitle title="Eficiência Energética" />
                        <GraficoEficiencia dados={solinftec.eficiencia_energetica} meta={metas.eficienciaEnergetica} compact={true} />
                    </div>
                </div>
            </PageOriginal>

             {/* PÁGINA 2: Eficiência Operacional (Página Inteira) */}
             <PageOriginal titulo={titulo} date={dateStr}>
                <div className="flex-1 border border-black rounded-lg p-3 overflow-hidden flex flex-col">
                    <SectionTitle title="Eficiência Operacional" />
                    <GraficoEficienciaOperacional dados={solinftec.eficiencia_operacional} meta={metas.eficienciaOperacional} compact={true} />
                </div>
            </PageOriginal>

            {/* PÁGINA 3: Disponibilidade Mecânica (Página Inteira - COMPACT) */}
            <PageOriginal titulo={titulo} date={dateStr}>
                <div className="flex-1 border border-black rounded-lg p-3 overflow-hidden flex flex-col">
                    <SectionTitle title="Disponibilidade Mecânica" />
                    <GraficoDisponibilidadeMecanica 
                        dados={solinftec.disponibilidade_mecanica} 
                        meta={metas.disponibilidadeMecanica} 
                        compact={true}
                    />
                </div>
            </PageOriginal>

            {/* PÁGINA 4: Motor Ocioso (Página Inteira - COMPACT) */}
            <PageOriginal titulo={titulo} date={dateStr}>
                <div className="flex-1 border border-black rounded-lg p-3 overflow-hidden flex flex-col">
                    <SectionTitle title="Motor Ocioso" />
                    <GraficoMotorOcioso 
                        dados={solinftec.motor_ocioso} 
                        meta={metas.motorOcioso} 
                        compact={true}
                    />
                </div>
            </PageOriginal>

             {/* PÁGINA 5: Manobras (Página Inteira - COMPACT) */}
            <PageOriginal titulo={titulo} date={dateStr}>
                <div className="flex-1 border border-black rounded-lg p-3 overflow-hidden flex flex-col">
                    <SectionTitle title="Manobras" />
                    <GraficoManobras 
                        dados={solinftec.manobras_frotas} 
                        meta={metas.manobras} 
                        compact={true}
                    />
                </div>
            </PageOriginal>

            {/* PÁGINA 6: Top 5 Ofensores & Horas Elevador */}
            <PageOriginal titulo={titulo} date={dateStr}>
                 <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                     <div className="h-1/2 border border-black rounded-lg p-3 flex flex-col">
                         <SectionTitle title="Top 5 Ofensores" />
                         <GraficoTop5Ofensores dados={solinftec.ofensores} />
                     </div>
                     <div className="h-1/2 border border-black rounded-lg p-3 flex flex-col">
                         <SectionTitle title="Horas de Elevador" />
                         <GraficoHorasElevador dados={solinftec.horas_elevador} meta={metas.horaElevador} />
                     </div>
                 </div>
            </PageOriginal>

             {/* PÁGINA 7: Uso GPS & Velocidade */}
            <PageOriginal titulo={titulo} date={dateStr}>
                 <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                     <div className="h-1/2 border border-black rounded-lg p-3 flex flex-col">
                         <SectionTitle title="Uso de GPS" />
                         <GraficoUsoGPS dados={solinftec.uso_gps} meta={metas.usoGPS} />
                     </div>
                     <div className="h-1/2 border border-black rounded-lg p-3 flex flex-col">
                         <SectionTitle title="Média Velocidade" />
                         <GraficoMediaVelocidade dados={solinftec.media_velocidade} meta={metas.mediaVelocidade} />
                     </div>
                 </div>
            </PageOriginal>
            
            {/* PÁGINA 8: Tabelas (se houver) */}
             {(solinftec.lavagem?.length > 0 || solinftec.roletes?.length > 0) && (
              <PageOriginal titulo={titulo} date={dateStr}>
                 <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                    {solinftec.lavagem?.length > 0 && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                             <SectionTitle title="Lavagem" />
                             <TabelaLavagem dados={solinftec.lavagem} />
                        </div>
                    )}
                    {solinftec.roletes?.length > 0 && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                             <SectionTitle title="Aferição de Roletes" />
                             <TabelaRoletes dados={solinftec.roletes} />
                        </div>
                    )}
                 </div>
              </PageOriginal>
             )}

            {/* PÁGINAS INTERVALOS */}
            {intervaloPages.map((pageGroup, i) => (
                <PageOriginal key={`intervalos-${i}`} titulo={titulo} date={dateStr}>
                    <SectionTitle title={`Intervalos Operacionais (${i + 1}/${intervaloPages.length})`} />
                    <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                        {pageGroup.map((grupo) => (
                            <div key={grupo.equipamento} className="border border-gray-300 rounded p-1">
                                <GraficoIntervalos 
                                    equipamento={grupo.equipamento}
                                    intervalos={grupo.intervalos}
                                    height={180}
                                />
                            </div>
                        ))}
                    </div>
                </PageOriginal>
            ))}
        </>
      )}

      {/* ─── CASE / OPC ─── */}
      {(caseData || opcData) && (
          <PageOriginal titulo={titulo} date={dateStr}>
              <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                  <SectionTitle title="Fontes Auxiliares" />
                  {caseData && <TabelaCase data={caseData} />}
                  {opcData && <TabelaOPC data={opcData} />}
              </div>
          </PageOriginal>
      )}

      {/* Botão Flutuante PDF */}
      <div className="fixed bottom-6 right-6 z-50 print:hidden">
        <Button 
            onClick={handleDownloadPdf} 
            disabled={isGenerating}
            className="shadow-xl bg-blue-600 hover:bg-blue-700 text-white rounded-full h-14 w-14 p-0 flex items-center justify-center transition-all hover:scale-110"
        >
             <Download className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
