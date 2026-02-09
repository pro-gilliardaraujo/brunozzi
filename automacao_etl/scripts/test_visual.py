import sys
import os
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point
from pathlib import Path
from datetime import datetime, date

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

# Import module with spaces/numbers using importlib
import importlib.util
spec = importlib.util.spec_from_file_location("gerador_mapas", "automacao_etl/scripts/3_GerarMapasFrotas.py")
gerador_mapas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gerador_mapas)

def testar():
    print("🧪 Iniciando Teste Visual...")
    
    # 1. Mock Data (Fake Shapefile data)
    pontos = [
        {'id': 1, 'lat': -23.55, 'lon': -46.63, 'time': '2026-02-04 10:00:00'},
        {'id': 1, 'lat': -23.56, 'lon': -46.64, 'time': '2026-02-04 10:05:00'},
        {'id': 1, 'lat': -23.57, 'lon': -46.65, 'time': '2026-02-04 10:10:00'},
        # Frota 2 (Nearby)
        {'id': 2, 'lat': -23.555, 'lon': -46.635, 'time': '2026-02-04 10:00:00'},
        {'id': 2, 'lat': -23.565, 'lon': -46.645, 'time': '2026-02-04 10:05:00'},
        # Frota 3 (Far away)
        {'id': 3, 'lat': -22.90, 'lon': -43.17, 'time': '2026-02-04 12:00:00'}, # RJ
        {'id': 3, 'lat': -22.91, 'lon': -43.18, 'time': '2026-02-04 12:05:00'},
    ]
    
    df = pd.DataFrame(pontos)
    df['timestamp'] = pd.to_datetime(df['time'])
    gdf = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df.lon, df.lat))
    
    # Mock Mapeamento
    frotas_shapes = {
        '101': gdf[df.id == 1],
        '102': gdf[df.id == 2],
        '201': gdf[df.id == 3]
    }
    
    frotas_json = {
        '101': {date(2026, 2, 4): {'Intervalos': ['fake']}},
        '102': {date(2026, 2, 4): {'Intervalos': ['fake']}},
        '201': {date(2026, 2, 4): {'Intervalos': ['fake']}}
    }
    
    mapeamento = {}
    for fid in frotas_json:
        mapeamento[fid] = {'json': frotas_json[fid], 'shape': frotas_shapes[fid]}
        
    # Output Dir
    pasta_saida = Path("automacao_etl/mapas_teste")
    
    # Run
    try:
        arquivos = gerador_mapas.gerar_mapas_diarios(mapeamento, pasta_saida)
        
        print(f"\n✅ Gerados {len(arquivos)} arquivos.")
        for arq in arquivos:
            print(f"  - {arq}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    testar()
