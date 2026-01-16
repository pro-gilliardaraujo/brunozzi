import os
import sys
import shutil
from datetime import datetime
import pandas as pd
import numpy as np
from openpyxl.utils import get_column_letter

# --- CONFIGURAÇÕES GERAIS ---
# Diretório onde estão os arquivos Excel originais
DIRETORIO_ENTRADA = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\scripts\dados"

# Colunas a serem removidas na etapa 1
COLUNAS_PARA_REMOVER = [
    "Descrição Regional",
    "Descrição da Unidade",
    "Descrição do Grupo de Equipamento",
    "Código da Fazenda",
    "Código da Zona",
    "Código do Talhão",
    "Descrição da Fazenda",
    "Horímetro/Odometro Secundário"
]
# ----------------------------

def validar_diretorio(caminho):
    """Verifica se o diretório de entrada existe."""
    if not os.path.exists(caminho):
        print(f"ERRO: O diretório configurado não existe: {caminho}")
        return False
    return True

def obter_arquivos_xlsx(diretorio):
    """Retorna uma lista de arquivos .xlsx no diretório."""
    arquivos = [
        os.path.join(diretorio, f) 
        for f in os.listdir(diretorio) 
        if f.lower().endswith(".xlsx") and not f.startswith("~$") # Ignora arquivos temporários do Excel
    ]
    return arquivos

def ajustar_largura_colunas(worksheet):
    """
    Ajusta a largura das colunas de uma worksheet baseada no conteúdo.
    """
    for column in worksheet.columns:
        max_length = 0
        column_letter = get_column_letter(column[0].column)
        
        for cell in column:
            try:
                if cell.value:
                    val_len = len(str(cell.value))
                    if val_len > max_length:
                        max_length = val_len
            except:
                pass
        
        # Define um tamanho mínimo e adiciona um pouco de folga
        adjusted_width = (max_length + 2) * 1.2
        # Limita a largura máxima para não ficar excessivamente larga se houver textos gigantes
        if adjusted_width > 100:
            adjusted_width = 100
        worksheet.column_dimensions[column_letter].width = adjusted_width

def tratar_arquivo(caminho_arquivo):
    """
    Abre o arquivo Excel, remove colunas especificadas e salva em uma nova aba.
    """
    print(f"\nIniciando processamento: {os.path.basename(caminho_arquivo)}")
    
    try:
        # Carrega a planilha original 'Plan1'
        # Usamos engine='openpyxl' para garantir compatibilidade
        df_original = pd.read_excel(caminho_arquivo, sheet_name="Plan1", engine="openpyxl")
        
        # Identifica quais colunas da lista realmente existem no arquivo
        colunas_existentes = [col for col in COLUNAS_PARA_REMOVER if col in df_original.columns]
        
        if not colunas_existentes:
            print("  AVISO: Nenhuma das colunas configuradas para remoção foi encontrada.")
            df_tratado = df_original.copy()
        else:
            print(f"  Removendo {len(colunas_existentes)} colunas...")
            df_tratado = df_original.drop(columns=colunas_existentes)

        if "Descrição do Equipamento" in df_tratado.columns:
            desc_series = df_tratado["Descrição do Equipamento"].astype(str)
            mask_colhedora_cana = desc_series.str.strip().str.upper() == "COLHEDORA DE CANA"
            df_tratado.loc[mask_colhedora_cana, "Descrição do Equipamento"] = "COLHEDORA"

        df_calc = df_tratado.copy()

        try:
            df_calc["Data"] = pd.to_datetime(df_calc["Data Hora Local"], dayfirst=True, errors="coerce").dt.date

            df_calc["Hora Inicial"] = df_calc["Hora Inicial"].astype(str)
            df_calc["Hora Final"] = df_calc["Hora Final"].astype(str)

            inicio_str = df_calc["Data Hora Local"].astype(str) + " " + df_calc["Hora Inicial"]
            fim_str = df_calc["Data Hora Local"].astype(str) + " " + df_calc["Hora Final"]

            df_calc["dt_inicial"] = pd.to_datetime(inicio_str, dayfirst=True, errors="coerce")
            df_calc["dt_final"] = pd.to_datetime(fim_str, dayfirst=True, errors="coerce")

            df_calc["Duracao_min"] = (df_calc["dt_final"] - df_calc["dt_inicial"]).dt.total_seconds() / 60

            mask_negativo = df_calc["Duracao_min"] < 0
            df_calc.loc[mask_negativo, "Duracao_min"] += 1440
        except Exception as e:
            print(f"  AVISO: Não foi possível calcular duração (erro de formato de data): {e}")
            df_calc["Duracao_min"] = 0

        if "Duracao_min" in df_calc.columns:
            df_calc["Duracao_h"] = df_calc["Duracao_min"] / 60
            if "Hora Final" in df_tratado.columns:
                try:
                    idx = df_tratado.columns.get_loc("Hora Final") + 1
                    df_tratado.insert(idx, "Duração", df_calc["Duracao_h"])
                except Exception:
                    df_tratado["Duração"] = df_calc["Duracao_h"]

        df_intervalos_cols = []
        for col in [
            "Data",
            "Código Equipamento",
            "Descrição do Equipamento",
            "Código de Operador",
            "Nome",
            "Descrição da Operação",
            "Descrição do Grupo da Operação",
            "Velocidade Média",
        ]:
            if col in df_calc.columns:
                df_intervalos_cols.append(col)

        df_intervalos = df_calc[df_intervalos_cols].copy()
        if "dt_inicial" in df_calc.columns:
            df_intervalos["Início"] = df_calc["dt_inicial"]
        if "dt_final" in df_calc.columns:
            df_intervalos["Fim"] = df_calc["dt_final"]
        if "Duracao_min" in df_calc.columns:
            df_intervalos["Duração (min)"] = df_calc["Duracao_min"]

        grupo_col = "Descrição do Grupo da Operação"
        op_col = "Descrição da Operação"

        df_calc["dur_total"] = df_calc["Duracao_min"]
        df_calc["dur_prod"] = np.where(df_calc.get(grupo_col, "") == "PRODUTIVA", df_calc["Duracao_min"], 0)
        df_calc["dur_improd"] = np.where(df_calc.get(grupo_col, "") == "IMPRODUTIVA", df_calc["Duracao_min"], 0)

        df_calc["dur_manobra"] = np.where(df_calc.get(op_col, "") == "MANOBRA", df_calc["Duracao_min"], 0)
        df_calc["dur_transbordo"] = np.where(df_calc.get(op_col, "") == "TRANSBORDANDO CANA", df_calc["Duracao_min"], 0)
        df_calc["dur_sem_apont"] = np.where(df_calc.get(op_col, "") == "SEM APONTAMENTO", df_calc["Duracao_min"], 0)

        df_calc["dur_colheita"] = np.where(
            df_calc.get(op_col, "").isin(["CARREGANDO CANA", "COLHENDO CANA"]),
            df_calc["Duracao_min"],
            0,
        )
        df_calc["dur_vazio"] = np.where(df_calc.get(op_col, "") == "DESL VAZIO", df_calc["Duracao_min"], 0)
        df_calc["dur_carregado"] = np.where(df_calc.get(op_col, "") == "DESL CARREGADO", df_calc["Duracao_min"], 0)

        vm_series = df_calc.get("Velocidade Média")
        vm = pd.to_numeric(vm_series, errors="coerce").fillna(0) if vm_series is not None else 0

        df_calc["vel_colheita_x_min"] = np.where(df_calc["dur_colheita"] > 0, vm * df_calc["dur_colheita"], 0)
        df_calc["vel_vazio_x_min"] = np.where(df_calc["dur_vazio"] > 0, vm * df_calc["dur_vazio"], 0)
        df_calc["vel_carregado_x_min"] = np.where(df_calc["dur_carregado"] > 0, vm * df_calc["dur_carregado"], 0)

        df_calc["cnt_manobra"] = np.where(df_calc.get(op_col, "") == "MANOBRA", 1, 0)
        df_calc["cnt_transbordo"] = np.where(df_calc.get(op_col, "") == "TRANSBORDANDO CANA", 1, 0)

        col_data = "Data"
        col_equip = "Código Equipamento"
        col_equip_desc = "Descrição do Equipamento"
        col_op_cod = "Código de Operador"
        col_op_nome = "Nome"

        df_dia_frota = pd.DataFrame()
        if all(c in df_calc.columns for c in [col_data, col_equip]):
            group_cols_frota = [c for c in [col_data, col_equip, col_equip_desc] if c in df_calc.columns]
            df_dia_frota = (
                df_calc.groupby(group_cols_frota)
                .agg(
                    dur_total=("dur_total", "sum"),
                    dur_prod=("dur_prod", "sum"),
                    dur_improd=("dur_improd", "sum"),
                    dur_manobra=("dur_manobra", "sum"),
                    dur_transbordo=("dur_transbordo", "sum"),
                    dur_sem_apont=("dur_sem_apont", "sum"),
                    dur_colheita=("dur_colheita", "sum"),
                    dur_vazio=("dur_vazio", "sum"),
                    dur_carregado=("dur_carregado", "sum"),
                    vel_colheita_x_min=("vel_colheita_x_min", "sum"),
                    vel_vazio_x_min=("vel_vazio_x_min", "sum"),
                    vel_carregado_x_min=("vel_carregado_x_min", "sum"),
                    cnt_manobra=("cnt_manobra", "sum"),
                    cnt_transbordo=("cnt_transbordo", "sum"),
                )
                .reset_index()
            )

            df_dia_frota["Horas_Registradas"] = df_dia_frota["dur_total"] / 60
            df_dia_frota["Horas_Produtivas"] = df_dia_frota["dur_prod"] / 60
            df_dia_frota["Horas_Improdutivas"] = df_dia_frota["dur_improd"] / 60
            df_dia_frota["Tempo_Sem_Apontamento_h"] = df_dia_frota["dur_sem_apont"] / 60

            df_dia_frota["Tempo_Manobra_total_min"] = df_dia_frota["dur_manobra"]
            df_dia_frota["Tempo_Manobra_medio_min"] = np.where(
                df_dia_frota["cnt_manobra"] > 0,
                df_dia_frota["dur_manobra"] / df_dia_frota["cnt_manobra"],
                0,
            )

            df_dia_frota["Tempo_Transbordo_total_min"] = df_dia_frota["dur_transbordo"]
            df_dia_frota["Tempo_Transbordo_medio_min"] = np.where(
                df_dia_frota["cnt_transbordo"] > 0,
                df_dia_frota["dur_transbordo"] / df_dia_frota["cnt_transbordo"],
                0,
            )

            df_dia_frota["Vel_Colheita_media"] = np.where(
                df_dia_frota["dur_colheita"] > 0,
                df_dia_frota["vel_colheita_x_min"] / df_dia_frota["dur_colheita"],
                np.nan,
            )
            df_dia_frota["Vel_Desl_Vazio_media"] = np.where(
                df_dia_frota["dur_vazio"] > 0,
                df_dia_frota["vel_vazio_x_min"] / df_dia_frota["dur_vazio"],
                np.nan,
            )
            df_dia_frota["Vel_Desl_Carregado_media"] = np.where(
                df_dia_frota["dur_carregado"] > 0,
                df_dia_frota["vel_carregado_x_min"] / df_dia_frota["dur_carregado"],
                np.nan,
            )

        df_dia_operador = pd.DataFrame()
        if all(c in df_calc.columns for c in [col_data, col_op_cod, col_op_nome]):
            group_cols_op = [col_data, col_op_cod, col_op_nome]
            df_dia_operador = (
                df_calc.groupby(group_cols_op)
                .agg(
                    dur_total=("dur_total", "sum"),
                    dur_prod=("dur_prod", "sum"),
                    dur_improd=("dur_improd", "sum"),
                    dur_manobra=("dur_manobra", "sum"),
                    dur_transbordo=("dur_transbordo", "sum"),
                    dur_sem_apont=("dur_sem_apont", "sum"),
                    dur_colheita=("dur_colheita", "sum"),
                    dur_vazio=("dur_vazio", "sum"),
                    dur_carregado=("dur_carregado", "sum"),
                    vel_colheita_x_min=("vel_colheita_x_min", "sum"),
                    vel_vazio_x_min=("vel_vazio_x_min", "sum"),
                    vel_carregado_x_min=("vel_carregado_x_min", "sum"),
                    cnt_manobra=("cnt_manobra", "sum"),
                    cnt_transbordo=("cnt_transbordo", "sum"),
                )
                .reset_index()
            )

            if col_equip in df_calc.columns:
                frotas = (
                    df_calc.groupby(group_cols_op)[col_equip]
                    .agg(lambda x: ", ".join(str(v) for v in sorted(set(x.dropna()))))
                    .reset_index()
                )
                df_dia_operador = df_dia_operador.merge(frotas, on=group_cols_op, how="left")
                df_dia_operador.rename(columns={col_equip: "Frotas_no_dia"}, inplace=True)

            df_dia_operador["Horas_Registradas"] = df_dia_operador["dur_total"] / 60
            df_dia_operador["Horas_Produtivas"] = df_dia_operador["dur_prod"] / 60
            df_dia_operador["Horas_Improdutivas"] = df_dia_operador["dur_improd"] / 60
            df_dia_operador["Tempo_Sem_Apontamento_h"] = df_dia_operador["dur_sem_apont"] / 60

            df_dia_operador["Tempo_Manobra_total_min"] = df_dia_operador["dur_manobra"]
            df_dia_operador["Tempo_Manobra_medio_min"] = np.where(
                df_dia_operador["cnt_manobra"] > 0,
                df_dia_operador["dur_manobra"] / df_dia_operador["cnt_manobra"],
                0,
            )

            df_dia_operador["Tempo_Transbordo_total_min"] = df_dia_operador["dur_transbordo"]
            df_dia_operador["Tempo_Transbordo_medio_min"] = np.where(
                df_dia_operador["cnt_transbordo"] > 0,
                df_dia_operador["dur_transbordo"] / df_dia_operador["cnt_transbordo"],
                0,
            )

            df_dia_operador["Vel_Colheita_media"] = np.where(
                df_dia_operador["dur_colheita"] > 0,
                df_dia_operador["vel_colheita_x_min"] / df_dia_operador["dur_colheita"],
                np.nan,
            )
            df_dia_operador["Vel_Desl_Vazio_media"] = np.where(
                df_dia_operador["dur_vazio"] > 0,
                df_dia_operador["vel_vazio_x_min"] / df_dia_operador["dur_vazio"],
                np.nan,
            )
            df_dia_operador["Vel_Desl_Carregado_media"] = np.where(
                df_dia_operador["dur_carregado"] > 0,
                df_dia_operador["vel_carregado_x_min"] / df_dia_operador["dur_carregado"],
                np.nan,
            )

        df_periodo_frota = pd.DataFrame()
        if not df_dia_frota.empty and col_data in df_dia_frota.columns:
            group_cols = [c for c in [col_equip, col_equip_desc] if c in df_dia_frota.columns]
            if group_cols:
                df_periodo_frota = (
                    df_dia_frota.groupby(group_cols)
                    .agg(
                        Horas_Registradas_total=("Horas_Registradas", "sum"),
                        Dias_com_dados=(col_data, "nunique"),
                    )
                    .reset_index()
                )
                df_periodo_frota["Horas_media_por_dia"] = np.where(
                    df_periodo_frota["Dias_com_dados"] > 0,
                    df_periodo_frota["Horas_Registradas_total"] / df_periodo_frota["Dias_com_dados"],
                    0,
                )

        df_periodo_operador = pd.DataFrame()
        if not df_dia_operador.empty and col_data in df_dia_operador.columns:
            group_cols = [col_op_cod, col_op_nome]
            df_periodo_operador = (
                df_dia_operador.groupby(group_cols)
                .agg(
                    Horas_Registradas_total=("Horas_Registradas", "sum"),
                    Dias_com_dados=(col_data, "nunique"),
                )
                .reset_index()
            )
            df_periodo_operador["Horas_media_por_dia"] = np.where(
                df_periodo_operador["Dias_com_dados"] > 0,
                df_periodo_operador["Horas_Registradas_total"] / df_periodo_operador["Dias_com_dados"],
                0,
            )

        df_top5 = pd.DataFrame()
        if grupo_col in df_calc.columns and df_calc[grupo_col].notna().any():
            mask_improd = df_calc[grupo_col] == "IMPRODUTIVA"
            if mask_improd.any() and col_equip_desc in df_calc.columns and col_op_cod in df_calc.columns and col_op_nome in df_calc.columns:
                df_improd = (
                    df_calc[mask_improd]
                    .groupby([col_equip_desc, col_op_cod, col_op_nome])
                    .agg(Horas_Improdutivas=("Duracao_min", lambda x: x.sum() / 60))
                    .reset_index()
                )
                df_improd.sort_values(["Descrição do Equipamento", "Horas_Improdutivas"], ascending=[True, False], inplace=True)
                df_top5 = df_improd.groupby(col_equip_desc).head(5).reset_index(drop=True)

        with pd.ExcelWriter(caminho_arquivo, engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
            nome_aba_1 = "1.ColunasRemovidas"
            df_tratado.to_excel(writer, sheet_name=nome_aba_1, index=False)
            ajustar_largura_colunas(writer.sheets[nome_aba_1])

            for sheet_name in writer.book.sheetnames:
                ajustar_largura_colunas(writer.book[sheet_name])

        print(f"  Processamento finalizado para {os.path.basename(caminho_arquivo)}")
        
    except Exception as e:
        print(f"  ERRO ao processar arquivo: {e}")

def main():
    print("=== INICIANDO TRATAMENTO DE DADOS ===")
    print(f"Diretório alvo: {DIRETORIO_ENTRADA}")
    
    if not validar_diretorio(DIRETORIO_ENTRADA):
        sys.exit(1)
        
    arquivos = obter_arquivos_xlsx(DIRETORIO_ENTRADA)
    
    if not arquivos:
        print("Nenhum arquivo .xlsx encontrado na pasta dados.")
        sys.exit(0)
        
    print(f"Encontrados {len(arquivos)} arquivos para processar.")
    
    for arquivo in arquivos:
        try:
            dir_name = os.path.dirname(arquivo)
            _, ext = os.path.splitext(arquivo)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            novo_nome = f"tratado_{timestamp}{ext}"
            novo_caminho = os.path.join(dir_name, novo_nome)
            shutil.copy2(arquivo, novo_caminho)
            print(f"Gerada cópia para tratamento: {os.path.basename(novo_caminho)}")
            tratar_arquivo(novo_caminho)
        except Exception as e:
            print(f"ERRO ao copiar/tratar arquivo {os.path.basename(arquivo)}: {e}")
        
    print("\n=== TRATAMENTO CONCLUÍDO ===")

if __name__ == "__main__":
    main()
