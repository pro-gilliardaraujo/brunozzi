import os
import zipfile
import pandas as pd
import glob
import re
import tempfile
import shutil
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

# Configurações
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "dados")

def processar_ultimo_arquivo_case():
    print("="*80)
    print("🛠️  PROCESSADOR DE DADOS CASE IH")
    print("="*80)
    
    # 1. Encontrar o ZIP mais recente da Case
    # Padrao atualizado para Case*.zip (sem underscore obrigatório)
    padrao = os.path.join(DATA_DIR, "Case*.zip")
    arquivos = glob.glob(padrao)
    
    if not arquivos:
        print(f"❌ Nenhum arquivo ZIP da Case encontrado em: {DATA_DIR}")
        print(f"   (Procurando por: {padrao})")
        return
        
    arquivo_recente = max(arquivos, key=os.path.getctime)
    print(f"📂 Arquivo mais recente encontrado: {os.path.basename(arquivo_recente)}")
    
    # 2. Extrair em pasta temporária
    print("📦 Extraindo conteúdo...")
    
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            with zipfile.ZipFile(arquivo_recente, 'r') as zip_ref:
                nomes_arquivos = zip_ref.namelist()
                csvs = [n for n in nomes_arquivos if n.lower().endswith('.csv')]
                
                if not csvs:
                    print("❌ Nenhum CSV encontrado dentro do ZIP.")
                    return
                
                zip_ref.extractall(temp_dir)
                print(f"   {len(csvs)} arquivos CSV encontrados (extraídos temporariamente).")
            
            # 3. Ler e Consolidar com Pandas
            lista_original = []
            lista_dados = []
            lista_resumo_geral = []
            lista_resumo_diario = []
            
            print(f"\n📊 Lendo e processando arquivos CSV...")
            
            for csv_file in csvs:
                path_csv = os.path.join(temp_dir, csv_file)
                try:
                    # Tenta detectar encoding e separador
                    try:
                        df_temp = pd.read_csv(path_csv, sep=None, engine='python', encoding='utf-8-sig')
                    except:
                        df_temp = pd.read_csv(path_csv, sep=';', encoding='latin1')
                    
                    # 4. Processamento Individual por Arquivo (Frotas separadas)
                    if df_temp.empty:
                        print(f"   ⚠️ Arquivo vazio (ignorado): {csv_file}")
                        continue

                    # Extração da Frota (nickname)
                    if 'nickname' in df_temp.columns and not df_temp['nickname'].empty:
                        nickname = str(df_temp['nickname'].iloc[0])
                        match = re.search(r'(?:MB\s*|FROTA\s*|NO\.\s*|^)(\d+)', nickname, re.IGNORECASE)
                        if match:
                            frota = match.group(1)
                        else:
                            frota = "DESCONHECIDO"
                    else:
                        frota = "SEM_NICKNAME"
                        
                    # Extração da Data REAL dos dados (event_timestamp)
                    if 'event_timestamp' in df_temp.columns and not df_temp['event_timestamp'].empty:
                        try:
                            timestamps = pd.to_datetime(df_temp['event_timestamp'], utc=True)
                            dt_min = timestamps.min()
                            dt_max = timestamps.max()
                            
                            dia_ini = dt_min.strftime("%d")
                            dia_end = dt_max.strftime("%d")
                            mes = dt_max.strftime("%m")
                            ano = dt_max.strftime("%Y")
                            
                            data_periodo = f"{dia_ini}_{dia_end}-{mes}-{ano}"
                        except Exception as e:
                            print(f"      ⚠️ Erro ao calcular datas dos dados: {e}")
                            data_periodo = "DATA_ERRO"
                    
                    # 5. Transformação de Formato LONG para WIDE (Pivot)
                    print(f"      ⟳ Pivotando dados de formato vertical para horizontal...")
                    
                    # Inicializa variáveis para o fallback do except
                    df_resumo_geral = pd.DataFrame()
                    df_resumo_diario_arquivo = pd.DataFrame() # Renomeado para evitar conflito

                    # Primeiro, combinamos numeric_value e text_value em uma única coluna 'valor'
                    # Prioridade para texto se existir, senão numero
                    df_temp['valor'] = df_temp['text_value'].fillna(df_temp['numeric_value'])
                    
                    # Colunas que identificam a "chave" da linha (além do timestamp)
                    index_cols = ['event_timestamp', 'lat', 'lon']
                    
                    # Verifica se existem duplicatas de (timestamp, name) para a mesma frota
                    try:
                        df_pivot = df_temp.pivot_table(
                            index=index_cols, 
                            columns='name', 
                            values='valor', 
                            aggfunc='first' # Pega o primeiro valor encontrado caso haja duplicata
                        ).reset_index()
                        
                        # Flatten nas colunas (remove hierarquia do pivot)
                        df_pivot.columns.name = None
                        
                        # Adiciona colunas fixas de volta
                        df_pivot['frota'] = frota
                        df_pivot['nickname'] = nickname
                        
                        print(f"      ✅ Pivot concluído. Novas dimensões: {df_pivot.shape}")
                        
                        # Seleção e Renomeação de Colunas
                        colunas_desejadas = {
                            'event_timestamp': 'Data/Hora',
                            'frota': 'Frota',
                            'lat': 'Latitude',
                            'lon': 'Longitude',
                            'Velocidade de Deslocamento': 'Velocidade',
                            'Velocidade de GPS': 'Velocidade',
                            'Rotação do Motor': 'RPM',
                            'Rotação do Motor Baixa': 'RPM',
                            'Taxa de combustível do motor': 'Consumo (L/h)',
                            'Nível de Combustível': 'Nivel Combustivel', 
                            'Status da Colheita': 'Status Colheita',
                            'Elevator Fan RPM': 'RPM Extrator Primario',
                            'Chopper Drum RPM': 'RPM Picador',
                            'Base Cutter Pressure': 'Pressao Corte Base',
                            'Horas de Motor': 'Horas Motor'
                        }
                        
                        cols_existentes = [c for c in colunas_desejadas.keys() if c in df_pivot.columns]
                        df_final = df_pivot[cols_existentes].rename(columns=colunas_desejadas)
                        
                        outras_cols = [c for c in df_pivot.columns 
                                       if c not in colunas_desejadas.keys() 
                                       and c not in ['frota', 'nickname', 'Latitude', 'Longitude']]
                        
                        if outras_cols:
                             df_final = pd.concat([df_final, df_pivot[outras_cols]], axis=1)

                        # Formatar Data/Hora
                        if 'Data/Hora' in df_final.columns:
                            df_final['Data/Hora'] = pd.to_datetime(df_final['Data/Hora'], utc=True)
                            
                            # Ordenar
                            df_final = df_final.sort_values(by='Data/Hora')
                            
                            # Calcular Duração
                            next_timestamp = df_final['Data/Hora'].shift(-1)
                            df_final['Duração'] = (next_timestamp - df_final['Data/Hora']).dt.total_seconds() / 3600
                            
                            # Calcular DifHora
                            if 'Horas Motor' in df_final.columns:
                                df_final['Horas Motor'] = pd.to_numeric(df_final['Horas Motor'], errors='coerce')
                                next_hour = df_final['Horas Motor'].shift(-1)
                                df_final['DifHora'] = next_hour - df_final['Horas Motor']
                            
                            # Formatar visual
                            # Mantemos datetime original em coluna auxiliar se precisar filtrar, mas formatamos a visual
                            # Para os calculos de resumo diario, precisamos da data.
                            df_final['Data'] = df_final['Data/Hora'].dt.strftime('%Y-%m-%d')
                            df_final['Data/Hora'] = df_final['Data/Hora'].dt.strftime('%d/%m/%Y %H:%M:%S')
                            
                            # Reordenar colunas
                            cols = list(df_final.columns)
                            if 'Frota' in cols and 'Duração' in cols:
                                cols.insert(cols.index('Frota') + 1, cols.pop(cols.index('Duração')))
                            if 'Horas Motor' in cols and 'DifHora' in cols:
                                cols.insert(cols.index('Horas Motor') + 1, cols.pop(cols.index('DifHora')))
                                
                            df_final = df_final[cols]

                        # --- CÁLCULOS DO RESUMO (DUPLO) ---
                        
                        def calcular_stats(df, label_data=None):
                            stats = {}
                            if label_data:
                                stats['Data'] = label_data

                            # 1. Horímetro
                            if 'Horas Motor' in df.columns:
                                hm_series = pd.to_numeric(df['Horas Motor'], errors='coerce')
                                stats['Hora Motor Inicial'] = hm_series.min()
                                stats['Hora Motor Final'] = hm_series.max()
                                stats['Total Horas Motor (Dif)'] = df['DifHora'].sum() if 'DifHora' in df.columns else 0
                            
                            # 2. RPM Médio
                            if 'RPM' in df.columns:
                                stats['RPM Médio'] = pd.to_numeric(df['RPM'], errors='coerce').mean()

                            # 3. Duração
                            duracao_total = df['Duração'].sum()
                            stats['Tempo Registrado (Total)'] = duracao_total
                            
                            # Dias únicos
                            if not label_data and 'Data/Hora' in df.columns:
                                try:
                                    # Data/Hora já é string formatada DD/MM/YYYY HH:MM:SS
                                    # Pega só primeiros 10 caracteres (DD/MM/YYYY)
                                    datas_unicas = df['Data/Hora'].str[:10].unique()
                                    stats['Dias Únicos Registrados'] = len(datas_unicas)
                                except: pass

                            col_status_duty = 'STATUS_DUTY' if 'STATUS_DUTY' in df.columns else None
                            col_status_device = 'STATUS_DEVICE' if 'STATUS_DEVICE' in df.columns else None
                            
                            horas_produtivas = 0
                            motor_ocioso = 0
                            motor_desligado = 0
                            
                            if col_status_duty and col_status_device:
                                s_velocidade = pd.Series(0, index=df.index)
                                if 'Velocidade' in df.columns:
                                    s_velocidade = pd.to_numeric(df['Velocidade'], errors='coerce').fillna(0)

                                # Produtivo
                                mask_prod = (df[col_status_device].astype(str).str.lower() == 'on') & \
                                            (df[col_status_duty].astype(str).str.upper() == 'WORKING') & \
                                            (s_velocidade > 0)
                                horas_produtivas = df.loc[mask_prod, 'Duração'].sum()
                                
                                # Ocioso
                                mask_ocioso = (df[col_status_device].astype(str).str.lower() == 'on') & \
                                              ( (df[col_status_duty].astype(str).str.upper() == 'KEYON') | (s_velocidade == 0) )
                                motor_ocioso = df.loc[mask_ocioso, 'Duração'].sum()
                                
                                # Desligado
                                mask_off = (df[col_status_duty].astype(str).str.upper() == 'OFF')
                                motor_desligado = df.loc[mask_off, 'Duração'].sum()
                            
                            stats['Horas Produtivas'] = horas_produtivas
                            stats['Motor Ocioso'] = motor_ocioso
                            stats['Motor Desligado'] = motor_desligado
                            
                            stats['% Produtivo'] = (horas_produtivas / duracao_total * 100) if duracao_total > 0 else 0
                            stats['% Ocioso'] = (motor_ocioso / duracao_total * 100) if duracao_total > 0 else 0
                            stats['% Desligado'] = (motor_desligado / duracao_total * 100) if duracao_total > 0 else 0
                            
                            # 4. Médias Temp
                            colunas_temp = [c for c in df.columns if 'temp' in c.lower()]
                            for c_temp in colunas_temp:
                                stats[f'Média {c_temp}'] = pd.to_numeric(df[c_temp], errors='coerce').mean()
                                
                            # 5. Média Velocidade
                            if 'Velocidade' in df.columns:
                                stats['Velocidade Média'] = pd.to_numeric(df['Velocidade'], errors='coerce').mean()

                            # 6. GPS Ligado (Tempo e %)
                            gps_ligado = 0
                            col_gps_status = 'Auto Guidance Engaged Status'
                            if col_gps_status in df.columns:
                                # Garante serie de velocidade
                                s_velocidade_gps = pd.Series(0, index=df.index)
                                if 'Velocidade' in df.columns:
                                    s_velocidade_gps = pd.to_numeric(df['Velocidade'], errors='coerce').fillna(0)
                                    
                                mask_gps_active = (df[col_gps_status].astype(str).str.upper() == 'GUIDANCE_ACTIVE') & \
                                                  (s_velocidade_gps > 0)
                                gps_ligado = df.loc[mask_gps_active, 'Duração'].sum()
                            
                            # Baseado em HORAS MOTOR (Produtivo + Ocioso), não total
                            tempo_motor_ligado = horas_produtivas + motor_ocioso
                            
                            # Se GPS Ligado for maior que motor ligado (pode acontecer por inconsistencia), limita
                            if gps_ligado > tempo_motor_ligado:
                                gps_ligado = tempo_motor_ligado

                            tempo_gps_desligado = tempo_motor_ligado - gps_ligado
                            
                            stats['Tempo GPS Ligado'] = gps_ligado
                            stats['Tempo GPS Desligado'] = tempo_gps_desligado
                            
                            # Percentuais baseados no TEMPO DE MOTOR LIGADO
                            if tempo_motor_ligado > 0:
                                stats['% GPS Ligado'] = (gps_ligado / tempo_motor_ligado * 100)
                                stats['% GPS Desligado'] = (tempo_gps_desligado / tempo_motor_ligado * 100)
                            else:
                                stats['% GPS Ligado'] = 0
                                stats['% GPS Desligado'] = 0
                                
                            return stats

                        # A) Resumo GERAL
                        stats_geral = calcular_stats(df_final)
                        df_resumo_geral = pd.DataFrame([stats_geral])
                        df_resumo_geral.insert(0, 'Nickname', nickname)
                        df_resumo_geral.insert(0, 'Frota', frota)
                        
                        # B) Resumo DIÁRIO
                        # Usar a coluna 'Data' criada anteriormente (YYYY-MM-DD)
                        if 'Data' not in df_final.columns:
                             # Fallback se não criou antes
                             df_final['Data'] = df_final['Data/Hora'].str[:10]

                        dias_unicos = df_final['Data'].unique()
                        
                        for dia in dias_unicos:
                            df_dia = df_final[df_final['Data'] == dia]
                            if df_dia.empty: continue
                            
                            # Formata a Data para DD/MM/YYYY
                            try:
                                dia_formatado = pd.to_datetime(dia).strftime('%d/%m/%Y')
                            except:
                                dia_formatado = dia

                            stats_dia = calcular_stats(df_dia, label_data=dia_formatado)
                            df_res_dia = pd.DataFrame([stats_dia])
                            
                            # Remove Data duplicada se vier do stats
                            if 'Data' in df_res_dia.columns:
                                df_res_dia.drop(columns=['Data'], inplace=True)
                            
                            # Inserir na ordem solicitada: Data, Frota
                            df_res_dia.insert(0, 'Frota', frota)
                            df_res_dia.insert(0, 'Data', dia_formatado)
                            
                            df_resumo_diario_arquivo = pd.concat([df_resumo_diario_arquivo, df_res_dia], ignore_index=True)


                        # Filtragem de Colunas (Remover Indesejadas)
                        colunas_excluir = [
                            "APM_GSM", "Altitude", "Carga do Motor", 
                            "Cross Track Error 3", "Deslizamento da roda", "Direção", "Engine Oil Level Status", 
                            "GPS_ALT", "GPS_CURRENT", "GPS_DIR", "GPS_PDOP", "GPS_SAT", "GPS_SPEED", 
                            "Gear Selected", "Hor.linha trans.", "Latitude bruta", "NETWORK_CONNECTION", 
                            "NETWORK_MCC", "NETWORK_MNC", "NETWORK_OPERATOR_NAME", "NETWORK_RSSI", 
                            "NETWORK_STATUS", "Posição do engate traseiro", "Pressão de lubrificação da transmissão", 
                            "Pressão do óleo da transmissão", "Pressão turbo do motor", "Pressão óleo motor", 
                            "STATUS_DUTY_DESCRIPTION", "Tensão bateria", "Tipo Linha", "Transmission Range", 
                            "Transmission Status CVT", "Transmission Status Powershift", "Veloc. TDP dianteira", 
                            "Velocidade da TDP traseira",
                            "Combustível por distância - Média", "GPS_FIX", "Nível de Combustível", "Potência motor",
                            "STATUS_DUTY_CODE", "Data" # Remove Data auxiliar do 'Dados' clean
                        ]
                        
                        cols_remover = [c for c in colunas_excluir if c in df_final.columns]
                        df_limpo = df_final.drop(columns=cols_remover)
                        print(f"      🧹 Colunas removidas: {len(cols_remover)}")

                    except Exception as e:
                        print(f"      ❌ Erro ao pivotar/processar dados ou resumos: {e}")
                        # Fallback
                        df_final = df_temp
                        df_limpo = df_temp
                        # Mantem vazios se der erro
                        if 'df_resumo_geral' not in locals(): df_resumo_geral = pd.DataFrame()
                        if 'df_resumo_diario_arquivo' not in locals(): df_resumo_diario_arquivo = pd.DataFrame()

                    # Adiciona aos consolidadores
                    lista_original.append(df_final)
                    lista_dados.append(df_limpo)
                    lista_resumo_geral.append(df_resumo_geral)
                    lista_resumo_diario.append(df_resumo_diario_arquivo)
                    
                    print(f"   ✅ Processado: {frota} (Adicionado às listas)")

                except Exception as e:
                    print(f"   ❌ Erro ao ler {csv_file}: {e}")

            if not lista_original:
                print("❌ Nenhum dado válido foi processado.")
                return

            print(f"\n📂 Consolidando arquivos...")
            
            # Concatena Tudo
            df_final_consol = pd.concat(lista_original, ignore_index=True)
            df_dados_consol = pd.concat(lista_dados, ignore_index=True)
            df_resumo_geral_consol = pd.concat(lista_resumo_geral, ignore_index=True)
            df_resumo_diario_consol = pd.concat(lista_resumo_diario, ignore_index=True)
            
            # Define nome do arquivo consolidado
            nome_saida = f"Consolidado_Case_{data_periodo}.xlsx"
            path_saida = os.path.join(DATA_DIR, nome_saida)
            
            print(f"   💾 Salvando: {nome_saida} com 4 abas...")
            
            with pd.ExcelWriter(path_saida, engine='openpyxl') as writer:
                # Ordem: Resumo Geral, Resumo Diário, Original, Dados
                df_resumo_geral_consol.to_excel(writer, sheet_name='Resumo', index=False)
                # Formatar data na saída do Excel se necessário (já é string ou objeto)
                df_resumo_diario_consol.to_excel(writer, sheet_name='Resumo Diário', index=False)
                
                df_final_consol.to_excel(writer, sheet_name='Original', index=False)
                df_dados_consol.to_excel(writer, sheet_name='Dados', index=False)
                
                # Função para auto-ajuste de largura
                for sheet_name in writer.sheets:
                    worksheet = writer.sheets[sheet_name]
                    for column in worksheet.columns:
                        max_length = 0
                        column_letter = column[0].column_letter # Get the column name
                        
                        for cell in column:
                            try:
                                if len(str(cell.value)) > max_length:
                                    max_length = len(str(cell.value))
                            except:
                                pass
                        
                        adjusted_width = (max_length + 2)
                        worksheet.column_dimensions[column_letter].width = adjusted_width

            print(f"✅ Processamento CONSOLIDADO concluído com sucesso!")
            
    except Exception as e:
        print(f"❌ Erro durante processamento: {e}")
        return

if __name__ == "__main__":
    processar_ultimo_arquivo_case()
