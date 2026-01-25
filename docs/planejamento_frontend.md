# Planejamento: Integração Frontend e Dados JSON

Este documento detalha a análise da estrutura atual dos relatórios gerados (JSON) em comparação com os componentes de frontend migrados, e define os próximos passos para a integração.

## 1. Análise da Estrutura de Dados (JSON Gerado vs Frontend)

### 1.1 Relatório Diário de Frotas (Colhedoras) - `cd-diario-frotas`

**Estrutura Esperada pelo Frontend (`dados.ts` / `DADOS_MOCK`):**
O frontend atual utiliza um objeto único contendo diversas chaves para alimentar os gráficos e tabelas:
- `metas`: Objeto com valores de meta (ex: `tdh`, `diesel`, `usoGPS`, `motorOcioso`).
- `intervalos_operacao`: Array de intervalos.
- `lavagem`: Array de registros de lavagem.
- `roletes`: Array de registros de roletes.
- `uso_gps`: Array de objetos `{id, nome, porcentagem}`.
- `producao`: Valor numérico total.
- `ofensores`: Lista de ofensores.

**Estrutura Atual dos JSONs Gerados (`3_SepararPorDia.py`):**
Nossos JSONs estão separados por tipo de equipamento e data (ex: `colhedora_frota_05-10-2025.json`), organizados hierarquicamente:
```json
{
  "ID_FROTA": {
    "Resumo_Dia": [...],
    "Intervalos": [...],
    "Top5Ofensores": [...]
  },
  "Geral": { ... }
}
```

**Discrepâncias Identificadas:**
1.  **Formato de Entrega**: O frontend espera um objeto "achatado" com arrays consolidando todas as frotas (ex: `uso_gps` contém todas as frotas), enquanto o JSON atual agrupa tudo dentro da chave de cada frota.
2.  **Nomenclatura de Campos**: As chaves do JSON gerado seguem o padrão do Excel (ex: `Porcentagem_Motor_Ocioso`), enquanto o frontend usa camelCase ou nomes simplificados (ex: `motorOcioso`).
3.  **Metas**: O JSON gerado atualmente não inclui as metas. Elas precisam ser injetadas ou lidas de um arquivo de configuração separado.

### 1.2 Relatório Diário de Operadores (Colhedoras) - `cd-diario-op`

**Estrutura Esperada pelo Frontend (`ResumoOperadorCd[]`):**
O componente espera um **Array** de objetos com a seguinte interface:
```typescript
type ResumoOperadorCd = {
  operador: string
  eficiencia: number
  horasElevador: number
  velocidade: number
  gps: number
  ocioso: number
}
```

**Estrutura Atual dos JSONs Gerados (`colhedora_operadores_...json`):**
Nosso JSON é um **Objeto** (Dicionário) onde a chave é o ID/Nome:
```json
{
  "102 - NILTON ...": {
    "Horas_Produtivas": 33.08,
    "Vel_Colheita_media": 5.27,
    "Porcentagem_Motor_Ocioso": 22.74,
    ...
  }
}
```

**Discrepâncias Identificadas:**
1.  **Tipo de Dados**: Objeto (Dict) vs Array. Será necessário transformar `Object.entries(json)` em array no frontend ou ajustar a geração.
2.  **Mapeamento de Campos**:
    - `operador` -> Chave do objeto JSON (ou extrair do nome composto).
    - `eficiencia` -> `Eficiencia_Operacional` (verificar se é essa ou `Eficiencia_Energetica`).
    - `horasElevador` -> `Horas_Produtivas` (Confirmar equivalência).
    - `velocidade` -> `Vel_Colheita_media`.
    - `ocioso` -> `Porcentagem_Motor_Ocioso`.
    - `gps` -> **AUSENTE/A VERIFICAR** nos dados de operadores gerados.

## 2. Estratégia de Integração (Frontend-Only)

**Diretriz:** A estrutura atual dos dados gerados pelo Python (Backend) está considerada estável e adequada. Todos os ajustes necessários para compatibilização de formatos deverão ser realizados exclusivamente no **Frontend**.

Para evitar reescrever a lógica de geração de dados, a estratégia é criar **Adapters (Adaptadores)** no lado do cliente.

Isso permite que o Frontend consuma o JSON na estrutura que nós definimos, transformando-o em tempo de execução para o formato que os componentes visuais esperam.

## 3. Checklist de Próximas Etapas

### 3.1 Backend / Dados (Python)
*Status: Congelado/Estável. Nenhuma alteração prevista neste momento.*
- [x] Geração de JSONs separados por tipo e data.
- [x] Estruturação por ID (Frota/Operador).
- [x] Limpeza de dados redundantes.

### 3.2 Frontend (Adapters & Componentes)
- [ ] **Criar `loader.ts`**: Uma função utilitária para carregar os arquivos JSON gerados.
- [ ] **Criar `adapterFrotas.ts`**:
    - Ler o JSON `*_frota_*.json`.
    - Iterar sobre as chaves de frota.
    - Consolidar os dados em arrays (`uso_gps`, `producao`, etc.) conforme esperado pelo `DADOS_MOCK`.
- [ ] **Criar `adapterOperadores.ts`**:
    - Ler o JSON `*_operadores_*.json`.
    - Transformar o Objeto em Array.
    - Mapear os campos (`Horas_Produtivas` -> `horasElevador`, etc.).
- [ ] **Implementar Navegação de Datas**: O frontend precisa de um seletor de datas que carregue o arquivo JSON correspondente (`DD-MM-YYYY.json`).

### 3.3 Validação
- [ ] Validar se os cálculos de totais no frontend batem com os resumos do Excel.
- [ ] Testar a renderização com dados reais de um dia completo.

---
**Observação Técnica:**
A estrutura de arquivos separados (`json/colhedora/`, `json/transbordo/`) facilita o carregamento sob demanda (lazy loading) no frontend, melhorando a performance inicial da aplicação.
