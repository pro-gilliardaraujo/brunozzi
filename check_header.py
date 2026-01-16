file_path = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\scripts\dados\Linha_do_tempo-05-10-2025_11-10-2025.xlsx"

try:
    with open(file_path, "rb") as f:
        header = f.read(8)
    print(f"Header hex: {header.hex()}")
    
    if header.startswith(b'PK'):
        print("Type: ZIP (likely .xlsx)")
    elif header.hex().startswith("d0cf11e0"):
        print("Type: OLE2 (likely .xls)")
    else:
        print("Type: Unknown (maybe HTML/XML?)")
except Exception as e:
    print(f"Error: {e}")
