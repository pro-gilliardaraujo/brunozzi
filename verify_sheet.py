import pandas as pd
import os

file_path = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\scripts\dados\Linha_do_tempo-05-10-2025_11-10-2025.xlsx"

try:
    xl = pd.ExcelFile(file_path, engine='openpyxl')
    print(f"Abas encontradas: {xl.sheet_names}")
    if "1.ColunasRemovidas" in xl.sheet_names:
        print("SUCESSO: Aba '1.ColunasRemovidas' encontrada.")
    else:
        print("FALHA: Aba '1.ColunasRemovidas' NÃO encontrada.")
except Exception as e:
    print(f"ERRO: {e}")
