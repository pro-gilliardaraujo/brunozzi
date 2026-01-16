import zipfile
import sys

file_path = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\scripts\dados\Linha_do_tempo-05-10-2025_11-10-2025.xlsx"

try:
    with zipfile.ZipFile(file_path, 'r') as zf:
        ret = zf.testzip()
        if ret is not None:
            print(f"File is corrupted. First bad file: {ret}")
        else:
            print("File is a valid ZIP.")
            print("Contents:", zf.namelist())
except zipfile.BadZipFile as e:
    print(f"BadZipFile: {e}")
except Exception as e:
    print(f"Error: {e}")
