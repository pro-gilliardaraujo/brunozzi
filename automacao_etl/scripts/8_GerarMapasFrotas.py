import os
import json
import re
import zipfile
import geopandas as gpd
import pandas as pd
import numpy as np
import folium
from pathlib import Path
from datetime import datetime, timedelta
from folium import plugins
from sklearn.cluster import DBSCAN

# ============================================================================
# CONFIGURAÇÕES (AJUSTE AQUI)
# ============================================================================

# --- CAMINHOS ---
ETL_DIR = Path(__file__).parent.parent
PASTA_JSONS = ETL_DIR / "dados" / "separados" / "json" / "colhedora" / "frotas" / "diario"
PASTA_ZIPS = ETL_DIR / "dados"
PASTA_SAIDA = ETL_DIR / "mapas"

# --- VISUALIZAÇÃO ---
# Cores para diferenciar frotas no mapa
CORES_FROTAS = [
    '#e74c3c',  # Vermelho
    '#3498db',  # Azul
    '#2ecc71',  # Verde
    '#f39c12',  # Laranja
    '#9b59b6',  # Roxo
    '#1abc9c',  # Turquesa
    '#34495e',  # Cinza escuro
    '#e67e22',  # Laranja escuro
]

# Configurações das Linhas (Trajetos)
ESPESSURA_LINHA_PADRAO = 2      # Espessura inicial das linhas (pixels)
OPACIDADE_LINHA = 0.8           # Transparência da linha (0.0 a 1.0)

# Configurações de Marcadores
RAIO_MARCADOR_INICIO = 6        # Tamanho do pontinho branco no início
COR_MARCADOR_INICIO = 'green'   # Cor do ícone de Play
COR_MARCADOR_FIM = 'red'        # Cor do ícone de Stop

# --- CLUSTERING (SEPARAÇÃO DE ÁREAS) ---
USAR_CLUSTERING = True          # Se True, separa mapas por áreas distantes
DISTANCIA_MAX_CLUSTER_METROS = 5000  # Distância máxima (5km) para considerar mesma área
MIN_PONTOS_CLUSTER = 10         # Mínimo de pontos para formar uma área válida


# ============================================================================
# MÓDULO 1: LEITURA DE DADOS
# ============================================================================

def normalizar_id_frota(identificador):
    """
    Extrai número do identificador de frota
    
    Args:
        identificador: String como "MB547", "235", "Colhedora_MB469.zip"
    
    Returns:
        str: Número normalizado (ex: "547")
    """
    # Remove tudo exceto dígitos
    numeros = re.findall(r'\d+', str(identificador))
    if numeros:
        # Pega o maior número (mais provável de ser o ID)
        return max(numeros, key=len)
    return None


def ler_jsons_frotas(pasta_json):
    """
    Lê todos os arquivos JSON de frotas e agrupa por ID
    
    Args:
        pasta_json: Path para pasta com JSONs diários
    
    Returns:
        dict: {frota_id: {data: dados}}
    """
    print("\n📄 Lendo JSONs de frotas...")
    frotas_dados = {}
    
    if not pasta_json.exists():
        print(f"❌ Pasta não encontrada: {pasta_json}")
        return frotas_dados
    
    arquivos_json = list(pasta_json.glob("*.json"))
    print(f"  Encontrados {len(arquivos_json)} arquivos JSON")
    
    for arquivo in arquivos_json:
        # Extrai data do nome do arquivo (colhedora_frota_DD-MM-YYYY.json)
        match = re.search(r'(\d{2}-\d{2}-\d{4})', arquivo.name)
        if not match:
            continue
        
        data_str = match.group(1)
        data_obj = datetime.strptime(data_str, "%d-%m-%Y").date()
        
        try:
            with open(arquivo, 'r', encoding='utf-8') as f:
                dados = json.load(f)
            
            # Cada JSON tem múltiplas frotas
            for frota_id, info_frota in dados.items():
                if frota_id not in frotas_dados:
                    frotas_dados[frota_id] = {}
                
                frotas_dados[frota_id][data_obj] = info_frota
        
        except Exception as e:
            print(f"  ⚠️ Erro ao ler {arquivo.name}: {e}")
    
    print(f"  ✅ Carregados dados de {len(frotas_dados)} frotas")
    for frota_id in sorted(frotas_dados.keys()):
        num_dias = len(frotas_dados[frota_id])
        print(f"    - Frota {frota_id}: {num_dias} dias")
    
    return frotas_dados


def ler_shapes_frotas(pasta_zips):
    """
    Lê arquivos ZIP com shapefiles e organiza por frota
    
    Args:
        pasta_zips: Path para pasta com ZIPs
    
    Returns:
        dict: {frota_id: GeoDataFrame consolidado}
    """
    print("\n🗺️  Lendo Shapefiles de frotas...")
    shapes_frotas = {}
    
    if not pasta_zips.exists():
        print(f"❌ Pasta não encontrada: {pasta_zips}")
        return shapes_frotas
    
    arquivos_zip = list(pasta_zips.glob("Colhedora_*.zip"))
    print(f"  Encontrados {len(arquivos_zip)} arquivos ZIP")
    
    for arquivo_zip in arquivos_zip:
        # Extrai ID da frota do nome do arquivo
        frota_id = normalizar_id_frota(arquivo_zip.name)
        if not frota_id:
            continue
        
        print(f"\n  📦 Processando {arquivo_zip.name} (Frota {frota_id})...")
        
        try:
            # Lê diretamente do ZIP usando geopandas
            # Geopandas pode ler ZIPs com shapefiles automaticamente
            gdfs = []
            
            # Lista todos os .shp dentro do ZIP
            with zipfile.ZipFile(arquivo_zip, 'r') as zip_ref:
                shapefiles = [name for name in zip_ref.namelist() if name.endswith('.shp')]
            
            # Lê cada shapefile
            for shapefile_path in shapefiles:
                full_path = f"zip://{arquivo_zip}!{shapefile_path}"
                try:
                    gdf = gpd.read_file(full_path)
                    
                    # Converte colunas de tempo para datetime
                    if 'IsoTime' in gdf.columns:
                        gdf['timestamp'] = pd.to_datetime(gdf['IsoTime'])
                    elif 'Time' in gdf.columns:
                        gdf['timestamp'] = pd.to_datetime(gdf['Time'], format='%m/%d/%Y %I:%M:%S %p')
                    
                    gdfs.append(gdf)
                    # print(f"    ✓ {Path(shapefile_path).name}: {len(gdf)} pontos")
                
                except Exception as e:
                    print(f"    ⚠️ Erro ao ler {shapefile_path}: {e}")
                    continue
            
            if gdfs:
                # Concatena todos os shapefiles da frota
                gdf_completo = pd.concat(gdfs, ignore_index=True)
                shapes_frotas[frota_id] = gdf_completo
                print(f"    ✅ Total para frota {frota_id}: {len(gdf_completo):,} pontos")
        
        except Exception as e:
            print(f"    ❌ Erro ao processar ZIP: {e}")
    
    return shapes_frotas
    
def ler_dados_case(pasta_dados):
    """
    Lê o arquivo consolidado da Case IH (Excel) e converte para GeoDataFrame.
    
    Args:
        pasta_dados: Path para pasta com o Excel consolidado
        
    Returns:
        dict: {frota_id: GeoDataFrame}
    """
    print("\n🚜 Lendo dados Case IH (Excel)...")
    dados_case = {}
    
    if not pasta_dados.exists():
        print(f"❌ Pasta não encontrada: {pasta_dados}")
        return dados_case
        
    # Procura o arquivo consolidado mais recente
    arquivos_excel = list(pasta_dados.glob("Consolidado_Case_*.xlsx"))
    if not arquivos_excel:
        print("  ⚠️ Nenhum arquivo 'Consolidado_Case_*.xlsx' encontrado.")
        return dados_case
        
    # Pega o mais recente
    arquivo_recente = max(arquivos_excel, key=os.path.getmtime)
    print(f"  📂 Arquivo encontrado: {arquivo_recente.name}")
    
    try:
        # Lê a aba 'Dados' ou 'Original' (no script de processamento, os dados brutos ficam na aba 'Dados')
        # Mas o script 4_ProcessarCase gera 'Resumo Geral', 'Resumo Diário', 'Dados Detalhados' (antigo Dados)
        # Vamos tentar ler 'Dados Detalhados' ou a primeira aba que tiver Lat/Lon
        
        xls = pd.ExcelFile(arquivo_recente)
        aba_dados = None
        for aba in xls.sheet_names:
            if 'dados' in aba.lower() or 'detalhado' in aba.lower():
                aba_dados = aba
                break
        
        if not aba_dados:
            # Fallback: Tenta achar colunas na primeira aba grande
            aba_dados = xls.sheet_names[0] # Assumindo que pode ser a primeira se não achar nome especifico
            
        print(f"  📄 Lendo aba: {aba_dados}")
        df = pd.read_excel(xls, sheet_name=aba_dados)
        
        # Verifica colunas necessárias
        cols_necessarias = ['Frota', 'Latitude', 'Longitude', 'Data/Hora']
        if not all(col in df.columns for col in cols_necessarias):
            print(f"  ❌ Colunas ausentes no arquivo Case. Necessárias: {cols_necessarias}")
            # Tenta mapear se os nomes estiverem diferentes (ex: lat, lon)
            # Mas o script 4 garante esses nomes.
            return dados_case
            
        # Converter Data/Hora
        df['timestamp'] = pd.to_datetime(df['Data/Hora'], dayfirst=True, errors='coerce')
        df = df.dropna(subset=['timestamp', 'Latitude', 'Longitude'])
        
        # Converter para GeoDataFrame
        gdf_total = gpd.GeoDataFrame(
            df, 
            geometry=gpd.points_from_xy(df['Longitude'], df['Latitude'])
        )
        
        # Agrupar por Frota
        frotas = df['Frota'].unique()
        print(f"  ✅ Encontradas {len(frotas)} frotas Case IH.")
        
        for frota in frotas:
            gdf_frota = gdf_total[gdf_total['Frota'] == frota].copy()
            # Normalizar ID (string)
            frota_id = str(frota).replace('.0', '')
            dados_case[frota_id] = gdf_frota
            # print(f"    - Frota {frota_id}: {len(gdf_frota)} pontos")
            
    except Exception as e:
        print(f"  ❌ Erro ao ler dados Case: {e}")
        
    return dados_case



# ============================================================================
# MÓDULO 2: MATCHING E FILTRO
# ============================================================================

def criar_mapeamento_frotas(frotas_json, frotas_shapes):
    """
    Cria mapeamento entre frotas dos JSONs e Shapes
    
    Args:
        frotas_json: dict com dados JSON
        frotas_shapes: dict com GeoDataFrames
    
    Returns:
        dict: {frota_id: {'json': dados, 'shape': gdf}}
    """
    print("\n🔗 Criando mapeamento de frotas...")
    
    mapeamento = {}
    ids_json = set(frotas_json.keys())
    ids_shapes = set(frotas_shapes.keys())
    
    # Match direto
    ids_comuns = ids_json & ids_shapes
    for frota_id in ids_comuns:
        mapeamento[frota_id] = {
            'json': frotas_json[frota_id],
            'shape': frotas_shapes[frota_id]
        }
    
    print(f"  ✅ {len(mapeamento)} frotas com dados completos (JSON + Shape)")
    
    # Frotas sem correspondência
    sem_shape = ids_json - ids_shapes
    sem_json = ids_shapes - ids_json
    
    if sem_shape:
        print(f"  ⚠️ Frotas com JSON mas sem Shape: {sorted(sem_shape)}")
    if sem_json:
        print(f"  ⚠️ Frotas com Shape mas sem JSON: {sorted(sem_json)}")
    
    return mapeamento


def filtrar_coordenadas_por_data(gdf, data_alvo, intervalos=None):
    """
    Filtra coordenadas que são do dia específico (ignora hora por enquanto para garantir dados)
    """
    if 'timestamp' not in gdf.columns:
        print("      ⚠️ Erro: GDF sem coluna timestamp")
        return gdf[0:0]
    
    try:
        # Garante que timestamp é datetime e extrai a data
        gdf['data_temp'] = gdf['timestamp'].dt.date
        
        # Diagnóstico: (opcional, deixar comentado em prod)
        # datas_unicas = gdf['data_temp'].unique()
        # print(f"      🔍 Datas no Shape: {[d.strftime('%d/%m') for d in datas_unicas]} | Alvo: {data_alvo.strftime('%d/%m')}")
        
        mask = (gdf['data_temp'] == data_alvo)
        filtrado = gdf[mask].copy()
        
        # Remove coluna temporária
        gdf.drop(columns=['data_temp'], inplace=True)
        filtrado.drop(columns=['data_temp'], inplace=True)
        
        return filtrado
        
    except Exception as e:
        print(f"      ⚠️ Erro no filtro de data: {e}")
        return gdf[0:0]


# ============================================================================
# MÓDULO 3: GERAÇÃO DE MAPAS (UNIFICADA)
# ============================================================================

def criar_mapa_base(centro_lat, centro_lon, dados_bounds=None):
    """Cria o objeto mapa base com configurações limpas para A4"""
    mapa = folium.Map(
        location=[centro_lat, centro_lon],
        zoom_start=13,
        tiles=None,
        control_scale=False, # Remove escala padrão
        zoom_control=True    # Mantém zoom interativo (mas discreto)
    )
    
    # Camada Satélite (Esri World Imagery)
    # attr=' ' tenta minimizar, mas o CSS injetado garantirá a remoção visual
    folium.TileLayer(
        tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attr=' ', 
        name='Satélite',
        overlay=False,
        control=False,
        show=True
    ).add_to(mapa)
    
    # Injeção de CSS para limpeza total (Oculta atribuições e controles indesejados se sobrarem)
    css_limpeza = """
    <style>
        .leaflet-control-attribution { display: none !important; }
        .leaflet-control-container .leaflet-top.leaflet-left { top: 10px; left: 10px; } /* Ajuste zoom se necessário */
    </style>
    """
    mapa.get_root().header.add_child(folium.Element(css_limpeza))

    return mapa


def separar_por_clusters(mapeamento_dia_filtrado):
    """
    Identifica clusters geográficos nos dados filtrados do dia.
    Retorna uma lista de bounds/meta-data para cada área.
    """
    print("    🔢 Calculando clusters geoespaciais...")
    
    # Coleta TODOS os pontos do dia de todas as frotas
    todos_pontos = []
    
    for frota_id, gdf in mapeamento_dia_filtrado.items():
        if len(gdf) == 0: continue
        
        # Downsample para clustering se for muito grande
        coords = np.array(list(zip(gdf.geometry.y, gdf.geometry.x)))
        total_pts = len(coords)
        
        if total_pts > 10000:
            # Pega max 10k pontos distribuidos uniformemente
            indices = np.linspace(0, total_pts-1, 10000).astype(int)
            coords_sample = coords[indices]
            if len(coords_sample) > 0:
                todos_pontos.append(coords_sample)
        elif total_pts > 0:
            todos_pontos.append(coords)
            
    if not todos_pontos:
        return []
        
    todos_pontos_concat = np.vstack(todos_pontos)
    print(f"      📍 Clustering em {len(todos_pontos_concat):,} pontos (amostra)...")
    
    if not USAR_CLUSTERING:
        # Retorna cluster único (todos os pontos)
        return [{'id': 0, 'nome': 'Geral', 'pontos': todos_pontos_concat, 'bounds': None, 'centro': [np.mean(todos_pontos_concat[:,0]), np.mean(todos_pontos_concat[:,1])]}]

    # DBSCAN
    # Converte max_dist (metros) para radianos para uso com haversine
    # Raio da Terra ~ 6371km
    kms_per_radian = 6371.0088
    # Convertendo metros para km e depois para radianos
    epsilon = (DISTANCIA_MAX_CLUSTER_METROS / 1000.0) / kms_per_radian
    
    # Executa clustering (coordenadas em radianos para haversine)
    coords_rad = np.radians(todos_pontos_concat)
    db = DBSCAN(eps=epsilon, min_samples=MIN_PONTOS_CLUSTER, metric='haversine', algorithm='ball_tree').fit(coords_rad)
    labels = db.labels_
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    
    if n_clusters == 0:
        # Se só restar ruído ou algo estranho, retorna tudo como um cluster
        print("      ⚠️ Apenas ruído detectado ou cluster único. Gerando área única.")
        return [{'id': 0, 'nome': 'Geral', 'pontos': todos_pontos_concat, 'bounds': None, 'centro': [np.mean(todos_pontos_concat[:,0]), np.mean(todos_pontos_concat[:,1])]}]

    print(f"      ✨ {n_clusters} áreas distintas identificadas.")
    
    clusters_info = []
    unique_labels = set(labels)
    
    for label in unique_labels:
        if label == -1:
            # Ruído - Vamos ignorar ou criar uma área de "Outros"?
            # Por enquanto ignora para mapa limpo
            continue
            
        # Pega pontos deste cluster original (não radianos)
        pontos_cluster = todos_pontos_concat[labels == label]
        
        # Calcula bounds e centro
        lats = pontos_cluster[:, 0]
        lons = pontos_cluster[:, 1]
        
        clusters_info.append({
            'id': int(label),
            'nome': f"Area {label + 1}",
            'bounds': [[np.min(lats), np.min(lons)], [np.max(lats), np.max(lons)]],
            'centro': [np.mean(lats), np.mean(lons)],
            'pontos': pontos_cluster
        })
        
    return clusters_info

def gerar_cor_aleatoria():
    """Gera uma cor hex aleatória"""
    import random
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

def obter_cor_frota(frota_id, cores_persistentes):
    """Retorna cor persistente para a frota ou gera nova"""
    if frota_id not in cores_persistentes:
        cores_persistentes[frota_id] = gerar_cor_aleatoria()
    return cores_persistentes[frota_id]

def criar_mapa_padrao(dados_frotas, titulo_legenda, nome_arquivo, pasta_saida, cores_persistentes):
    """
    Função genérica para criar um mapa com n frotas.
    
    Args:
        dados_frotas: list of dicts {'frota_id': str, 'gdf': GeoDataFrame, 'fonte': str}
        titulo_legenda: str (Ex: "Dia 05/10/2025" ou "Período Completo")
        nome_arquivo: str
        pasta_saida: Path
        cores_persistentes: dict
        
    Returns:
        Path do arquivo salvo ou None
    """
    if not dados_frotas:
        return None
        
    # Calcular centro e bounds globais
    todos_pontos = []
    for item in dados_frotas:
        gdf = item['gdf']
        if len(gdf) > 0:
            todos_pontos.append(np.array(list(zip(gdf.geometry.y, gdf.geometry.x))))
            
    if not todos_pontos:
        return None
        
    todos_pontos_concat = np.vstack(todos_pontos)
    centro = [np.mean(todos_pontos_concat[:,0]), np.mean(todos_pontos_concat[:,1])]
    bounds = [[np.min(todos_pontos_concat[:,0]), np.min(todos_pontos_concat[:,1])], 
              [np.max(todos_pontos_concat[:,0]), np.max(todos_pontos_concat[:,1])]]
              
    # Mapa Base
    mapa = criar_mapa_base(centro[0], centro[1])
    mapa.fit_bounds(bounds, padding=(30, 30))
    
    frotas_na_legenda = []
    
    for item in dados_frotas:
        frota_id = item['frota_id']
        gdf = item['gdf']
        fonte = item['fonte'] # 'Solinftec' ou 'Case'
        
        cor = obter_cor_frota(frota_id, cores_persistentes)
        
        coords = gdf.geometry.apply(lambda g: [g.y, g.x]).tolist()
        
        frotas_na_legenda.append({'id': frota_id, 'cor': cor, 'fonte': fonte})
        
        # Linha
        folium.PolyLine(
            locations=coords,
            color=cor,
            weight=4,
            opacity=0.8,
            tooltip=f"Frota {frota_id} ({fonte})"
        ).add_to(mapa)
        
        # Marcadores Inicio/Fim
        if coords:
            folium.Marker(coords[0], icon=folium.Icon(color='green', icon='play', prefix='fa'), tooltip="Início").add_to(mapa)
            folium.Marker(coords[-1], icon=folium.Icon(color='red', icon='stop', prefix='fa'), tooltip="Fim").add_to(mapa)

    # Legenda HTML
    html_legenda_itens = ""
    for item in sorted(frotas_na_legenda, key=lambda x: x['id']):
        html_legenda_itens += f"""
        <div style="display: flex; align-items: center; margin-bottom: 5px;">
            <div style="width: 15px; height: 15px; background-color: {item['cor']}; margin-right: 8px; border-radius: 3px;"></div>
            <span style="font-family: sans-serif; font-size: 14px; color: #333;">Frota {item['id']} <small style='color:#666'>({item['fonte']})</small></span>
        </div>
        """
    
    html_legenda = f"""
    <div style="
        position: fixed; bottom: 20px; right: 20px; z-index: 9999; 
        background-color: rgba(255, 255, 255, 0.9); padding: 10px 15px; 
        border-radius: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.3); border: 1px solid #ddd;
    ">
        <div style="font-weight:bold; margin-bottom:5px; border-bottom:1px solid #ccc;">{titulo_legenda}</div>
        {html_legenda_itens}
    </div>
    """
    mapa.get_root().html.add_child(folium.Element(html_legenda))
    
    # Salvar
    path_arq = pasta_saida / nome_arquivo
    mapa.save(str(path_arq))
    print(f"      ✅ Salvo: {nome_arquivo}")
    return path_arq

def gerar_mapas_padronizados(mapeamento_solinftec, dados_case, pasta_saida, filtro_datas=None):
    """
    Gera mapas diários e de período completo para todas as fontes.
    Gera também um index_mapas.json.
    """
    print("\n🗺️  Gerando mapas padronizados...")
    pasta_saida.mkdir(parents=True, exist_ok=True)
    
    cores_persistentes = {} # {frota_id: hex}
    mapas_gerados = [] # Lista para o JSON index
    
    # 1. Coletar todas as datas e frotas disponíveis
    todas_datas = set()
    
    # Datas Solinftec
    for dados in mapeamento_solinftec.values():
        todas_datas.update(dados['json'].keys())
        
    # Datas Case
    for gdf in dados_case.values():
        if 'timestamp' in gdf.columns:
            todas_datas.update(gdf['timestamp'].dt.date.unique())
            
    if filtro_datas:
        todas_datas = {d for d in todas_datas if d in filtro_datas}
        
    if not todas_datas:
        print("  ❌ Nenhuma data disponível para gerar mapas.")
        return []

    # 2. Mapas Diários (Iterar Dias -> Areas)
    # Obs: Clustering por área simplicado: Vamos agrupar tudo que for do dia por enquanto,
    # ou usar a lógica de clustering se tiver muitos pontos distantes.
    # Para simplificar e atender o "implemente logo", vamos gerar 1 MAPA POR DIA (Visão Geral)
    # Se precisar de áreas especificas (clustering), mantemos a logica antiga, mas agora misturando fontes.
    
    for dia_alvo in sorted(todas_datas):
        str_dia = dia_alvo.strftime('%d-%m-%Y')
        print(f"\n  📅 Processando dia: {str_dia}")
        
        # Coletar dados do dia de AMBAS as fontes
        dados_dia = [] # Lista de {'frota_id', 'gdf', 'fonte'}
        
        # Solinftec
        for frota_id, dados in mapeamento_solinftec.items():
            # Verifica JSON (se operou no dia)
            if dia_alvo in dados['json']:
                # Recorta Shape
                gdf_dia = filtrar_coordenadas_por_data(dados['shape'], dia_alvo)
                if len(gdf_dia) > 0:
                    dados_dia.append({'frota_id': frota_id, 'gdf': gdf_dia, 'fonte': 'Solinftec'})
        
        # Case
        for frota_id, gdf_total in dados_case.items():
            # Filtra dia no gdf total
            # (Assumindo timestamp datetime)
            if 'timestamp' not in gdf_total.columns: continue
            
            gdf_dia = gdf_total[gdf_total['timestamp'].dt.date == dia_alvo].copy()
            if len(gdf_dia) > 0:
                dados_dia.append({'frota_id': frota_id, 'gdf': gdf_dia, 'fonte': 'Case IH'})
                
        if not dados_dia:
            continue
            
        # Clustering do dia (para ver quantas áreas gera)
        # Montar dict temporario para usar a funcao separar_por_clusters existente?
        # A funcao espera {frota: gdf}. Vamos adaptar.
        dict_para_cluster = {f"{item['frota_id']}_{i}": item['gdf'] for i, item in enumerate(dados_dia)}
        areas = separar_por_clusters(dict_para_cluster)
        
        for area in areas:
            # Filtrar dados que caem nesta área
            dados_area = []
            bounds = area['bounds']
            min_lat, min_lon = bounds[0]
            max_lat, max_lon = bounds[1]
            margem = 0.02
            
            for item in dados_dia:
                gdf = item['gdf']
                # Clip rápido (bounding box)
                mask = (
                    (gdf.geometry.y >= min_lat - margem) & (gdf.geometry.y <= max_lat + margem) &
                    (gdf.geometry.x >= min_lon - margem) & (gdf.geometry.x <= max_lon + margem)
                )
                gdf_cut = gdf[mask]
                if len(gdf_cut) > 0:
                    dados_area.append({'frota_id': item['frota_id'], 'gdf': gdf_cut, 'fonte': item['fonte']})
            
            if not dados_area: continue
            
            nome_arq = f"mapa_{str_dia}_{area['nome'].replace(' ', '')}.html"
            path = criar_mapa_padrao(dados_area, f"{str_dia} - {area['nome']}", nome_arq, pasta_saida, cores_persistentes)
            
            if path:
                mapas_gerados.append({
                    'arquivo': nome_arq,
                    'data': str_dia,
                    'tipo': 'DIARIO',
                    'area': area['nome'],
                    'frotas': [d['frota_id'] for d in dados_area]
                })

    # 3. Mapas de Período Completo (Por Frota? Por Área?)
    # O usuário pediu "periodo completo". Geralmente é melhor por Frota individual ou Visão Geral da Safra.
    # Vamos gerar um "Geralzao" de todo o período por Área.
    print(f"\n  🌎 Gerando mapas de Período Completo...")
    
    # Coletar TODO o dado de uma vez
    dados_periodo = []
    
    # Solinftec (Filtrar só dias do periodo se filtro ativo)
    for frota_id, dados in mapeamento_solinftec.items():
        # Pega shape total, filtra datas
        gdf = dados['shape']
        if filtro_datas:
             gdf = gdf[gdf['timestamp'].dt.date.isin(filtro_datas)]
        if len(gdf) > 0:
            dados_periodo.append({'frota_id': frota_id, 'gdf': gdf, 'fonte': 'Solinftec'})
            
    # Case
    for frota_id, gdf in dados_case.items():
        if filtro_datas:
             gdf = gdf[gdf['timestamp'].dt.date.isin(filtro_datas)]
        if len(gdf) > 0:
            dados_periodo.append({'frota_id': frota_id, 'gdf': gdf, 'fonte': 'Case IH'})

    if dados_periodo:
        # Clustering Global
        dict_para_cluster_global = {f"{item['frota_id']}_{i}": item['gdf'] for i, item in enumerate(dados_periodo)}
        areas_globais = separar_por_clusters(dict_para_cluster_global)
        
        for area in areas_globais:
            # Filtrar dados
            dados_area_global = []
            bounds = area['bounds']
            min_lat, min_lon = bounds[0]
            max_lat, max_lon = bounds[1]
            margem = 0.05
            
            for item in dados_periodo:
                 gdf = item['gdf']
                 mask = (
                    (gdf.geometry.y >= min_lat - margem) & (gdf.geometry.y <= max_lat + margem) &
                    (gdf.geometry.x >= min_lon - margem) & (gdf.geometry.x <= max_lon + margem)
                 )
                 gdf_cut = gdf[mask]
                 if len(gdf_cut) > 0:
                    dados_area_global.append({'frota_id': item['frota_id'], 'gdf': gdf_cut, 'fonte': item['fonte']})
            
            if not dados_area_global: continue
            
            nome_arq = f"mapa_PERIODO_COMPLETO_{area['nome'].replace(' ', '')}.html"
            path = criar_mapa_padrao(dados_area_global, f"PERIODO COMPLETO - {area['nome']}", nome_arq, pasta_saida, cores_persistentes)
             
            if path:
                mapas_gerados.append({
                    'arquivo': nome_arq,
                    'data': 'PERIODO',
                    'tipo': 'PERIODO',
                    'area': area['nome'],
                    'frotas': [d['frota_id'] for d in dados_area_global]
                })

    # 4. Salvar Index JSON
    json_index_path = pasta_saida / "index_mapas.json"
    with open(json_index_path, 'w', encoding='utf-8') as f:
        json.dump(mapas_gerados, f, indent=4)
    print(f"\n  index_mapas.json gerado com {len(mapas_gerados)} mapas.")
    
    return [Path(m['arquivo']) for m in mapas_gerados]

    # (Fim da substituição de gerar_mapas_diarios)



# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 80)
    print("🚜 GERADOR DE MAPAS DE FROTAS (DIÁRIO)")
    print("=" * 80)
    
    # Validação do sklearn
    try:
        from sklearn.cluster import DBSCAN
    except ImportError:
        print("\n❌ ERRO CRÍTICO: scikit-learn não instalado.")
        print("   Por favor execute: pip install scikit-learn")
        return

    # 1. Carregar configuração e definir filtro de datas
    config_path = ETL_DIR / "utils" / "config_automacao.json"
    filtro_datas = None
    
    if config_path.exists():
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                
            params = config.get("automacao", {}).get("parametros", {})
            extrair_semanal = params.get("extrair_semanal", False)
            extrair_ontem = params.get("extrair_ontem", False)
            
            hoje = datetime.now().date()
            ontem = hoje - timedelta(days=1)
            
            if extrair_semanal:
                print("📅 Configuração: Modo SEMANAL (Últimos 7 dias).")
                filtro_datas = set()
                for i in range(7):
                    dia = ontem - timedelta(days=i)
                    filtro_datas.add(dia)
            elif extrair_ontem:
                print("📅 Configuração: Modo ONTEM.")
                filtro_datas = {ontem}
            else:
                str_ini = params.get('data_inicial')
                str_fim = params.get('data_final')
                if str_ini and str_fim:
                    print(f"📅 Configuração: Modo MANUAL ({str_ini} a {str_fim}).")
                    try:
                        dt_ini = datetime.strptime(str_ini, "%d/%m/%Y").date()
                        dt_fim = datetime.strptime(str_fim, "%d/%m/%Y").date()
                        filtro_datas = set()
                        curr = dt_ini
                        while curr <= dt_fim:
                            filtro_datas.add(curr)
                            curr += timedelta(days=1)
                    except ValueError:
                        print("⚠️ Erro ao fazer parse das datas manuais. Tentando processar tudo (ou fallback).")
                else:
                    print("📅 Nenhuma data configurada. Usando fallback: ONTEM.")
                    filtro_datas = {ontem}
                    
        except Exception as e:
            print(f"⚠️ Erro ao ler configuração: {e}")
            
    else:
        print("⚠️ Arquivo de configuração não encontrado. Processando tudo.")

    # 2. Carregar dados
    frotas_json = ler_jsons_frotas(PASTA_JSONS)
    frotas_shapes = ler_shapes_frotas(PASTA_ZIPS)
    dados_case = ler_dados_case(PASTA_ZIPS) # Case fica na mesma pasta de dados brutos/zips
    
    if not frotas_json and not dados_case:
        print("\n❌ Nenhum dado de evento (JSON) ou dado Case encontrado!")
        return
    
    # 3. Criar mapeamento (Solinftec only)
    # Case não precisa de match JSON+Shape
    mapeamento_solinftec = {}
    if frotas_json and frotas_shapes:
        mapeamento_solinftec = criar_mapeamento_frotas(frotas_json, frotas_shapes)
    else:
        print("\n⚠️ Pulos mapeamento Solinftec (falta JSON ou Shape). focando em Case se houver.")
        
    if not mapeamento_solinftec and not dados_case:
        print("\n❌ Nenhuma frota com dados completos para gerar mapa!")
        return
    
    # 4. Gerar mapas padronizados
    arquivos = gerar_mapas_padronizados(mapeamento_solinftec, dados_case, PASTA_SAIDA, filtro_datas=filtro_datas)
    
    if arquivos:
        print("\n" + "=" * 80)
        print(f"✅ SUCESSO! {len(arquivos)} mapas gerados em '{PASTA_SAIDA.name}':")
        for arq in arquivos:
            print(f"  📍 {arq.name}")
        print("=" * 80)
        for zip_path in PASTA_ZIPS.glob("Colhedora_*.zip"):
            try:
                zip_path.unlink()
                print(f"🧹 Shape removido: {zip_path.name}")
            except Exception as e:
                print(f"⚠️ Falha ao remover {zip_path.name}: {e}")
    else:
        print("\n⚠️ Nenhum mapa gerado.")

if __name__ == "__main__":
    main()
