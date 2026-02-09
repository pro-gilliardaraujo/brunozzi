# TODO - Projeto Brunozzi Automação ETL

> Última atualização: 08/02/2026

## Fase 1: Extração de Dados (ETL)

- [x] `1_ExtrairRelatorioSolinftec.py` - Extração automática de relatórios Solinftec
- [x] `2_ExtrairTrabalho_OPC.py` - Extração de dados John Deere Operations Center
- [x] Implementar lógica de datas (`extrair_semanal`, `extrair_ontem`, manual)
- [ ] `3_ExtrairCase.py` - Extração de dados Case IH (a criar)
- [ ] Processamento de dados Case → JSON base

## Fase 2: Processamento e Geração de Mapas

- [ ] `4_GerarMapasFrotas.py` - Geração de mapas Leaflet com coordenadas
- [x] Matching de frotas entre Solinftec e OPC
- [x] Filtro de datas (Semanal > Ontem > Manual)
- [ ] Revisar saída dos mapas para integração com frontend

## Fase 3: Frontend Next.js

- [ ] Criar projeto Next.js base em `gerador_relatorios/`
- [ ] Página principal com cards por tipo de equipamento
- [ ] Listagem de relatórios por dia
- [ ] Integração dos mapas Leaflet no frontend
- [ ] Componentes de gráficos/indicadores

## Fase 4: Indicadores e Cálculos

- [ ] Revisar fórmulas de indicadores existentes
- [ ] Ajustar cálculos conforme processamento real
- [ ] Validar dados entre fontes (Solinftec vs OPC vs Case)

## Fase 5: Finalização

- [ ] Testes de automação agendada (Task Scheduler)
- [ ] Documentação final
- [ ] Deploy/entrega

---

## Notas Rápidas

- Usar sempre caminhos relativos no projeto.
- Configuração centralizada em `config_automacao.json`.
