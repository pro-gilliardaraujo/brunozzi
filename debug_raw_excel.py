import pandas as pd
import os

# Ajuste o caminho conforme necessário
target_file = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\dados\RLH021_jhonatan.brunozzi_344-0.xlsx"

print(f"Reading file: {target_file}")
try:
    # Ler as primeiras 20 linhas sem cabeçalho para ver a estrutura
    df = pd.read_excel(target_file, header=None, nrows=20)
    print(df.to_string())
except Exception as e:
    print(f"Error: {e}")
