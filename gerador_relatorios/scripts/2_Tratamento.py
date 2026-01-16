import os
import sys
import pandas as pd
import numpy as np
from openpyxl.utils import get_column_letter

# --- CONFIGURAÇÕES GERAIS ---
# Diretório onde estão os arquivos Excel originais
DIRETORIO_ENTRADA = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\scripts\dados"

# Colunas a serem removidas na etapa 1
COLUNAS_PARA_REMOVER = [
    "Descrição Regional",
    "Descrição da Unidade",
    "Descrição do Grupo de Equipamento",
    "Código da Fazenda",
    "Código da Zona",
    "Código do Talhão",
    "Descrição da Fazenda",
    "Horímetro/Odometro Secundário"
]
# ----------------------------

def validar_diretorio(caminho):
    """Verifica se o diretório de entrada existe."""
    if not os.path.exists(caminho):
        print(f"ERRO: O diretório configurado não existe: {caminho}")
        return False
    return True

def obter_arquivos_xlsx(diretorio):
    """Retorna uma lista de arquivos .xlsx no diretório."""
    arquivos = [
        os.path.join(diretorio, f) 
        for f in os.listdir(diretorio) 
        if f.lower().endswith(".xlsx") and not f.startswith("~$") # Ignora arquivos temporários do Excel
    ]
    return arquivos

def ajustar_largura_colunas(worksheet):
    """
    Ajusta a largura das colunas de uma worksheet baseada no conteúdo.
    """
    for column in worksheet.columns:
        max_length = 0
        column_letter = get_column_letter(column[0].column)
        
        for cell in column:
            try:
                if cell.value:
                    val_len = len(str(cell.value))
                    if val_len > max_length:
                        max_length = val_len
            except:
                pass
        
        # Define um tamanho mínimo e adiciona um pouco de folga
        adjusted_width = (max_length + 2) * 1.2
        # Limita a largura máxima para não ficar excessivamente larga se houver textos gigantes
        if adjusted_width > 100:
            adjusted_width = 100
        worksheet.column_dimensions[column_letter].width = adjusted_width

def tratar_arquivo(caminho_arquivo):
    """
    Abre o arquivo Excel, remove colunas especificadas e salva em uma nova aba.
    """
    print(f"\nIniciando processamento: {os.path.basename(caminho_arquivo)}")
    
    try:
        # Carrega a planilha original 'Plan1'
        # Usamos engine='openpyxl' para garantir compatibilidade
        df_original = pd.read_excel(caminho_arquivo, sheet_name="Plan1", engine="openpyxl")
        
        # Identifica quais colunas da lista realmente existem no arquivo
        colunas_existentes = [col for col in COLUNAS_PARA_REMOVER if col in df_original.columns]
        
        if not colunas_existentes:
            print("  AVISO: Nenhuma das colunas configuradas para remoção foi encontrada.")
            # Mesmo assim, vamos criar a aba copiando os dados, para manter a consistência do processo
            df_tratado = df_original.copy()
        else:
            print(f"  Removendo {len(colunas_existentes)} colunas...")
            df_tratado = df_original.drop(columns=colunas_existentes)

        # Salva o resultado em uma nova aba "1.ColunasRemovidas"
        # mode='a' (append) permite adicionar abas sem apagar o arquivo, 
        # mas se o arquivo não existir ou se quisermos substituir a aba, precisamos cuidar.
        # Aqui, vamos usar ExcelWriter com if_sheet_exists='replace' para atualizar a aba se ela já existir.
        with pd.ExcelWriter(caminho_arquivo, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            # --- ETAPA 1: Remoção de Colunas ---
            nome_aba_1 = "1.ColunasRemovidas"
            df_tratado.to_excel(writer, sheet_name=nome_aba_1, index=False)
            ajustar_largura_colunas(writer.sheets[nome_aba_1])
            
            # --- ETAPA 2: Agrupamento e Métricas ---
            # Prepara os dados para cálculos
            df_calc = df_tratado.copy()
            
            # Converte colunas de hora para datetime para calcular duração
            # Assume formato HH:MM:SS. Se falhar, tenta inferir.
            try:
                # Converte para string primeiro para garantir
                df_calc['Hora Inicial'] = df_calc['Hora Inicial'].astype(str)
                df_calc['Hora Final'] = df_calc['Hora Final'].astype(str)
                
                # Cria colunas temporárias de datetime (usando uma data arbitrária para permitir subtração)
                df_calc['dt_inicial'] = pd.to_datetime(df_calc['Hora Inicial'], format='%H:%M:%S', errors='coerce')
                df_calc['dt_final'] = pd.to_datetime(df_calc['Hora Final'], format='%H:%M:%S', errors='coerce')
                
                # Calcula duração em minutos
                # Se hora final < hora inicial (virada de dia), adiciona 1 dia
                df_calc['Duração'] = df_calc['dt_final'] - df_calc['dt_inicial']
                # Corrige virada de dia (ex: 23:00 a 01:00) - embora os dados pareçam quebrados por dia (00:00:00)
                mask_negativo = df_calc['Duração'].dt.total_seconds() < 0
                df_calc.loc[mask_negativo, 'Duração'] += pd.Timedelta(days=1)
                
                df_calc['Duração (min)'] = df_calc['Duração'].dt.total_seconds() / 60
                
            except Exception as e:
                print(f"  AVISO: Não foi possível calcular duração (erro de formato de data): {e}")
                df_calc['Duração (min)'] = 0

            # Agrupamento
            colunas_agrupamento = [
                'Data Hora Local', 
                'Código Equipamento', 
                'Descrição do Equipamento',
                'Descrição do Grupo da Operação', 
                'Descrição da Operação'
            ]
            
            # Filtra apenas colunas que existem no dataframe
            cols_group = [c for c in colunas_agrupamento if c in df_calc.columns]
            
            if cols_group:
                df_agrupado = df_calc.groupby(cols_group).agg(
                    Ocorrencias=('Descrição da Operação', 'count'),
                    Duracao_Total_Min=('Duração (min)', 'sum'),
                    Velocidade_Media_Global=('Velocidade Média', 'mean')
                ).reset_index()
                
                # Formata duração total para horas decimais ou mantém minutos
                df_agrupado['Duração Total (h)'] = round(df_agrupado['Duracao_Total_Min'] / 60, 2)
                
                nome_aba_2 = "2.Agrupamento"
                df_agrupado.to_excel(writer, sheet_name=nome_aba_2, index=False)
                ajustar_largura_colunas(writer.sheets[nome_aba_2])
                print(f"  SUCESSO: Aba '{nome_aba_2}' criada com métricas calculadas.")
            else:
                print("  AVISO: Colunas para agrupamento não encontradas.")

            # Aplica resize em TODAS as abas (incluindo as originais que não foram tocadas mas estão no book)
            # Nota: O writer do pandas com openpyxl carrega o book. 
            # Iteramos sobre todas as sheets visíveis no writer.book
            for sheet_name in writer.book.sheetnames:
                 # Evita refazer o que já fizemos explicitamente (embora não faça mal)
                if sheet_name not in [nome_aba_1, nome_aba_2]:
                    ajustar_largura_colunas(writer.book[sheet_name])
            
        print(f"  Processamento finalizado para {os.path.basename(caminho_arquivo)}")
        
    except Exception as e:
        print(f"  ERRO ao processar arquivo: {e}")

def main():
    print("=== INICIANDO TRATAMENTO DE DADOS ===")
    print(f"Diretório alvo: {DIRETORIO_ENTRADA}")
    
    if not validar_diretorio(DIRETORIO_ENTRADA):
        sys.exit(1)
        
    arquivos = obter_arquivos_xlsx(DIRETORIO_ENTRADA)
    
    if not arquivos:
        print("Nenhum arquivo .xlsx encontrado na pasta dados.")
        sys.exit(0)
        
    print(f"Encontrados {len(arquivos)} arquivos para processar.")
    
    for arquivo in arquivos:
        tratar_arquivo(arquivo)
        
    print("\n=== TRATAMENTO CONCLUÍDO ===")

if __name__ == "__main__":
    main()
