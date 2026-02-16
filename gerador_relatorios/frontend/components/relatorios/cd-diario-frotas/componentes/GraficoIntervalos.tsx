import React, { useMemo } from 'react';

// Tipos de intervalos possíveis no gráfico
export type TipoIntervalo = 'Produtivo' | 'Disponível' | 'Manutenção' | 'Falta de Informação';

// Estrutura de um intervalo individual
export type Intervalo = {
  tipo: TipoIntervalo;
  inicio: string;          // Formato 'HH:MM:SS'
  duracaoHoras: number;    // Duração em horas decimais
};

// Props do componente
type Props = {
  equipamento: string;
  intervalos: Intervalo[];
  width?: number | string; // Largura do gráfico (px ou %)
  height?: number;         // Altura do gráfico (px)
};

// Mapeamento de cores para cada tipo de intervalo
// Usando cores suaves mas distintas para fácil identificação
const COLORS: Record<TipoIntervalo, string> = {
  'Produtivo': '#4ade80', // Verde (green-400)
  'Disponível': '#60a5fa', // Azul (blue-400)
  'Manutenção': '#f87171', // Vermelho (red-400)
  'Falta de Informação': '#ffffff', // branco 
};

// Configuração de Layout e Dimensões
// Ajuste estas constantes para mudar a aparência geral do gráfico
const LANE_HEIGHT = 60;      // Altura de cada raia (swimlane)
const BAR_HEIGHT = 40;       // Altura da barra de dados
const HEADER_HEIGHT = 40;    // Altura do cabeçalho com as horas
const TOTAL_WIDTH_MIN = 1440; // Largura total em minutos (24h * 60min)

// Posição Y fixa para cada tipo de intervalo (swimlanes)
const Y_POS: Record<TipoIntervalo, number> = {
  'Produtivo': HEADER_HEIGHT + (LANE_HEIGHT - BAR_HEIGHT) / 2,
  'Disponível': HEADER_HEIGHT + LANE_HEIGHT + (LANE_HEIGHT - BAR_HEIGHT) / 2,
  'Manutenção': HEADER_HEIGHT + LANE_HEIGHT * 2 + (LANE_HEIGHT - BAR_HEIGHT) / 2,
  'Falta de Informação': HEADER_HEIGHT + LANE_HEIGHT * 3 + (LANE_HEIGHT - BAR_HEIGHT) / 2,
};

/**
 * Componente GraficoIntervalos
 * Renderiza um gráfico de Gantt para visualizar os intervalos operacionais de um equipamento ao longo de 24h.
 */
export function GraficoIntervalos({
  equipamento,
  intervalos,
  width = "100%",
  height = 250, // Altura reduzida para otimizar espaço vertical
}: Props) {
  
  // Processamento dos dados para renderização
  // Transforma os intervalos brutos em coordenadas SVG (x, y, width)
  const dados = useMemo(() => {
    // Converte string de hora 'HH:MM:SS' para minutos totais do dia
    function toMin(h: string) {
      if (!h) return 0;
      const parts = h.split(':').map(Number);
      const H = parts[0] || 0;
      const M = parts[1] || 0;
      const S = parts[2] || 0;
      return H * 60 + M + S / 60;
    }

    // Formata minutos em 'HH:MM'
    function formatTime(min: number) {
      let h = Math.floor(min / 60);
      const m = Math.floor(min % 60);
      if (h >= 24) h = h - 24; // Ajuste para labels que passem da meia-noite
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    // Mapeia e filtra intervalos válidos
    return intervalos.map((it, idx) => {
      const startMin = toMin(it.inicio);
      const duracaoMin = it.duracaoHoras * 60;
      const endMin = startMin + duracaoMin;
      
      // Garante uma largura mínima de 1px (1 minuto) para visibilidade de eventos muito curtos
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
        // Lógica condicional para exibição de labels:
        // - Intervalos > 30min mostram duração
        // - Manutenções > 10min mostram duração também
        showLabel: duracaoMin > 30 || (it.tipo === 'Manutenção' && duracaoMin > 10),
      };
    }).filter(d => d.y > 0); // Remove tipos que não têm posição definida (ex: tipos desconhecidos)
  }, [intervalos]);

  // Gera array de 0 a 24 para as linhas de grade das horas
  const ticksHora = Array.from({ length: 25 }, (_, i) => i);
  
  // Define a altura total da área de desenho do SVG (ViewBox)
  // Inclui cabeçalho + 3 raias principais + padding inferior
  const viewBoxHeight = HEADER_HEIGHT + LANE_HEIGHT * 3 + 10; 

  return (
    // Container principal do gráfico
    // mb-2: Margem inferior reduzida para diminuir scroll vertical
    // page-break-inside-avoid: Evita quebra de página na impressão
    <div className="w-full flex flex-col mb-2 page-break-inside-avoid">
      
      {/* Cabeçalho do Gráfico: Nome do Equipamento e Legenda */}
      <div className="flex items-center justify-between mb-1 px-0">
        {/* Título da Frota - Fonte reduzida para text-sm para economizar espaço */}
        <h3 className="text-sm font-bold text-slate-800">{equipamento}</h3>
        
        {/* Legenda de cores */}
        <div className="flex gap-4 text-[10px]"> {/* Fonte da legenda reduzida */}
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

      {/* Área do Gráfico SVG */}
      {/* border-slate-300: Borda suave ao redor do gráfico */}
      <div className="w-full border border-slate-300 bg-white rounded-md overflow-hidden relative">
        <svg 
          width={width} 
          height={height} 
          viewBox={`0 0 ${TOTAL_WIDTH_MIN} ${viewBoxHeight}`} 
          preserveAspectRatio="none" // Permite que o SVG estique para preencher a largura
          className="w-full h-full block"
        >
          {/* --- Fundo das Raias (Swimlanes) --- */}
          {/* Cada retângulo cria o fundo colorido suave para uma categoria */}
          <rect x="0" y={HEADER_HEIGHT} width={TOTAL_WIDTH_MIN} height={LANE_HEIGHT} fill="#f0fdf4" opacity="0.3" /> {/* Produtivo */}
          <rect x="0" y={HEADER_HEIGHT + LANE_HEIGHT} width={TOTAL_WIDTH_MIN} height={LANE_HEIGHT} fill="#eff6ff" opacity="0.3" /> {/* Disponível */}
          <rect x="0" y={HEADER_HEIGHT + LANE_HEIGHT * 2} width={TOTAL_WIDTH_MIN} height={LANE_HEIGHT} fill="#fef2f2" opacity="0.3" /> {/* Manutenção */}

          {/* --- Grade de Horas (Grid) --- */}
          {ticksHora.map((h) => {
            const x = h * 60; // Posição X em minutos
            return (
              <g key={`grid-${h}`}>
                {/* Linha Vertical Tracejada */}
                <line 
                  x1={x} 
                  y1={HEADER_HEIGHT} 
                  x2={x} 
                  y2={viewBoxHeight} 
                  stroke="#cbd5e1" 
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                {/* Texto da Hora (0, 1, ..., 24) */}
                <text 
                  x={x} 
                  y={HEADER_HEIGHT - 10} 
                  fontSize={20} // Reduzido para evitar sobreposição e corte
                  // Ajusta âncora nas extremidades (0 e 24) para evitar corte lateral
                  textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'} 
                  fill="#64748b"
                  fontWeight="bold"
                >
                  {h} {/* Mostra hora sem zero à esquerda para economizar espaço */}
                </text>
              </g>
            );
          })}

          {/* --- Renderização das Barras de Intervalos --- */}
          {dados.map((d) => (
            <g key={`bar-${d.id}`}>
              {/* Barra Colorida */}
              <rect
                x={d.x}
                y={d.y}
                width={d.w}
                height={BAR_HEIGHT}
                fill={d.c}
                stroke="white"
                strokeWidth={0.5} // Pequena borda branca para separar intervalos adjacentes
              />
              
              {/* Labels de Texto (condicional) */}
              {d.showLabel && (
                <g>
                  {/* Duração em Horas (centro da barra) */}
                  <text
                    x={d.x + d.w / 2}
                    y={d.y + BAR_HEIGHT / 2}
                    fontSize={16} // Tamanho legível na escala de 1440
                    alignmentBaseline="middle"
                    textAnchor="middle"
                    fill="black"
                    className="pointer-events-none font-bold"
                  >
                    {d.duracao.toFixed(1)}h
                  </text>
                  
                  {/* Para Manutenção: Mostra hora início/fim abaixo da barra */}
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
