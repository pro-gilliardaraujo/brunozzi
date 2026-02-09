"""
3_ExtrairCase.py

Extrai relatórios de máquinas do Case IH FieldOps usando Playwright.
Baseado em código gravado e adaptado para automação robusta.

Autor: Sistema de Automação ETL
Data: 2026-02-08
"""

import json
import os
import time
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

# --- CONFIGURAÇÕES GERAIS ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "dados")
CONFIG_PATH = os.path.join(BASE_DIR, "utils", "config_automacao.json")


def load_config():
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def fechar_overlay_cookies(page):
    """
    Fecha o overlay de cookies OneTrust que bloqueia cliques.
    Tenta múltiplas abordagens: clicar em botões, ocultar via JS.
    """
    print("   🍪 Verificando overlays de cookies...")
    
    # Lista de botões comuns de aceitar cookies
    botoes_aceitar = [
        "#onetrust-accept-btn-handler",  # OneTrust Accept
        ".onetrust-close-btn-handler",   # OneTrust Close
        "button:has-text('ACCEPT ALL')",
        "button:has-text('Aceitar todos')",
        "button:has-text('Accept All')",
        "button:has-text('Aceitar tudo')",
        "#accept-recommended-btn-handler",
        ".ot-pc-refuse-all-handler",
    ]
    
    for seletor in botoes_aceitar:
        try:
            btn = page.locator(seletor).first
            if btn.is_visible():
                print(f"      Clicando em: {seletor}")
                btn.click(timeout=5000)
                page.wait_for_timeout(1000)
                return True
        except:
            pass
    
    # Se nenhum botão funcionar, tenta ocultar via JavaScript
    try:
        page.evaluate("""
            // Remove overlay OneTrust
            const overlay = document.querySelector('.onetrust-pc-dark-filter');
            if (overlay) overlay.style.display = 'none';
            
            const banner = document.querySelector('#onetrust-consent-sdk');
            if (banner) banner.style.display = 'none';
            
            const banner2 = document.querySelector('#onetrust-banner-sdk');
            if (banner2) banner2.style.display = 'none';
        """)
        print("      Overlay removido via JavaScript")
        page.wait_for_timeout(500)
        return True
    except:
        pass
    
    return False


def esperar_elemento(page, locator, descricao, timeout=90000):
    """Aguarda um elemento ficar visível."""
    print(f"   ⏳ Aguardando: {descricao}...")
    try:
        locator.wait_for(state="visible", timeout=timeout)
        print(f"   ✅ Encontrado: {descricao}")
        return True
    except:
        print(f"   ❌ Timeout aguardando: {descricao}")
        return False


def clicar_com_fallback(page, locator, descricao, timeout=30000):
    """
    Tenta clicar normalmente. Se falhar por overlay, fecha overlay e tenta force=True.
    """
    try:
        locator.click(timeout=timeout)
        return True
    except Exception as e:
        if "intercepts pointer events" in str(e):
            print(f"      ⚠️ Overlay bloqueando '{descricao}'. Tentando remover...")
            fechar_overlay_cookies(page)
            try:
                locator.click(timeout=10000, force=True)
                return True
            except:
                pass
        print(f"      ❌ Falha ao clicar em '{descricao}'")
        return False


def selecionar_data_datepicker(page, campo_id, data_alvo):
    """
    Seleciona uma data usando o datetimepicker Bootstrap.
    """
    print(f"   📅 Selecionando data: {data_alvo.strftime('%d/%m/%Y')} no campo {campo_id}")
    
    # Clica no ícone do calendário para abrir o datepicker
    icone = page.locator(f"#{campo_id}").locator("xpath=..").locator(".input-group-addon")
    icone.click()
    page.wait_for_timeout(1000)
    
    mes_alvo = data_alvo.month
    ano_alvo = data_alvo.year
    dia_alvo = data_alvo.day
    
    meses_pt = {
        "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4,
        "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8,
        "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
    }
    
    datepicker = page.locator(".datetimepicker:visible")
    
    max_tentativas = 24
    for _ in range(max_tentativas):
        page.wait_for_timeout(300)
        
        switch = datepicker.locator(".datetimepicker-days .switch")
        texto_switch = switch.text_content().strip()
        
        partes = texto_switch.split()
        if len(partes) >= 2:
            mes_atual_nome = partes[0]
            ano_atual = int(partes[-1])
            mes_atual = meses_pt.get(mes_atual_nome, 0)
            
            print(f"      Datepicker mostra: {mes_atual_nome} {ano_atual} (mês {mes_atual})")
            
            if mes_atual == mes_alvo and ano_atual == ano_alvo:
                print(f"      ✓ Mês/ano correto!")
                break
            
            atual_total = ano_atual * 12 + mes_atual
            alvo_total = ano_alvo * 12 + mes_alvo
            
            if atual_total > alvo_total:
                print(f"      ← Navegando para mês anterior...")
                datepicker.locator(".datetimepicker-days .prev").click()
            else:
                print(f"      → Navegando para próximo mês...")
                datepicker.locator(".datetimepicker-days .next").click()
        else:
            print(f"      ⚠️ Formato não reconhecido: {texto_switch}")
            break
    
    page.wait_for_timeout(500)
    
    dias = datepicker.locator(".datetimepicker-days td.day:not(.old):not(.new)")
    
    encontrou = False
    for i in range(dias.count()):
        dia_elem = dias.nth(i)
        texto_dia = dia_elem.text_content().strip()
        if texto_dia == str(dia_alvo):
            print(f"      Clicando no dia {dia_alvo}...")
            dia_elem.click()
            encontrou = True
            break
    
    if encontrou:
        print(f"   ✅ Data selecionada: {data_alvo.strftime('%d/%m/%Y')}")
    else:
        print(f"   ⚠️ Dia {dia_alvo} não encontrado, tentando fallback...")
        if dias.count() > 0:
            dias.first.click()
    
    page.wait_for_timeout(500)
    return encontrou


def run():
    print("=" * 80)
    print("🚜 EXTRAÇÃO CASE IH FIELDOPS")
    print("=" * 80)

    config = load_config()
    automacao = config['automacao']
    creds = automacao['credenciais']['case']
    username = creds['username']
    senha = creds['senha']

    url_relatorios = "https://fieldops.caseih.com/secure/reportbuilder"

    params = automacao['parametros']
    extrair_semanal = params.get("extrair_semanal", False)
    extrair_ontem = params.get("extrair_ontem", False)

    hoje = datetime.now()
    ontem = hoje - timedelta(days=1)

    if extrair_semanal:
        print("📅 Modo SEMANAL ativado (Últimos 7 dias).")
        dt_final = ontem
        dt_inicial = ontem - timedelta(days=6)
    elif extrair_ontem:
        print("📅 Modo ONTEM ativado.")
        dt_final = ontem
        dt_inicial = ontem
    else:
        str_ini = params.get('data_inicial')
        str_fim = params.get('data_final')
        if str_ini and str_fim:
            print(f"📅 Modo MANUAL ativado: {str_ini} a {str_fim}")
            dt_inicial = datetime.strptime(str_ini, "%d/%m/%Y")
            dt_final = datetime.strptime(str_fim, "%d/%m/%Y")
        else:
            print("📅 Configuração vazia. Usando Fallback (Ontem).")
            dt_final = ontem
            dt_inicial = ontem

    # Nome do relatório: Apenas números e letras (sem underscores, sem espaços)
    data_interesse_str = dt_inicial.strftime("%Y%m%d")
    timestamp_exec = datetime.now().strftime("%H%M%S")
    nome_relatorio = f"Case{data_interesse_str}{timestamp_exec}"

    print(f"🎯 Período de Extração: {dt_inicial.strftime('%d/%m/%Y')} a {dt_final.strftime('%d/%m/%Y')}")
    print(f"📂 Diretório de Download: {DATA_DIR}")
    os.makedirs(DATA_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            slow_mo=500,
            args=["--start-maximized"]
        )
        context = browser.new_context(
            viewport={'width': 1366, 'height': 768},
            accept_downloads=True,
            permissions=["notifications", "geolocation"]
        )
        page = context.new_page()
        page.set_default_timeout(90000)  # 90 segundos de timeout padrão

        try:
            # --- LOGIN ---
            print("\n🔑 Iniciando Login...")
            page.goto(url_relatorios, timeout=90000, wait_until="domcontentloaded")
            page.wait_for_timeout(8000)  # Espera mais para página carregar

            if "sso.cc.cnh.com" in page.url or "adfs" in page.url:
                print("   Detectada página de login CNH.")

                campo_usuario = page.get_by_role("textbox", name="Conta de Usuário")
                if not esperar_elemento(page, campo_usuario, "Campo de Usuário"):
                    return

                campo_usuario.fill(username)
                page.wait_for_timeout(500)

                campo_senha = page.get_by_role("textbox", name="Senha")
                campo_senha.fill(senha)
                page.wait_for_timeout(500)

                btn_login = page.get_by_role("button", name="INÍCIO DE SESSÃO")
                btn_login.click()
                print("   Login submetido. Aguardando...")
                page.wait_for_timeout(15000)  # Mais tempo após login
            else:
                print("   Já logado ou redirecionamento diferente.")

            # --- FECHAR OVERLAYS DE COOKIES ---
            print("\n🍪 Tratando overlays de cookies...")
            page.wait_for_timeout(5000)
            fechar_overlay_cookies(page)
            page.wait_for_timeout(2000)
            fechar_overlay_cookies(page)  # Segunda tentativa

            # --- NAVEGAR PARA ANÁLISE ---
            print("\n📍 Navegando para Análise...")
            link_analise = page.get_by_role("link", name=" Análise")
            
            if esperar_elemento(page, link_analise, "Link Análise", timeout=60000):
                if not clicar_com_fallback(page, link_analise, "Link Análise"):
                    # Fallback: navegar diretamente
                    page.goto(url_relatorios, wait_until="domcontentloaded")
                page.wait_for_timeout(8000)
            else:
                page.goto(url_relatorios, wait_until="domcontentloaded")
                page.wait_for_timeout(8000)

            # Fechar overlays novamente após navegação
            fechar_overlay_cookies(page)

            # --- PREENCHER FORMULÁRIO ---
            print("\n📝 Preenchendo formulário de relatório...")

            # 1. Tipo: Frota/Máquina
            print("   1. Selecionando Tipo: Frota/Máquina")
            dropdown_tipo = page.get_by_role("combobox", name="Agronômico")
            if esperar_elemento(page, dropdown_tipo, "Dropdown Tipo"):
                clicar_com_fallback(page, dropdown_tipo, "Dropdown Tipo")
                page.wait_for_timeout(1000)
                page.locator("#bs-select-23-1").click()
                page.wait_for_timeout(2000)

            # 2. Intervalo de Datas via Datepicker
            print(f"   2. Configurando datas via datepicker...")
            
            selecionar_data_datepicker(page, "dazRepo1Date1", dt_inicial)
            page.wait_for_timeout(1000)
            
            selecionar_data_datepicker(page, "dazRepo1Date2", dt_final)
            page.wait_for_timeout(1000)

            # 3. Nome do Relatório
            print(f"   3. Nome do Relatório: {nome_relatorio}")
            campo_nome = page.locator("#txtReportName")
            if esperar_elemento(page, campo_nome, "Campo Nome"):
                campo_nome.fill(nome_relatorio)
                page.wait_for_timeout(500)

            # 4. Equipamento: Selecionar Tudo
            print("   4. Selecionando Equipamentos: Todos")
            btn_equipamento = page.locator("#rowTelemetryReportVehicle button.multiselect")
            if esperar_elemento(page, btn_equipamento, "Dropdown Equipamento"):
                btn_equipamento.click()
                page.wait_for_timeout(1500)
                selecionar_tudo = page.locator("#rowTelemetryReportVehicle a.multiselect-all")
                if selecionar_tudo.is_visible():
                    selecionar_tudo.click()
                    page.wait_for_timeout(1000)
                # Fechar dropdown clicando no próprio botão novamente
                btn_equipamento.click()
                page.wait_for_timeout(1500)

            # 5. Gerar Exportação
            print("   5. Clicando em 'Gerar Exportação'...")
            btn_gerar = page.locator("#btnRepBuilderGenerateExport")
            if esperar_elemento(page, btn_gerar, "Botão Gerar"):
                # Usar force=True para ignorar elementos sobrepostos
                btn_gerar.click(force=True)
                page.wait_for_timeout(8000)

            # --- DOWNLOAD ---
            print("\n⬇️ (Fase 1/3) Aguardando link de Download aparecer...")
            link_download = page.locator("#btnDownloadUrl")

            max_espera = 300  # 5 minutos
            inicio = time.time()
            link_visivel = False

            while time.time() - inicio < max_espera:
                try:
                    if link_download.is_visible():
                        print("   ✅ Link de download disponível!")
                        link_visivel = True
                        break
                except:
                    pass
                
                # Feedback de progresso a cada 10s
                decorrido = int(time.time() - inicio)
                if decorrido % 10 == 0:
                    print(f"   ⏳ Processando... ({decorrido}s aguardando)")
                page.wait_for_timeout(2000)
            
            if not link_visivel:
                print("❌ Tempo limite atingido aguardando o link de download aparecer. O relatório demorou demais ou falhou.")
                return

            print("   (Fase 2/3) Iniciando clique para baixar...")
            
            # Tenta clicar no download, lidando com overlays se necessário
            try:
                with page.expect_download(timeout=120000) as download_info:
                    clicar_com_fallback(page, link_download, "Botão Download")

                print("   (Fase 3/3) Salvando arquivo...")
                download = download_info.value
                path_final = os.path.join(DATA_DIR, f"{nome_relatorio}.zip")
                print(f"   Salvando em: {path_final}")
                download.save_as(path_final)

                print(f"\n✅ Download concluído com sucesso!")
                print(f"   Arquivo: {path_final}")
                
            except Exception as e:
                print(f"❌ Erro ao baixar ou salvar o arquivo: {e}")


        except Exception as e:
            print(f"\n❌ Erro durante execução: {e}")
            import traceback
            traceback.print_exc()

        finally:
            browser.close()


if __name__ == "__main__":
    run()
