import React, { useMemo } from 'react';

export type TipoIntervalo = 'Produtivo' | 'Disponível' | 'Manutenção' | 'Falta de Informação';

export type Intervalo = {
  tipo: TipoIntervalo;
  inicio: string;
  duracaoHoras: number;
};

type Props = {
  equipamento: string;
  intervalos: Intervalo[];
  width?: number | string;
  height?: number;
};

const COLORS: Record<TipoIntervalo, string> = {
  'Produtivo': '#4ade80',
  'Disponível': '#60a5fa',
  'Manutenção': '#f87171',
  'Falta de Informação': '#ffffff',
};

const LANE_HEIGHT = 60;
const BAR_HEIGHT = 40;
const HEADER_HEIGHT = 40;
const TOTAL_WIDTH_MIN = 1440;

const Y_POS: Record<TipoIntervalo, number> = {
  'Produtivo': HEADER_HEIGHT + (LANE_HEIGHT - BAR_HEIGHT) / 2,
  'Disponível': HEADER_HEIGHT + LANE_HEIGHT + (LANE_HEIGHT - BAR_HEIGHT) / 2,
  'Manutenção': HEADER_HEIGHT + LANE_HEIGHT * 2 + (LANE_HEIGHT - BAR_HEIGHT) / 2,
  'Falta de Informação': HEADER_HEIGHT + LANE_HEIGHT * 3 + (LANE_HEIGHT - BAR_HEIGHT) / 2,
};

export function GraficoIntervalos({
  equipamento,
  intervalos,
  width = "100%",
  height = 250,
}: Props) {
  const dados = useMemo(() => {
    function toMin(h: string) {
      if (!h) return 0;
      const parts = h.split(':').map(Number);
      const H = parts[0] || 0;
      const M = parts[1] || 0;
      const S = parts[2] || 0;
      return H * 60 + M + S / 60;
    }

    function formatTime(min: number) {
      let h = Math.floor(min / 60);
      const m = Math.floor(min % 60);
      if (h >= 24) h = h - 24;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return intervalos.map((it, idx) => {
      const startMin = toMin(it.inicio);
      const duracaoMin = it.duracaoHoras * 60;
      const endMin = startMin + duracaoMin;
      const widthMin = Math.max(duracaoMin, 1);

      return {
        id: idx,
        x: startMin,
        w: widthMin,
        y: Y_POS[it.tipo] || 0,
        c: COLORS[it.tipo] || '#ccc',
        t: it.tipo,
        duracao: it.duracaoHoras,
        startLabel: formatTime(startMin),
        endLabel: formatTime(endMin),
        showLabel: duracaoMin > 30 || (it.tipo === 'Manutenção' && duracaoMin > 10),
      };
    }).filter(d => d.y > 0);
  }, [intervalos]);

  const ticksHora = Array.from({ length: 25 }, (_, i) => i);
  const viewBoxHeight = HEADER_HEIGHT + LANE_HEIGHT * 3 + 10;

  return (
    <div className="w-full flex flex-col mb-2 page-break-inside-avoid">
      <div className="flex items-center justify-between mb-1 px-0">
        <h3 className="text-sm font-bold text-slate-800">{equipamento}</h3>
        <div className="flex gap-4 text-[10px]">
          {(['Produtivo', 'Disponível', 'Manutenção', 'Falta de Informação'] as TipoIntervalo[]).map((t) => (
            <div key={t} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 border border-black/20 rounded-sm" 
                style={{ backgroundColor: COLORS[t] }}
              />
              <span className="font-medium">{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full border border-slate-300 bg-white rounded-md overflow-hidden relative">
        <svg 
          width={width} 
          height={height} 
          viewBox={`0 0 ${TOTAL_WIDTH_MIN} ${viewBoxHeight}`} 
          preserveAspectRatio="none"
          className="w-full h-full block"
        >
          <rect x="0" y={HEADER_HEIGHT} width={TOTAL_WIDTH_MIN} height={LANE_HEIGHT} fill="#f0fdf4" opacity="0.3" />
          <rect x="0" y={HEADER_HEIGHT + LANE_HEIGHT} width={TOTAL_WIDTH_MIN} height={LANE_HEIGHT} fill="#eff6ff" opacity="0.3" />
          <rect x="0" y={HEADER_HEIGHT + LANE_HEIGHT * 2} width={TOTAL_WIDTH_MIN} height={LANE_HEIGHT} fill="#fef2f2" opacity="0.3" />

          {ticksHora.map((h) => {
            const x = h * 60;
            return (
              <g key={`grid-${h}`}>
                <line 
                  x1={x} 
                  y1={HEADER_HEIGHT} 
                  x2={x} 
                  y2={viewBoxHeight} 
                  stroke="#cbd5e1" 
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text 
                  x={x} 
                  y={HEADER_HEIGHT - 10} 
                  fontSize={20}
                  textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'} 
                  fill="#64748b"
                  fontWeight="bold"
                >
                  {h}
                </text>
              </g>
            );
          })}

          {dados.map((d) => (
            <g key={`bar-${d.id}`}>
              <rect
                x={d.x}
                y={d.y}
                width={d.w}
                height={BAR_HEIGHT}
                fill={d.c}
                stroke="white"
                strokeWidth={0.5}
              />
              
              {d.showLabel && (
                <g>
                  <text
                    x={d.x + d.w / 2}
                    y={d.y + BAR_HEIGHT / 2}
                    fontSize={16}
                    alignmentBaseline="middle"
                    textAnchor="middle"
                    fill="black"
                    className="pointer-events-none font-bold"
                  >
                    {d.duracao.toFixed(1)}h
                  </text>
                  {d.t === 'Manutenção' && (
                    <text
                      x={d.x + d.w / 2}
                      y={d.y + BAR_HEIGHT + 14}
                      fontSize={12}
                      textAnchor="middle"
                      fill="#000"
                    >
                      {d.startLabel} - {d.endLabel}
                    </text>
                  )}
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
