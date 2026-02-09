import os
import zipfile
import pandas as pd
import glob

# Configurações
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # automacao_etl/
DATA_DIR = os.path.join(BASE_DIR, "dados")

def processar_ultimo_arquivo_case():
    print("="*80)
    print("🛠️  PROCESSADOR DE DADOS CASE IH")
    print("="*80)
    
    # 1. Encontrar o ZIP mais recente da Case
    padrao = os.path.join(DATA_DIR, "CASE_*.zip")
    arquivos = glob.glob(padrao)
    
    if not arquivos:
        print(f"❌ Nenhum arquivo ZIP da Case encontrado em: {DATA_DIR}")
        return
        
    arquivo_recente = max(arquivos, key=os.path.getctime)
    print(f"📂 Arquivo mais recente encontrado: {os.path.basename(arquivo_recente)}")
    
    # 2. Extrair
    print("📦 Extraindo conteúdo...")
    try:
        with zipfile.ZipFile(arquivo_recente, 'r') as zip_ref:
            # Extrai para pasta temporária ou final
            # A Case geralmente tem um CSV dentro
            nomes_arquivos = zip_ref.namelist()
            csvs = [n for n in nomes_arquivos if n.lower().endswith('.csv')]
            
            if not csvs:
                print("❌ Nenhum CSV encontrado dentro do ZIP.")
                return
            
            zip_ref.extractall(DATA_DIR)
            csv_alvo = csvs[0] # Pega o primeiro
            print(f"   CSV extraído: {csv_alvo}")
            
    except Exception as e:
        print(f"❌ Erro ao extrair ZIP: {e}")
        return

    # 3. Ler com Pandas
    path_csv = os.path.join(DATA_DIR, csv_alvo)
    print(f"\n📊 Lendo dados do CSV: {path_csv}")
    
    try:
        # Tenta detectar encoding e separador (Case costuma ser ; ou , e encoding latin1 ou utf-8-sig)
        try:
            df = pd.read_csv(path_csv, sep=None, engine='python', encoding='utf-8-sig', nrows=5)
        except:
             df = pd.read_csv(path_csv, sep=';', encoding='latin1', nrows=5)
             
        print("\n✅ Leitura de amostra (5 linhas) realizada com sucesso!")
        print(f"   Colunas detectadas ({len(df.columns)}):")
        for col in df.columns:
            print(f"    - {col}")
            
        print("\n   Pré-visualização:")
        print(df.head())
        
        # Aqui entra a lógica de fórmulas personalizada do usuário
        print("\n🚧 Aguardando definição de fórmulas de tratamento...")
        
    except Exception as e:
        print(f"❌ Erro ao ler CSV: {e}")

if __name__ == "__main__":
    processar_ultimo_arquivo_case()
