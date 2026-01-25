import React from "react"
import { DADOS_MOCK } from "../componentes_migrados/relatorios/cd-diario-frotas/dados"
import { CabecalhoMeta } from "../componentes_migrados/relatorios/cd-diario-frotas/componentes/CabecalhoMeta"
import { CabecalhoProducao } from "../componentes_migrados/relatorios/cd-diario-frotas/componentes/CabecalhoProducao"
import { GraficoEficiencia } from "../componentes_migrados/relatorios/cd-diario-frotas/componentes/GraficoEficiencia"

const LOGO_URL = "assets/logo.png"
export function RelatorioColhedorasA4() {
  const { metas, metadata, producao, ofensores } = DADOS_MOCK as any

  const titulo = "Relatório Diário de Colheita - Colhedoras"
  const dataBr =
    metadata?.date
      ? new Date(metadata.date).toLocaleDateString("pt-BR")
      : ""

  const producaoTotal = Number(producao ?? 0)
  const frotaCount = Array.isArray(ofensores) && ofensores.length > 0 ? ofensores.length : 1
  const mediaPorEquipamento = frotaCount > 0 ? producaoTotal / frotaCount : 0
  const tphDia = producaoTotal > 0 ? producaoTotal / 24 : 0

  const eficienciaDados = (ofensores || []).map((item: any, idx: number) => ({
    id: idx,
    nome: String(idx + 1),
    eficiencia: 100 - (Number(item.porcentagem) || 0),
    horasMotor: Number(item.tempo) || 0,
    horasElevador: Number(item.tempo) || 0
  }))

  return (
    <div
      style={{
        width: "210mm",
        height: "297mm",
        margin: "16px auto",
        background: "#ffffff",
        boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #0f172a"
      }}
    >
      <div style={{ padding: "8px 16px 4px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src={LOGO_URL} alt="Brunozzi" style={{ height: 40, objectFit: "contain" }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}>{titulo}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>{dataBr}</div>
        </div>
        <img src={LOGO_URL} alt="Brunozzi" style={{ height: 40, objectFit: "contain" }} />
      </div>

      <div style={{ padding: "4px 12px 8px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
        <CabecalhoMeta
          meta={Number(metas?.eficienciaEnergetica ?? 0)}
          media={Number(metas?.eficienciaEnergetica ?? 0)}
          tipo="porcentagem"
        />

        <CabecalhoProducao
          producaoTotal={producaoTotal}
          mediaPorEquipamento={mediaPorEquipamento}
          tphDia={tphDia}
        />

        <div style={{ flex: 1, border: "1px solid #0f172a", borderRadius: 4, padding: 8, display: "flex", flexDirection: "column" }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            Eficiência por Frota (ilustrativo com dados de ofensores)
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <GraficoEficiencia
              dados={eficienciaDados}
              meta={Number(metas?.eficienciaEnergetica ?? 0)}
              compact
              listrado
            />
          </div>
        </div>
      </div>
    </div>
  )
}
