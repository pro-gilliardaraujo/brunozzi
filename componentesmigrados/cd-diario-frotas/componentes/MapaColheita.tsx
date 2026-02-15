
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import dadosRaw from '../../../../../../../__utilitarios/colhedorasFrente5_05102025_Coordenadas.json';

// Fix para ícones do Leaflet no Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

/* eslint-disable */
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});
/* eslint-enable */

interface Ponto {
  Equipamento: number;
  Hora: string;
  Latitude: number;
  Longitude: number;
  Velocidade: number;
  RTK: string;
}

interface MapaColheitaProps {
  tipo: 'equipamento' | 'rtk';
  dadosExternos?: any[];
}

const PALETA_CORES = [
  '#00FFFF', // Cyan
  '#FF00FF', // Magenta
  '#FFFF00', // Yellow
  '#FF4500', // OrangeRed
  '#32CD32', // LimeGreen
  '#1E90FF', // DodgerBlue
  '#FF1493', // DeepPink
  '#ADFF2F', // GreenYellow
  '#FF69B4', // HotPink
  '#9400D3', // DarkViolet
  '#00FA9A', // MediumSpringGreen
  '#FFD700', // Gold
];

const CORES_RTK: Record<string, string> = {
  'Sim': 'green',
  'Não': 'red'
};

function AutoZoom({ segments }: { segments: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (segments.length > 0) {
      const bounds = L.latLngBounds([]);
      segments.forEach(seg => {
        seg.positions.forEach((pos: [number, number]) => {
          bounds.extend(pos);
        });
      });
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [5, 5] });
      }
    }
  }, [segments, map]);

  return null;
}

export default function MapaColheita({ tipo, dadosExternos }: MapaColheitaProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [segments, setSegments] = useState<any[]>([]);
  const [center, setCenter] = useState<[number, number]>([-19.086, -49.776]);
  const [legendasEquipamento, setLegendasEquipamento] = useState<{ id: number; color: string }[]>([]);

  useEffect(() => {
    setIsMounted(true);
    
    // Processar dados
    let dados: Ponto[] = [];
    
    if (dadosExternos && dadosExternos.length > 0) {
      // Adaptar formato do Worker para o formato interno Ponto
      dados = dadosExternos.map(d => ({
        Equipamento: d.equipamento,
        Hora: d.hora,
        Latitude: d.lat,
        Longitude: d.lng,
        Velocidade: 0,
        RTK: d.status === 'Ligado' ? 'Sim' : 'Não'
      }));
    } else {
      dados = dadosRaw as Ponto[];
    }
    
    // Calcular centro do mapa (média das coordenadas)
    if (dados.length > 0) {
      const lat = dados.reduce((acc, curr) => acc + curr.Latitude, 0) / dados.length;
      const lng = dados.reduce((acc, curr) => acc + curr.Longitude, 0) / dados.length;
      setCenter([lat, lng]);
    }

    const processedSegments: any[] = [];

    // Agrupar por equipamento
    const equipamentos = Array.from(new Set(dados.map(d => d.Equipamento))).sort();
    
    // Gerar mapa de cores para equipamentos
    const coresEquipamentos: Record<number, string> = {};
    equipamentos.forEach((eq, index) => {
      coresEquipamentos[eq] = PALETA_CORES[index % PALETA_CORES.length];
    });
    setLegendasEquipamento(equipamentos.map(eq => ({ id: eq, color: coresEquipamentos[eq] })));

    equipamentos.forEach(eq => {
      const pontosEq = dados.filter(d => d.Equipamento === eq);
      // Ordenar por horário se necessário (assumindo que já está ordenado ou formato HH:MM:SS permite sort simples string)
      pontosEq.sort((a, b) => a.Hora.localeCompare(b.Hora));

      if (tipo === 'equipamento') {
        // Um único segmento por equipamento
        processedSegments.push({
          positions: pontosEq.map(p => [p.Latitude, p.Longitude]),
          color: coresEquipamentos[eq],
          label: `Frota ${eq}`
        });
      } else {
        // Segmentar por RTK
        let currentSegment: [number, number][] = [];
        let currentStatus = pontosEq[0]?.RTK;

        pontosEq.forEach((p, index) => {
          const pos: [number, number] = [p.Latitude, p.Longitude];
          
          if (p.RTK !== currentStatus) {
            // Fecha segmento anterior (incluindo o ponto atual para continuidade)
            currentSegment.push(pos);
            processedSegments.push({
              positions: currentSegment,
              color: CORES_RTK[currentStatus] || 'gray',
              label: `RTK: ${currentStatus}`
            });
            
            // Inicia novo segmento (começando do ponto atual)
            currentSegment = [pos];
            currentStatus = p.RTK;
          } else {
            currentSegment.push(pos);
          }
        });

        // Adicionar último segmento
        if (currentSegment.length > 0) {
          processedSegments.push({
            positions: currentSegment,
            color: CORES_RTK[currentStatus] || 'gray',
            label: `RTK: ${currentStatus}`
          });
        }
      }
    });

    setSegments(processedSegments);
  }, [tipo]);

  if (!isMounted) return <div className="w-full h-full flex items-center justify-center">Carregando mapa...</div>;

  return (
    <div className="w-full h-full relative">
      <style>{`
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
      <MapContainer 
        center={center} 
        zoom={15} 
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <AutoZoom segments={segments} />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution=''
        />
        
        {segments.map((seg, i) => (
          <Polyline 
            key={i} 
            positions={seg.positions} 
            pathOptions={{ color: seg.color, weight: 1.5 }} 
          />
        ))}

      </MapContainer>

      {/* Legenda */}
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow-lg z-[1000] text-sm">
        <h4 className="font-bold mb-1 text-center">{tipo === 'equipamento' ? 'Frotas' : 'Uso do Piloto RTK'}</h4>
        <div className="flex flex-col gap-1">
          {tipo === 'equipamento' ? (
            legendasEquipamento.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span>{item.id}</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-600"></div>
                <span>Ligado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
                <span>Desligado</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
