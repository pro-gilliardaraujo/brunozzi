import React from "react"

interface MapaImagemProps {
  src: string
  alt: string
}

export function MapaImagem({ src, alt }: MapaImagemProps) {
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      {/* 
        Usamos object-contain para garantir que o mapa inteiro seja visível sem cortes.
        Se a imagem tiver a proporção correta, ela preencherá o espaço.
      */}
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-full object-contain" 
      />
    </div>
  )
}
