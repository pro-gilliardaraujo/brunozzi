"""
Utilitário para analisar o conteúdo dos arquivos ZIP gerados pelo 2_ExtrairTrabalho_OPC.py
Este script extrai e exibe a estrutura e conteúdo dos shapes geoespaciais
VERSÃO SIMPLIFICADA - sem geopandas
"""

import os
import zipfile
import json
from pathlib import Path
from datetime import datetime




def ler_geojson(caminho):
    """Lê arquivo GeoJSON e retorna informações"""
    with open(caminho, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    features = data.get('features', [])
    if not features:
        return None
    
    # Analisa estrutura
    propriedades = list(features[0]['properties'].keys()) if features else []
    geometria_tipo = features[0]['geometry']['type'] if features else None
    
    return {
        'total_registros': len(features),
        'propriedades': propriedades,
        'tipo_geometria': geometria_tipo,
        'features': features
    }


def ler_dbf_simples(caminho):
    """Lê arquivo .dbf (simples) de shapefile"""
    try:
        with open(caminho, 'rb') as f:
            # Cabeçalho DBF
            header = f.read(32)
            num_records = int.from_bytes(header[4:8], 'little')
            header_length = int.from_bytes(header[8:10], 'little')
            record_length = int.from_bytes(header[10:12], 'little')
            
            # Lê descrição dos campos
            num_fields = (header_length - 33) // 32
            fields = []
            for _ in range(num_fields):
                field_desc = f.read(32)
                field_name = field_desc[:11].decode('ascii').rstrip('\x00')
                field_type = chr(field_desc[11])
                field_length = field_desc[16]
                fields.append({'name': field_name, 'type': field_type, 'length': field_length})
            
            # Pula terminador
            f.read(1)
            
            # Lê primeiro registro como exemplo
            primeiro_registro = {}
            if num_records > 0:
                f.read(1)  # deletion flag
                for field in fields:
                    value = f.read(field['length']).decode('ascii', errors='ignore').strip()
                    primeiro_registro[field['name']] = value
            
            return {
                'total_registros': num_records,
                'campos': [f['name'] for f in fields],
                'tipos': {f['name']: f['type'] for f in fields},
                'primeiro_registro': primeiro_registro
            }
    except Exception as e:
        print(f"  ⚠️ Erro ao ler DBF: {e}")
        return None


def analisar_zip_shape(caminho_zip):
    """
    Analisa um arquivo ZIP contendo dados geoespaciais

    Args:
        caminho_zip: Caminho completo para o arquivo ZIP

    Returns:
        dict: Dicionário com informações sobre o arquivo
    """
    print(f"\n{'=' * 80}")
    print(f"📦 Analisando: {os.path.basename(caminho_zip)}")
    print(f"{'=' * 80}")

    resultado = {
        "nome_arquivo": os.path.basename(caminho_zip),
        "tamanho_bytes": os.path.getsize(caminho_zip),
        "arquivos_internos": [],
        "geoespacial": None
    }

    # 1. Listar conteúdo do ZIP
    print("\n📄 Arquivos dentro do ZIP:")
    with zipfile.ZipFile(caminho_zip, 'r') as zip_ref:
        lista_arquivos = zip_ref.namelist()
        for arquivo in lista_arquivos:
            info = zip_ref.getinfo(arquivo)
            resultado["arquivos_internos"].append({
                "nome": arquivo,
                "tamanho": info.file_size,
                "extensao": Path(arquivo).suffix
            })
            print(f"  - {arquivo} ({info.file_size:,} bytes)")

    # 2. Extrair e analisar conteúdo
    try:
        pasta_temp = os.path.join(os.path.dirname(caminho_zip), "_temp_analise")
        os.makedirs(pasta_temp, exist_ok=True)

        with zipfile.ZipFile(caminho_zip, 'r') as zip_ref:
            zip_ref.extractall(pasta_temp)

        # Procurar arquivos importantes
        geojsons = list(Path(pasta_temp).rglob("*.geojson"))
        shapefiles_shp = list(Path(pasta_temp).rglob("*.shp"))
        shapefiles_dbf = list(Path(pasta_temp).rglob("*.dbf"))

        dados_geo = None

        if geojsons:
            print(f"\n🗺️  Encontrado GeoJSON: {geojsons[0].name}")
            dados_geo = ler_geojson(geojsons[0])
            
            if dados_geo:
                print(f"  ✅ {dados_geo['total_registros']} registros encontrados")
                print(f"  📐 Tipo de Geometria: {dados_geo['tipo_geometria']}")
                print(f"\n📋 Propriedades ({len(dados_geo['propriedades'])}):")
                for prop in dados_geo['propriedades']:
                    exemplo = dados_geo['features'][0]['properties'].get(prop) if dados_geo['features'] else None
                    print(f"  - {prop}: {exemplo}")
                
                # Busca campos de data/tempo
                colunas_data = [p for p in dados_geo['propriedades'] 
                              if any(kw in p.lower() for kw in ['time', 'data', 'date', 'timestamp'])]
                
                if colunas_data:
                    print(f"\n� Campos de Data/Tempo: {colunas_data}")
                    for col in colunas_data:
                        primeiro_val = dados_geo['features'][0]['properties'].get(col)
                        ultimo_val = dados_geo['features'][-1]['properties'].get(col) if len(dados_geo['features']) > 1 else primeiro_val
                        print(f"  {col}: {primeiro_val} até {ultimo_val}")
                
                # Mostra primeiras coordenadas
                if dados_geo['features']:
                    coords = dados_geo['features'][0]['geometry']['coordinates']
                    print(f"\n🌍 Exemplo de Coordenadas (primeiro ponto):")
                    if isinstance(coords[0], list):
                        print(f"  Primeiro ponto da geometria: {coords[0]}")
                    else:
                        print(f"  Coordenadas: {coords}")

                resultado['geoespacial'] = {
                    'tipo': 'GeoJSON',
                    'total_registros': dados_geo['total_registros'],
                    'tipo_geometria': dados_geo['tipo_geometria'],
                    'propriedades': dados_geo['propriedades'],
                    'colunas_data': colunas_data
                }

        elif shapefiles_dbf:
            print(f"\n�️  Encontrado Shapefile DBF: {shapefiles_dbf[0].name}")
            dados_dbf = ler_dbf_simples(shapefiles_dbf[0])
            
            if dados_dbf:
                print(f"  ✅ {dados_dbf['total_registros']} registros no DBF")
                print(f"\n📋 Campos ({len(dados_dbf['campos'])}):")
                for campo in dados_dbf['campos']:
                    tipo = dados_dbf['tipos'][campo]
                    exemplo = dados_dbf['primeiro_registro'].get(campo, '')
                    print(f"  - {campo} (tipo: {tipo})")
                    if exemplo:
                        print(f"    Exemplo: {exemplo}")
                
                # Busca campos de data
                colunas_data = [c for c in dados_dbf['campos'] 
                              if any(kw in c.lower() for kw in ['time', 'data', 'date', 'timestamp'])]
                
                if colunas_data:
                    print(f"\n📅 Campos de Data/Tempo: {colunas_data}")

                resultado['geoespacial'] = {
                    'tipo': 'Shapefile',
                    'total_registros': dados_dbf['total_registros'],
                    'campos': dados_dbf['campos'],
                    'colunas_data': colunas_data,
                    'primeiro_registro': dados_dbf['primeiro_registro']
                }

        # Limpar pasta temporária
        import shutil
        if os.path.exists(pasta_temp):
            shutil.rmtree(pasta_temp)

    except Exception as e:
        print(f"\n❌ Erro ao processar: {e}")
        import traceback
        traceback.print_exc()

    return resultado



def analisar_todos_zips(pasta_dados):
    """
    Analisa todos os arquivos ZIP em uma pasta

    Args:
        pasta_dados: Pasta contendo os arquivos ZIP
    """
    zips = list(Path(pasta_dados).rglob("*.zip"))

    if not zips:
        print(f"❌ Nenhum arquivo ZIP encontrado em: {pasta_dados}")
        return

    print(f"\n🔍 Encontrados {len(zips)} arquivos ZIP para análise\n")

    resultados = []
    for zip_path in zips:
        resultado = analisar_zip_shape(str(zip_path))
        resultados.append(resultado)

    # Salvar resumo em JSON
    pasta_saida = os.path.join(pasta_dados, "..", "utils")
    os.makedirs(pasta_saida, exist_ok=True)
    
    caminho_resumo = os.path.join(pasta_saida, "resumo_shapes_analisados.json")
    with open(caminho_resumo, 'w', encoding='utf-8') as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n\n✅ Resumo salvo em: {caminho_resumo}")


if __name__ == "__main__":
    # Caminho base do projeto
    base_dir = Path(__file__).parent.parent.parent  # Sobe dois níveis de utils
    pasta_dados = base_dir / "automacao_etl" / "dados"

    print("=" * 80)
    print("🔬 UTILITÁRIO DE ANÁLISE DE SHAPES GEOESPACIAIS")
    print("=" * 80)
    print(f"Procurando em: {pasta_dados.absolute()}\n")

    analisar_todos_zips(pasta_dados)

