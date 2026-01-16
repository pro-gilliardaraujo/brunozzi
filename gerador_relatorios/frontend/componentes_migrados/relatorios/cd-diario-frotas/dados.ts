import mockIntervalosData from './mock_intervalos.json';

export const DADOS_MOCK = {
  "metas": {
    "tdh": 0.0124,
    "diesel": 0.718,
    "usoGPS": 90,
    "motorOcioso": 4,
    "horaElevador": 15,
    "mediaVelocidade": 7,
    "manobras": 60,
    "impureza_vegetal": 64,
    "eficienciaEnergetica": 70,
    "disponibilidadeMecanica": 90
  },
  "intervalos_operacao": mockIntervalosData.intervalos,
  "imagens": {
    "mapaGPS": "https://placehold.co/750x975/png?text=Mapa+de+Utilizacao+GPS",
    "areaTrabalhada": "https://placehold.co/750x975/png?text=Area+Trabalhada"
  },
  "lavagem": [
    {
      "Fim": "13:08:58",
      "Data": "10/10/2025",
      "Início": "13:01:58",
      "Intervalo": "Intervalo 1",
      "Equipamento": 7032,
      "Duração (horas)": 0.1283333333333333,
      "Tempo Total do Dia": 0.1283333333333333
    },
    {
      "Fim": "20:14:47",
      "Data": "10/10/2025",
      "Início": "19:34:08",
      "Intervalo": "Intervalo 1",
      "Equipamento": 7036,
      "Duração (horas)": 0.6797222222222223,
      "Tempo Total do Dia": 0.6797222222222223
    }
  ],
  "roletes": [
    {
      "Fim": "16:50:21",
      "Data": "10/10/2025",
      "Início": "16:42:21",
      "Intervalo": "Intervalo 1",
      "Equipamento": 7032,
      "Duração (horas)": 0.1447,
      "Tempo Total do Dia": 0.1447
    },
    {
      "Fim": "14:12:35",
      "Data": "10/10/2025",
      "Início": "13:52:35",
      "Intervalo": "Intervalo 1",
      "Equipamento": 7037,
      "Duração (horas)": 0.3358,
      "Tempo Total do Dia": 0.5133
    },
    {
      "Fim": "18:12:20",
      "Data": "10/10/2025",
      "Início": "18:02:20",
      "Intervalo": "Intervalo 2",
      "Equipamento": 7037,
      "Duração (horas)": 0.1775,
      "Tempo Total do Dia": 0.5133
    }
  ],
  "uso_gps": [
    {
      "id": 1,
      "nome": "7032",
      "porcentagem": 28.09042155997555
    },
    {
      "id": 2,
      "nome": "7036",
      "porcentagem": 2.0120724346076457
    },
    {
      "id": 3,
      "nome": "7037",
      "porcentagem": 25.16927221808643
    },
    {
      "id": 4,
      "nome": "7038",
      "porcentagem": 52.39284563325815
    }
  ],
  "metadata": {
    "date": "2025-10-10",
    "type": "cd_diario_novo",
    "frente": "frente5",
    "generated_at": "2025-12-05T08:58:56.422173",
    "equipment_ids": null
  },
  "producao": 685.9,
  "ofensores": [
    {
      "id": "0",
      "tempo": 22.6625,
      "operacao": "8040 - MANUTENCAO CORRETIVA",
      "porcentagem": 45.80236239922751
    },
    {
      "id": "1",
      "tempo": 19.4725,
      "operacao": "8030 - CHUVA- VENTO-UMIDADE-TEMPERATURA",
      "porcentagem": 39.35516830971683
    },
    {
      "id": "2",
      "tempo": 2.335,
      "operacao": "8620 - FALTA TRANSBORDO",
      "porcentagem": 4.719184388403584
    },
    {
      "id": "3",
      "tempo": 0.9008333333333333,
      "operacao": "8630 - TROCA DE FAQUINHA",
      "porcentagem": 1.820641800094316
    },
    {
      "id": "4",
      "tempo": 0.8080555555555555,
      "operacao": "8490 - LAVAGEM",
      "porcentagem": 1.6331319754777571
    }
  ],
  "intervalos": {
    "tipos": {
      "Produtivo": 428,
      "Disponível": 437,
      "Manutenção": 22
    },
    "total": 887,
    "resumo": "887 intervalos processados"
  },
  "motor_ocioso": [
    {
      "id": 1,
      "nome": "7032",
      "percentual": 0.6523227736331856,
      "tempoLigado": 7.7075,
      "tempoOcioso": 0.05027777777777778
    },
    {
      "id": 2,
      "nome": "7036",
      "percentual": 32.54602713178295,
      "tempoLigado": 2.293333333333333,
      "tempoOcioso": 0.7463888888888888
    },
    {
      "id": 3,
      "nome": "7037",
      "percentual": 0.9476184523065385,
      "tempoLigado": 11.10972222222222,
      "tempoOcioso": 0.1052777777777778
    },
    {
      "id": 4,
      "nome": "7038",
      "percentual": 0.3838890436828582,
      "tempoLigado": 8.972499999999998,
      "tempoOcioso": 0.03444444444444444
    }
  ],
  "disponibilidade_mecanica": [
    {
      "id": 1,
      "nome": "7037",
      "disponibilidade": 96.89,
      "horasMotor": 11.116666666666667,
      "tempoManutencao": 0.75
    },
    {
      "id": 2,
      "nome": "7032",
      "disponibilidade": 76.31,
      "horasMotor": 7.7,
      "tempoManutencao": 5.683333333333333
    },
    {
      "id": 3,
      "nome": "7038",
      "disponibilidade": 49.05,
      "horasMotor": 8.966666666666667,
      "tempoManutencao": 10.25
    },
    {
      "id": 4,
      "nome": "7036",
      "disponibilidade": 29.32,
      "horasMotor": 2.3,
      "tempoManutencao": 6.883333333333333
    }
  ],
  "horas_elevador": [
    {
      "id": 1,
      "nome": "7032",
      "valor": 0.1242
    },
    {
      "id": 2,
      "nome": "7032",
      "valor": 4.2122
    },
    {
      "id": 3,
      "nome": "7032",
      "valor": 2.1231
    },
    {
      "id": 4,
      "nome": "7036",
      "valor": 1.1153
    },
    {
      "id": 5,
      "nome": "7037",
      "valor": 0.0125
    },
    {
      "id": 6,
      "nome": "7037",
      "valor": 3.5333
    },
    {
      "id": 7,
      "nome": "7037",
      "valor": 6.9619
    },
    {
      "id": 8,
      "nome": "7038",
      "valor": 0.0081
    },
    {
      "id": 9,
      "nome": "7038",
      "valor": 1.1647
    },
    {
      "id": 10,
      "nome": "7038",
      "valor": 5.1164
    },
    {
      "id": 11,
      "nome": "7038",
      "valor": 2.1047
    }
  ],
  "producao_total": [
    {
      "valor": 685.9
    }
  ],
  "horas_por_frota": [
    {
      "id": 1,
      "nome": "7032",
      "frota": "7032",
      "horas": 23.97
    },
    {
      "id": 2,
      "nome": "7036",
      "frota": "7036",
      "horas": 9.74
    },
    {
      "id": 3,
      "nome": "7037",
      "frota": "7037",
      "horas": 23.87
    },
    {
      "id": 4,
      "nome": "7038",
      "frota": "7038",
      "horas": 20.13
    }
  ],
  "manobras_frotas": [
    {
      "Frota": 7037,
      "Tempo Total": 3.083888888888889,
      "Tempo Médio": 0.02548668503213957,
      "Intervalos Válidos": 121,
      "Tempo Total (hh:mm)": "03:05:02",
      "Tempo Médio (hh:mm)": "00:01:31"
    },
    {
      "Frota": 7032,
      "Tempo Total": 2.531944444444445,
      "Tempo Médio": 0.03669484702093398,
      "Intervalos Válidos": 69,
      "Tempo Total (hh:mm)": "02:31:55",
      "Tempo Médio (hh:mm)": "00:02:12"
    },
    {
      "Frota": 7038,
      "Tempo Total": 1.276944444444444,
      "Tempo Médio": 0.01702592592592593,
      "Intervalos Válidos": 75,
      "Tempo Total (hh:mm)": "01:16:37",
      "Tempo Médio (hh:mm)": "00:01:01"
    },
    {
      "Frota": 7036,
      "Tempo Total": 0.3038888888888889,
      "Tempo Médio": 0.02532407407407407,
      "Intervalos Válidos": 12,
      "Tempo Total (hh:mm)": "00:18:14",
      "Tempo Médio (hh:mm)": "00:01:31"
    }
  ],
  "media_velocidade": [
    {
      "id": 1,
      "nome": "7032",
      "velocidade": 5.71075962256466
    },
    {
      "id": 2,
      "nome": "7038",
      "velocidade": 5.283250080567194
    },
    {
      "id": 3,
      "nome": "7037",
      "velocidade": 5.013339714275586
    },
    {
      "id": 4,
      "nome": "7036",
      "velocidade": 3.690207914151577
    }
  ],
  "producao_por_frota": [
    {
      "id": 1,
      "nome": "7032",
      "valor": 142.82
    },
    {
      "id": 2,
      "nome": "7036",
      "valor": 28.91
    },
    {
      "id": 3,
      "nome": "7037",
      "valor": 273.49
    },
    {
      "id": 4,
      "nome": "7038",
      "valor": 240.67
    }
  ],
  "eficiencia_energetica": [
    {
      "id": 1,
      "nome": "7037",
      "eficiencia": 70.53131641455182,
      "horasMotor": 11.10972222222222,
      "horasElevador": 7.835833333333333
    },
    {
      "id": 2,
      "nome": "7038",
      "eficiencia": 76.85210984180057,
      "horasMotor": 8.972499999999998,
      "horasElevador": 6.895555555555554
    },
    {
      "id": 3,
      "nome": "7032",
      "eficiencia": 53.09042419000253,
      "horasMotor": 7.7075,
      "horasElevador": 4.091944444444445
    },
    {
      "id": 4,
      "nome": "7036",
      "eficiencia": 36.11918604651163,
      "horasMotor": 2.293333333333333,
      "horasElevador": 0.8283333333333333
    }
  ]
}
