import React from 'react'

interface Ponto {
  equipamento: number
  hora: string
  lat: number
  lng: number
  status?: string
}

interface MapaAreaTrabalhadaProps {
  dados?: Ponto[]
  imagemBase64?: string
  tipo?: 'coordenadas' | 'imagem'
}

/**
 * MapaAreaTrabalhada Component
 * 
 * This component displays the worked area map for harvesters.
 * It can display either:
 * - A static image (base64) from the JSON data
 * - An interactive map with coordinates (requires react-leaflet and leaflet packages)
 * 
 * To enable interactive maps, install:
 * npm install react-leaflet leaflet
 * npm install -D @types/leaflet
 * 
 * Then uncomment the react-leaflet implementation.
 */
export function MapaAreaTrabalhada({ dados, imagemBase64, tipo = 'imagem' }: MapaAreaTrabalhadaProps) {
  // If we have a base64 image, display it
  if (tipo === 'imagem' && imagemBase64) {
    return (
      <div className="w-full h-full relative bg-slate-100 rounded-lg overflow-hidden">
        <img 
          src={imagemBase64} 
          alt="Mapa da Área Trabalhada" 
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  // If we have coordinates but no react-leaflet, show placeholder
  if (tipo === 'coordenadas' && dados && dados.length > 0) {
    return (
      <div className="w-full h-full relative bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-slate-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-sm text-slate-600 font-medium">Mapa de Coordenadas</p>
          <p className="text-xs text-slate-400 mt-1">
            {dados.length} pontos de {new Set(dados.map(d => d.equipamento)).size} equipamentos
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Instale react-leaflet para visualização interativa
          </p>
        </div>
      </div>
    )
  }

  // No data available
  return (
    <div className="w-full h-full relative bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
      <div className="text-center p-4">
        <div className="text-slate-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">Mapa não disponível</p>
      </div>
    </div>
  )
}

/**
 * To enable interactive Leaflet maps, replace the above component with:
 * 
 * 'use client'
 * 
 * import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
 * import 'leaflet/dist/leaflet.css'
 * import L from 'leaflet'
 * 
 * // Fix for Leaflet icons in Next.js
 * delete L.Icon.Default.prototype._getIconUrl
 * L.Icon.Default.mergeOptions({
 *   iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
 *   iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
 *   shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
 * })
 * 
 * // ... rest of the interactive map implementation
 */
