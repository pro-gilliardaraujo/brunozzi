import ttIntervalosData from '../../../../../../__utilitarios/relatorios/implementacao/exemplos/intervalosTransbordos.json'

export const DADOS_MOCK = {
  "metas": {
    "tdh": 0.0124,
    "diesel": 0.718,
    "usoGPS": 90,
    "motorOcioso": 6,
    "horaElevador": 5,
    "mediaVelocidade": 15,
    "impureza_vegetal": 64,
    "eficienciaEnergetica": 65,
    "disponibilidadeMecanica": 90,
    "basculamento": 180
  },
  "uso_gps": [
    {
      "id": 1,
      "nome": "6079",
      "porcentagem": 0
    },
    {
      "id": 2,
      "nome": "6086",
      "porcentagem": 0
    },
    {
      "id": 3,
      "nome": "6096",
      "porcentagem": 0
    },
    {
      "id": 4,
      "nome": "6100",
      "porcentagem": 0
    },
    {
      "id": 5,
      "nome": "6108",
      "porcentagem": 0
    }
  ],
  "metadata": {
    "date": "2025-10-10",
    "type": "tt_diario_novo",
    "frente": "frente5",
    "generated_at": "2025-12-05T08:59:15.770146",
    "equipment_ids": null
  },
  "producao": 685.9,
  "ofensores": [
    {
      "id": "0",
      "tempo": 39.54027777777777,
      "operacao": "8030 - CHUVA- VENTO-UMIDADE-TEMPERATURA",
      "porcentagem": 49.4555700705987
    },
    {
      "id": "1",
      "tempo": 10.60444444444444,
      "operacao": "8650 - FILA UNICA TRANSBORDO",
      "porcentagem": 13.26366112624382
    },
    {
      "id": "2",
      "tempo": 8.879444444444443,
      "operacao": "8260 - AGUARDANDO COLHEDORA",
      "porcentagem": 11.10609261215187
    },
    {
      "id": "3",
      "tempo": 5.213333333333333,
      "operacao": "8310 - SEM OPERADOR",
      "porcentagem": 6.520651509255656
    },
    {
      "id": "4",
      "tempo": 3.969166666666667,
      "operacao": "8040 - MANUTENCAO CORRETIVA",
      "porcentagem": 4.964492189671466
    }
  ],
  "intervalos": {
    "tipos": {
      "Produtivo": 427,
      "Disponível": 437,
      "Manutenção": 8
    },
    "total": 872,
    "resumo": "872 intervalos processados"
  },
  "intervalos_operacao": (ttIntervalosData as any).intervalos,
  "basculamento": [
    {
      "Frota": 6100,
      "Tempo Total": 0.5731,
      "Tempo Médio": 0.0716,
      "Intervalos Válidos": 8
    },
    {
      "Frota": 6079,
      "Tempo Total": 0.3186,
      "Tempo Médio": 0.0637,
      "Intervalos Válidos": 5
    },
    {
      "Frota": 6096,
      "Tempo Total": 0.3383,
      "Tempo Médio": 0.0564,
      "Intervalos Válidos": 6
    },
    {
      "Frota": 6108,
      "Tempo Total": 0.9367,
      "Tempo Médio": 0.0493,
      "Intervalos Válidos": 19
    },
    {
      "Frota": 6086,
      "Tempo Total": 0.4622,
      "Tempo Médio": 0.0385,
      "Intervalos Válidos": 12
    }
  ],
  "motor_ocioso": [
    {
      "id": 1,
      "nome": "6079",
      "percentual": 6.484592319641634,
      "tempoLigado": 7.689166666666666,
      "tempoOcioso": 0.4986111111111112
    },
    {
      "id": 2,
      "nome": "6096",
      "percentual": 6.329245120055277,
      "tempoLigado": 8.040277777777778,
      "tempoOcioso": 0.5088888888888888
    },
    {
      "id": 3,
      "nome": "6100",
      "percentual": 3.2626483021955552,
      "tempoLigado": 8.147777777777778,
      "tempoOcioso": 0.2658333333333334
    },
    {
      "id": 4,
      "nome": "6086",
      "percentual": 3.1281110820015723,
      "tempoLigado": 10.60277777777778,
      "tempoOcioso": 0.3316666666666667
    },
    {
      "id": 5,
      "nome": "6108",
      "percentual": 1.9509716753461188,
      "tempoLigado": 10.93472222222222,
      "tempoOcioso": 0.2133333333333333
    }
  ],
  "producao_total": [
    {
      "valor": 685.9
    }
  ],
  "manobras_frotas": [
    {
      "Frota": 6086,
      "Tempo Total": 198.37,
      "Tempo Médio": 2.51,
      "Intervalos Válidos": 79,
      "Tempo Total (hh:mm)": "1900-01-08T06:22:12",
      "Tempo Médio (hh:mm)": "02:30:36"
    },
    {
      "Frota": 6096,
      "Tempo Total": 132.55,
      "Tempo Médio": 2.6,
      "Intervalos Válidos": 51,
      "Tempo Total (hh:mm)": "1900-01-05T12:33:00",
      "Tempo Médio (hh:mm)": "02:36:00"
    },
    {
      "Frota": 6108,
      "Tempo Total": 81.55,
      "Tempo Médio": 1.57,
      "Intervalos Válidos": 52,
      "Tempo Total (hh:mm)": "1900-01-03T09:33:00",
      "Tempo Médio (hh:mm)": "01:34:12"
    },
    {
      "Frota": 6079,
      "Tempo Total": 43.78,
      "Tempo Médio": 1,
      "Intervalos Válidos": 44,
      "Tempo Total (hh:mm)": "1900-01-01T19:46:48",
      "Tempo Médio (hh:mm)": "01:00:00"
    },
    {
      "Frota": 6100,
      "Tempo Total": 41.38,
      "Tempo Médio": 1.33,
      "Intervalos Válidos": 31,
      "Tempo Total (hh:mm)": "1900-01-01T17:22:48",
      "Tempo Médio (hh:mm)": "01:19:48"
    }
  ],
  "media_velocidade": [
    {
      "id": 1,
      "nome": "6079",
      "velocidade": 5.99
    },
    {
      "id": 2,
      "nome": "6086",
      "velocidade": 6.16
    },
    {
      "id": 3,
      "nome": "6096",
      "velocidade": 6.13
    },
    {
      "id": 4,
      "nome": "6100",
      "velocidade": 5.86
    },
    {
      "id": 5,
      "nome": "6108",
      "velocidade": 5.13
    }
  ],
  "falta_apontamento": [
    {
      "id": 1,
      "nome": "6079",
      "percentual": 1.02,
      "horasSemApontar": 0.25,
      "tempoLigado": 7.69,
      "tempoOcioso": 0.25
    },
    {
      "id": 2,
      "nome": "6086",
      "percentual": 1.65,
      "horasSemApontar": 0.39,
      "tempoLigado": 10.6,
      "tempoOcioso": 0.39
    },
    {
      "id": 3,
      "nome": "6096",
      "percentual": 2.7,
      "horasSemApontar": 0.64,
      "tempoLigado": 8.04,
      "tempoOcioso": 0.64
    },
    {
      "id": 4,
      "nome": "6100",
      "percentual": 1.06,
      "horasSemApontar": 0.25,
      "tempoLigado": 8.15,
      "tempoOcioso": 0.25
    },
    {
      "id": 5,
      "nome": "6108",
      "percentual": 99,
      "horasSemApontar": 0.24,
      "tempoLigado": 10.93,
      "tempoOcioso": 0.24
    }
  ],
  "eficiencia_energetica": [
    {
      "id": 1,
      "nome": "6079",
      "eficiencia": 0.601098226220151,
      "horasMotor": 7.69,
      "horasElevador": 0,
      "horasCarregando": 3.54,
      "horasProdutivas": 4.62
    },
    {
      "id": 2,
      "nome": "6086",
      "eficiencia": 0.401991092481006,
      "horasMotor": 10.6,
      "horasElevador": 0,
      "horasCarregando": 2.63,
      "horasProdutivas": 4.26
    },
    {
      "id": 3,
      "nome": "6096",
      "eficiencia": 0.3841077906374158,
      "horasMotor": 8.04,
      "horasElevador": 0,
      "horasCarregando": 2,
      "horasProdutivas": 3.09
    },
    {
      "id": 4,
      "nome": "6100",
      "eficiencia": 0.5500818219009954,
      "horasMotor": 8.15,
      "horasElevador": 0,
      "horasCarregando": 2.89,
      "horasProdutivas": 4.48
    },
    {
      "id": 5,
      "nome": "6108",
      "eficiencia": 0.591997967737838,
      "horasMotor": 10.93,
      "horasElevador": 0,
      "horasCarregando": 3.95,
      "horasProdutivas": 6.47
    }
  ],
  "media_velocidade_vazio": [
    {
      "id": 1,
      "nome": "6079",
      "velocidade": 7.72
    },
    {
      "id": 2,
      "nome": "6086",
      "velocidade": 7.96
    },
    {
      "id": 3,
      "nome": "6096",
      "velocidade": 7.49
    },
    {
      "id": 4,
      "nome": "6100",
      "velocidade": 6.9
    },
    {
      "id": 5,
      "nome": "6108",
      "velocidade": 6.47
    }
  ],
  "disponibilidade_mecanica": [
    {
      "id": 1,
      "gps": null,
      "nome": "6079",
      "frota": "6079",
      "disponibilidade": 88.35730664998958,
      "tempoManutencao": 2.7925
    },
    {
      "id": 2,
      "gps": null,
      "nome": "6086",
      "frota": "6086",
      "disponibilidade": 99.65037817427483,
      "tempoManutencao": 0.08333333333333333
    },
    {
      "id": 3,
      "gps": null,
      "nome": "6096",
      "frota": "6096",
      "disponibilidade": 94.86469184659256,
      "tempoManutencao": 1.225555555555556
    },
    {
      "id": 4,
      "gps": null,
      "nome": "6100",
      "frota": "6100",
      "disponibilidade": 86.21736209253295,
      "tempoManutencao": 3.305
    },
    {
      "id": 5,
      "gps": null,
      "nome": "6108",
      "frota": "6108",
      "disponibilidade": 100,
      "tempoManutencao": 0
    }
  ],
  "media_velocidade_carregado": [
    {
      "id": 1,
      "nome": "6079",
      "velocidade": 6.83
    },
    {
      "id": 2,
      "nome": "6086",
      "velocidade": 6.32
    },
    {
      "id": 3,
      "nome": "6096",
      "velocidade": 6.6
    },
    {
      "id": 4,
      "nome": "6100",
      "velocidade": 5.46
    },
    {
      "id": 5,
      "nome": "6108",
      "velocidade": 5.71
    }
  ],
  "media_velocidade_detalhada": [],
  "horas_elevador": [],
  "producao_por_frota": [
    {
      "id": 1,
      "nome": "6079",
      "valor": 462
    },
    {
      "id": 2,
      "nome": "6086",
      "valor": 426
    },
    {
      "id": 3,
      "nome": "6096",
      "valor": 309
    },
    {
      "id": 4,
      "nome": "6100",
      "valor": 448
    },
    {
      "id": 5,
      "nome": "6108",
      "valor": 647
    }
  ],
  "lavagem": [],
  "roletes": [],
  "basculamento_frotas": []
}
