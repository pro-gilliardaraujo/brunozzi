import pandas as pd
import os

# Caminho para salvar o arquivo de teste
diretorio_dados = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\scripts\dados"
os.makedirs(diretorio_dados, exist_ok=True)
caminho_arquivo = os.path.join(diretorio_dados, "teste_tratamento.xlsx")

# Dados fictícios com colunas que devem ser removidas e outras que devem ficar
dados = {
    "Descrição Regional": ["R1", "R2"],
    "Descrição da Unidade": ["U1", "U2"],
    "ColunaUtil1": [10, 20],
    "Código da Fazenda": ["F1", "F2"],
    "ColunaUtil2": [30, 40]
}

df = pd.DataFrame(dados)

# Salvar como Excel válido
df.to_excel(caminho_arquivo, sheet_name="Plan1", index=False)

print(f"Arquivo de teste criado em: {caminho_arquivo}")
