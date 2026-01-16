import os
import sys
import pandas as pd
import glob
import warnings
from datetime import datetime

# Suprimir avisos específicos do openpyxl
warnings.filterwarnings("ignore", category=UserWarning, module="openpyxl")

# --- CONFIGURAÇÕES ---
DIRETORIO_DADOS = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\scripts\dados"
DIRETORIO_SAIDA = os.path.join(DIRETORIO_DADOS, "separados")

def encontrar_ultimo_tratado():
    """Encontra o arquivo tratado mais recente na pasta dados."""
    padrao = os.path.join(DIRETORIO_DADOS, "*_tratado_*.xlsx")
    arquivos = glob.glob(padrao)
    
    if not arquivos:
        return None
    
    # Ordena por data de modificação (mais recente primeiro)
    arquivos.sort(key=os.path.getmtime, reverse=True)
    return arquivos[0]

def main():
    print("=== INICIANDO SEPARAÇÃO POR DIA ===")
    
    # 1. Encontrar o arquivo
    arquivo_input = encontrar_ultimo_tratado()
    
    if not arquivo_input:
        print(f"ERRO: Nenhum arquivo tratado encontrado em: {DIRETORIO_DADOS}")
        print("Execute o script 2_Tratamento.py primeiro.")
        sys.exit(1)
        
    print(f"Lendo arquivo base: {os.path.basename(arquivo_input)}")
    
    try:
        # 2. Ler o arquivo Excel
        # Tenta ler a aba '1.ColunasRemovidas' que contém os dados limpos
        xl = pd.ExcelFile(arquivo_input, engine='openpyxl')
        
        sheet_name = None
        if '1.ColunasRemovidas' in xl.sheet_names:
            sheet_name = '1.ColunasRemovidas'
        else:
            sheet_name = xl.sheet_names[0]
            print(f"AVISO: Aba '1.ColunasRemovidas' não encontrada. Usando '{sheet_name}'.")
            
        df = pd.read_excel(arquivo_input, sheet_name=sheet_name, engine='openpyxl')
        
        # 3. Validar coluna de Data
        col_data = None
        for col in df.columns:
            if str(col).lower().strip() == 'data':
                col_data = col
                break
        
        # Se não achou 'Data', tenta criar a partir de 'Data Hora Local'
        if not col_data:
            print("Coluna 'Data' explícita não encontrada. Tentando derivar de 'Data Hora Local'...")
            for col in df.columns:
                if str(col).lower().strip() == 'data hora local':
                    df['Data'] = pd.to_datetime(df[col], dayfirst=True, errors='coerce').dt.date
                    col_data = 'Data'
                    break
        
        if not col_data:
            print("ERRO: Coluna 'Data' ou 'Data Hora Local' não encontrada na planilha.")
            print(f"Colunas encontradas: {df.columns.tolist()}")
            sys.exit(1)
            
        # Converter para datetime para garantir extração correta
        df[col_data] = pd.to_datetime(df[col_data], errors='coerce')
        
        # Remover linhas sem data válida
        df_validos = df.dropna(subset=[col_data])
        
        if df_validos.empty:
            print("ERRO: Nenhuma data válida encontrada nos dados.")
            sys.exit(1)

        # 4. Criar diretório de saída
        if not os.path.exists(DIRETORIO_SAIDA):
            os.makedirs(DIRETORIO_SAIDA)
            print(f"Diretório criado: {DIRETORIO_SAIDA}")
        else:
            print(f"Usando diretório existente: {DIRETORIO_SAIDA}")
            
        # 5. Separar e Salvar
        datas_unicas = df_validos[col_data].unique()
        print(f"Encontrados {len(datas_unicas)} dias únicos.")
        
        arquivos_gerados = []
        
        for data_val in sorted(datas_unicas):
            ts = pd.to_datetime(data_val)
            data_str = ts.strftime("%d-%m-%Y")
            nome_arquivo = f"{data_str}.xlsx"
            caminho_saida = os.path.join(DIRETORIO_SAIDA, nome_arquivo)
            
            # Filtra os dados do dia
            df_dia = df_validos[df_validos[col_data] == data_val].copy()
            
            # Salva em arquivo separado
            print(f"  -> Salvando {nome_arquivo} ({len(df_dia)} registros)...")
            df_dia.to_excel(caminho_saida, index=False)
            arquivos_gerados.append(nome_arquivo)
            
        print(f"\nSucesso! {len(arquivos_gerados)} arquivos gerados na pasta 'separados'.")
            
    except Exception as e:
        print(f"\nERRO FATAL: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
