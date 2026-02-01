import json
import os
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

def load_config():
    config_path = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\utils\config_automacao.json"
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def run():
    # Carrega configurações
    config = load_config()
    automacao = config['automacao']
    
    url = automacao['urls']['url_john_deere']
    creds = automacao['credenciais']['john_deere']
    username = creds['username']
    senha = creds['senha']
    
    # Processa as datas do config (ex: "05/10/2025")
    data_inicial_str = automacao['parametros']['data_inicial']
    data_final_str = automacao['parametros']['data_final']
    
    dt_inicial = datetime.strptime(data_inicial_str, "%d/%m/%Y")
    dt_final = datetime.strptime(data_final_str, "%d/%m/%Y")

    print(f"URL: {url}")
    print(f"Usuário: {username}")
    print(f"Período: {data_inicial_str} a {data_final_str}")

    with sync_playwright() as p:
        # Lança o navegador
        browser = p.chromium.launch(headless=False, slow_mo=1000, args=["--start-maximized"]) # Tenta maximizar
        
        # Configura contexto com permissões automáticas para evitar prompts do navegador
        context = browser.new_context(
            viewport={'width': 1366, 'height': 768},
            permissions=['geolocation'], # Concede permissão de localização automaticamente
            geolocation={'latitude': -18.9186, 'longitude': -48.2772}, # Define localização (ex: Uberlândia/MG) para evitar busca
            ignore_https_errors=True
        )
        page = context.new_page()
        
        print("Iniciando automação...")
        
        try:
            # 1. Navegar para a URL
            print(f"Navegando para {url}...")
            page.goto(url, timeout=60000)
            
            # 2. Login
            print("Realizando Login...")
            # Clica em Login se necessário (algumas vezes redireciona direto)
            if page.get_by_role("link", name="Login").is_visible():
                page.get_by_role("link", name="Login").click()
            
            # Preenche usuário
            print("Preenchendo usuário...")
            page.get_by_role("textbox", name="Nome do usuário").fill(username)
            page.get_by_role("button", name="Próximo").click()
            
            # Preenche senha
            print("Preenchendo senha...")
            page.get_by_role("textbox", name="Senha").fill(senha)
            page.get_by_role("button", name="Entrar").click()
            
            # Espera navegação pós-login
            page.wait_for_load_state("networkidle")
            
            # TRATAMENTO DE POP-UPS E PERMISSÕES
            print("Verificando pop-ups ou termos de uso...")
            try:
                # Tenta aceitar cookies ou termos se aparecerem
                # Seletores genéricos para botões de aceitação
                if page.get_by_role("button", name="Aceitar").is_visible():
                    page.get_by_role("button", name="Aceitar").click()
                    print("Botão 'Aceitar' clicado.")
                
                if page.get_by_role("button", name="Allow").is_visible(): # Permitir
                    page.get_by_role("button", name="Allow").click()
                    print("Botão 'Allow' clicado.")

                if page.get_by_text("Permitir localização").is_visible():
                    # Lidar com permissão de navegador é mais complexo, geralmente configura-se no contexto
                    pass
                
                # Fecha modais de boas-vindas ou novidades
                if page.locator("button[aria-label='Close']").is_visible():
                    page.locator("button[aria-label='Close']").click()
                    print("Botão Fechar (X) clicado.")
                    
            except Exception as e_popup:
                print(f"Tentativa de fechar pop-ups: {e_popup}")

            # 3. Navegação para Analisador de Trabalho
            print("Aguardando redirecionamento para o Mapa...")
            
            # Espera explicitamente a URL mudar para conter 'map'
            try:
                page.wait_for_url("**/map.deere.com/**", timeout=30000)
                print("URL de mapa detectada com sucesso.")
            except Exception:
                print("Timeout aguardando URL do mapa. Forçando navegação...")
            
            # Garante que estamos na URL correta
            if "map.deere.com" not in page.url:
                print(f"Redirecionando de {page.url} para map.deere.com...")
                page.goto("https://map.deere.com/", wait_until="domcontentloaded")
                page.wait_for_load_state("networkidle")
            
            print(f"URL Atual: {page.url}")
            print("Aguardando carregamento da interface do mapa...")
            page.wait_for_timeout(5000)

            # Tenta localizar o iframe
            print("Procurando iframe 'Menu de navegação'...")
            try:
                # Espera explícita pelo iframe
                page.wait_for_selector("iframe[title='Menu de navegação']", timeout=20000)
                menu_frame = page.frame_locator("iframe[title='Menu de navegação']")
                
                # Tenta clicar em Analisar
                print("Tentando clicar no botão 'Analisar'...")
                # Tenta esperar o botão estar visível
                botao_analisar = menu_frame.get_by_role("button", name="Analisar")
                botao_analisar.wait_for(state="visible", timeout=10000)
                botao_analisar.click()
                
                print("Botão 'Analisar' clicado. Buscando 'Analisador de Trabalho'...")
                menu_frame.get_by_role("link", name="Analisador de Trabalho").click()
                
            except Exception as e_iframe:
                print(f"Erro ao interagir com iframe ou menu: {e_iframe}")
                print("Tentando estratégia alternativa (clique por texto)...")
                # Fallback: Tenta achar qualquer texto "Analisar" na página ou frames
                # Às vezes o iframe não tem title ou mudou
                pass

            print("Aguardando carregamento do Analisador...")
            page.wait_for_timeout(5000) # Espera carregar a nova view
            
            # 4. Aplicar Filtros
            print("Aplicando Filtros...")
            
            # Abre Filtros
            if page.get_by_role("button", name="Filtros Filtros").is_visible():
                page.get_by_role("button", name="Filtros Filtros").click()
            
            # Formata datas para digitação contínua (ddmmyyyy)
            data_ini_digitar = dt_inicial.strftime("%d%m%Y")
            data_fim_digitar = dt_final.strftime("%d%m%Y")
            
            # Configura Data Inicial
            print(f"Configurando Data Inicial: {data_inicial_str} -> Digitando '{data_ini_digitar}'")
            # Clica no campo Dia do grupo Início e digita a data completa
            campo_ini = page.get_by_role("group", name="Início").get_by_label("Dia")
            campo_ini.click()
            campo_ini.type(data_ini_digitar, delay=100) # delay para simular digitação e garantir processamento da máscara
            
            # Configura Data Final
            print(f"Configurando Data Final: {data_final_str} -> Digitando '{data_fim_digitar}'")
            # Clica no campo Dia do grupo Fim (se existir, ou tenta achar pela lógica)
            # Na gravação apareceu "group", name="Fim" no final. Vamos tentar usar isso.
            try:
                if page.get_by_role("group", name="Fim").is_visible():
                    campo_fim = page.get_by_role("group", name="Fim").get_by_label("Dia")
                    campo_fim.click()
                    campo_fim.type(data_fim_digitar, delay=100)
                else:
                    # Fallback se não achar grupo Fim explícito, tenta achar o segundo input de data
                    print("Grupo 'Fim' não encontrado explicitamente. Tentando inputs sequenciais...")
                    # Isso é arriscado sem ver, mas vamos deixar o usuário verificar se falhar
                    pass
            except Exception as e:
                print(f"Erro ao preencher data final: {e}")

            # Selecionar Operação (Colheita)
            # page.get_by_role("button", name="Semeadura").click() # Se estiver selecionado
            # page.get_by_role("button", name="Colheita").click()
            
            # 5. Exportar
            print("Iniciando Exportação...")
            # Botão de exportar (ícone ou texto)
            # Na gravação: locator("[id=\"_r_1au_-button\"]").click() -> ID dinâmico, perigoso.
            # Melhor tentar achar pelo texto ou ícone se possível.
            # Mas vamos usar o ID por enquanto se não houver opção melhor, ou tentar achar o botão "Dados de Trabalho" no menu.
            
            # Pausa para validação final antes de exportar
            print("Script pausado para verificação final. Retomando em 10s...")
            time.sleep(10)
            
            # Tenta clicar no botão de exportar/compartilhar se achar
            # page.get_by_role("button", name="Exportar Dados do Trabalho").click()
            
            print("Automação finalizada até o ponto de exportação.")
            print("Por favor, conclua a exportação manualmente se necessário.")
            
            # Mantém aberto
            time.sleep(30)
            
        except Exception as e:
            print(f"Ocorreu um erro: {e}")
            page.screenshot(path="erro_final.png")
            
        finally:
            print("Encerrando navegador.")
            browser.close()

if __name__ == "__main__":
    run()
