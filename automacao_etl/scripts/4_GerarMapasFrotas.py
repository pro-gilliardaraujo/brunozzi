"""
3_GerarMapasFrotas.py

Gera mapas interativos Leaflet integrando dados de frotas (JSON) 
com coordenadas geoespaciais (Shapefiles).

Autor: Sistema de Automação ETL
Data: 2026-02-04
"""

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
BASE_DIR = Path(__file__).parent.parent.parent  # Sobe de scripts -> automacao_etl -> brunozzi
PASTA_JSONS = BASE_DIR / "automacao_etl" / "scripts" / "dados" / "separados" / "json" / "colhedora" / "frotas" / "diario"
PASTA_ZIPS = BASE_DIR / "automacao_etl" / "dados"
PASTA_SAIDA = BASE_DIR / "automacao_etl" / "mapas"

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
# MÓDULO 3: GERAÇÃO DE MAPAS
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
        coords = np.array(list(zip(gdf.geometry.y, gdf.geometry.x)))
        if len(coords) > 0:
            todos_pontos.append(coords)
            
    if not todos_pontos:
        return []
        
    todos_pontos_concat = np.vstack(todos_pontos)
    
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


def gerar_mapas_diarios(mapeamento_frotas, pasta_saida, filtro_datas=None):
    """
    Gera um mapa separado para cada dia com dados.
    Se houver clusters distantes, gera arquivos separados por área.
    Implementa visualização limpa para A4 e legenda personalizada.
    Args:
        filtro_datas: set/list de objetos date para filtrar. Se None, processa tudo.
    """
    print("\n🗺️  Gerando mapas diários...")
    pasta_saida.mkdir(parents=True, exist_ok=True)
    
    # 1. Identificar todos os dias disponíveis em todas as frotas
    dias_disponiveis = set()
    for dados in mapeamento_frotas.values():
        dias_disponiveis.update(dados['json'].keys())
    
    if not dias_disponiveis:
        print("  ❌ Nenhuma data encontrada nos dados JSON")
        return []
        
    # Aplica filtro de datas se fornecido
    if filtro_datas:
        dias_originais = len(dias_disponiveis)
        dias_disponiveis = {d for d in dias_disponiveis if d in filtro_datas}
        print(f"  🔍 Filtro de datas ativo: {len(dias_disponiveis)}/{dias_originais} dias selecionados para processamento.")
        if not dias_disponiveis:
             print("  ⚠️ Nenhuma data compatível com o filtro encontrado nos dados.")
             return []
    
    arquivos_gerados = []
    
    # 2. Iterar por dias
    for dia_alvo in sorted(dias_disponiveis):
        str_dia = dia_alvo.strftime('%d-%m-%Y')
        print(f"\n  📅 Processando dia: {str_dia}")
        
        # Pré-filtra dados do dia para todas as frotas
        dados_dia_filtrados = {}
        tem_dados_dia = False
        
        for frota_id, dados in mapeamento_frotas.items():
            # Verifica JSON
            json_dia = dados['json'].get(dia_alvo)
            if not json_dia: continue
            intervalos = json_dia.get('Intervalos', [])
            if not intervalos: continue

            # Filtra Shape
            gdf_dia = filtrar_coordenadas_por_data(dados['shape'], dia_alvo)
            if len(gdf_dia) > 0:
                dados_dia_filtrados[frota_id] = gdf_dia
                tem_dados_dia = True
                print(f"    - Frota {frota_id}: {len(gdf_dia)} pontos")

        if not tem_dados_dia:
            continue

        # 3. Identificar Áreas (Clusters)
        areas = separar_por_clusters(dados_dia_filtrados)
        
        if not areas:
            print("      ⚠️ Nenhum cluster válido encontrado.")
            continue

        # 4. Gerar mapa para CADA ÁREA
        for area in areas:
            nome_area = area['nome']
            print(f"    🗺️  Gerando mapa para {nome_area}...")
            
            centro = area['centro']
            bounds = area['bounds']
            
            # Inicializa mapa
            mapa = criar_mapa_base(centro[0], centro[1])
            mapa.fit_bounds(bounds, padding=(30, 30)) # Padding para garantir margem no A4
            
            # Adiciona camadas das frotas PARA ESTA ÁREA
            camadas_adicionadas = False
            frotas_na_area = [] # Para gerar a legenda
            
            for idx, (frota_id, gdf_dia) in enumerate(sorted(dados_dia_filtrados.items())):
                cor_frota = CORES_FROTAS[idx % len(CORES_FROTAS)]
                
                # Para filtrar espacialmente de forma eficiente:
                # Usa bounding box do cluster + margem de ~1km
                min_lat, min_lon = bounds[0]
                max_lat, max_lon = bounds[1]
                margem = 0.01 
                
                mask_area = (
                    (gdf_dia.geometry.y >= min_lat - margem) & 
                    (gdf_dia.geometry.y <= max_lat + margem) &
                    (gdf_dia.geometry.x >= min_lon - margem) & 
                    (gdf_dia.geometry.x <= max_lon + margem)
                )
                gdf_area = gdf_dia[mask_area]
                
                if len(gdf_area) == 0:
                    continue
                
                camadas_adicionadas = True
                frotas_na_area.append({'id': frota_id, 'cor': cor_frota})
                
                coords_frota = gdf_area.geometry.apply(lambda g: [g.y, g.x]).tolist()
                
                # Linha do trajeto. weight inicial 4, controlado por JS depois.
                folium.PolyLine(
                    locations=coords_frota,
                    color=cor_frota,
                    weight=4,
                    opacity=OPACIDADE_LINHA,
                    popup=None, 
                    tooltip=f"Frota {frota_id}"
                ).add_to(mapa)
                
                # Marcador de INÍCIO
                folium.Marker(
                    location=coords_frota[0],
                    icon=folium.Icon(color=COR_MARCADOR_INICIO, icon='play', prefix='fa'),
                ).add_to(mapa)
                
                # Marcador de FIM
                folium.Marker(
                    location=coords_frota[-1],
                    icon=folium.Icon(color=COR_MARCADOR_FIM, icon='stop', prefix='fa'),
                ).add_to(mapa)

            if not camadas_adicionadas:
                continue

            # --- CUSTOMIZAÇÕES FINAIS ---

            # 1. LEGENDA PERSONALIZADA HTML
            html_legenda_itens = ""
            for item in frotas_na_area:
                html_legenda_itens += f"""
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <div style="width: 15px; height: 15px; background-color: {item['cor']}; margin-right: 8px; border-radius: 3px;"></div>
                    <span style="font-family: sans-serif; font-size: 14px; font-weight: bold; color: #333;">Frota {item['id']}</span>
                </div>
                """
            
            html_legenda = f"""
            <div style="
                position: fixed; 
                bottom: 20px; right: 20px; 
                z-index: 9999; 
                background-color: rgba(255, 255, 255, 0.9); 
                padding: 10px 15px; 
                border-radius: 5px; 
                box-shadow: 0 0 5px rgba(0,0,0,0.3);
                border: 1px solid #ddd;
            ">
                {html_legenda_itens}
                <div style="margin-top:5px; border-top:1px solid #eee; padding-top:5px; font-size:10px; color:#666; text-align:right;">
                    {str_dia} | {nome_area}
                </div>
            </div>
            """
            mapa.get_root().html.add_child(folium.Element(html_legenda))

            # 2. ESPESSURA DE LINHA DINÂMICA (Injeção JS)
            js_espessura = """
            <script>
                function updateLineWeight() {
                    var zoom = map.getZoom();
                    // Zoom IN -> Menor espessura
                    // z10 -> 6
                    // z18 -> 1
                    var newWeight = Math.max(1.5, 13 - 0.7 * zoom);
                    
                    var paths = document.querySelectorAll('path.leaflet-interactive');
                    paths.forEach(function(path) {
                        if (path.getAttribute('stroke-width')) {
                            path.setAttribute('stroke-width', newWeight);
                        }
                    });
                }
                window.addEventListener('load', function() {
                    map.on('zoomend', updateLineWeight);
                    setTimeout(updateLineWeight, 500); // Executa logo apos carregar
                });
            </script>
            """
            mapa.get_root().html.add_child(folium.Element(js_espessura))

            # Nome do arquivo da área
            sufixo_area = f"_{nome_area.replace(' ', '')}" if len(areas) > 1 else ""
            nome_arq = f"mapa_frotas_{str_dia}{sufixo_area}.html"
            path_arq = pasta_saida / nome_arq
            
            mapa.save(str(path_arq))
            arquivos_gerados.append(path_arq)
            print(f"      ✅ Salvo: {nome_arq}")
            
    return arquivos_gerados


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
    config_path = BASE_DIR / "automacao_etl" / "utils" / "config_automacao.json"
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
    
    if not frotas_json:
        print("\n❌ Nenhum dado JSON encontrado!")
        return
    
    if not frotas_shapes:
        print("\n❌ Nenhum shapefile encontrado!")
        return
    
    # 3. Criar mapeamento
    mapeamento = criar_mapeamento_frotas(frotas_json, frotas_shapes)
    
    if not mapeamento:
        print("\n❌ Nenhuma frota com dados completos!")
        return
    
    # 4. Gerar mapas diários
    arquivos = gerar_mapas_diarios(mapeamento, PASTA_SAIDA, filtro_datas=filtro_datas)
    
    if arquivos:
        print("\n" + "=" * 80)
        print(f"✅ SUCESSO! {len(arquivos)} mapas gerados em '{PASTA_SAIDA.name}':")
        for arq in arquivos:
            print(f"  📍 {arq.name}")
        print("=" * 80)
    else:
        print("\n⚠️ Nenhum mapa gerado (possível falta de interseção de datas ou filtro vazio).")

if __name__ == "__main__":
    main()
