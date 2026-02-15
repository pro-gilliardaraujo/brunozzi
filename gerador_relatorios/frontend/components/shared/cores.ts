export type Paleta = {
  verde: string
  verdeClaro: string
  laranja: string
  vermelho: string
  neutro: string
}

export const PALETA_PADRAO: Paleta = {
  verde: "#48BB78",
  verdeClaro: "#9ACD32",
  laranja: "#FF8C00",
  vermelho: "#E53E3E",
  neutro: "#000000",
}

/**
 * Returns a color based on value vs meta comparison
 * @param valor - The actual value
 * @param meta - The target/meta value
 * @param inverso - If true, lower values are better (e.g., motor ocioso)
 * @param paleta - Color palette to use
 */
export function corPorMeta(valor: number, meta: number, inverso = false, paleta: Paleta = PALETA_PADRAO) {
  if (typeof valor !== "number" || typeof meta !== "number" || meta === 0) return paleta.neutro
  
  const porcentagem = inverso
    ? valor <= meta
      ? 100
      : (meta / valor) * 100
    : (valor / meta) * 100
  
  if (porcentagem >= 100) return paleta.verde
  if (porcentagem >= 81) return paleta.verdeClaro
  if (porcentagem >= 51) return paleta.laranja
  return paleta.vermelho
}

/**
 * Returns color class for text based on value vs meta
 */
export function getTextColorClass(valor: number, meta: number, inverso = false): string {
  if (typeof valor !== "number" || typeof meta !== "number" || meta === 0) return 'text-black'
  
  const porcentagem = inverso
    ? valor <= meta
      ? 100
      : (meta / valor) * 100
    : (valor / meta) * 100
  
  if (porcentagem >= 100) return 'text-green-600'
  if (porcentagem >= 81) return 'text-lime-600'
  if (porcentagem >= 51) return 'text-orange-500'
  return 'text-red-600'
}
