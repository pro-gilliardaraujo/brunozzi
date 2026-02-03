import json
import os
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

ESTADO_FILE = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\utils\processos_opc_case.json"

def load_config():
    config_path = r"c:\Users\arauj\OneDrive\Área de Trabalho\testes\brunozzi\automacao_etl\utils\config_automacao.json"
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def carregar_estado_processo():
    if os.path.exists(ESTADO_FILE):
        try:
            with open(ESTADO_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {"processo_id": "", "arquivos_esperados": [], "arquivos_baixados": []}

def salvar_estado_processo(estado):
    with open(ESTADO_FILE, 'w', encoding='utf-8') as f:
        json.dump(estado, f, indent=4)

def limpar_estado_processo():
    estado_vazio = {"processo_id": "", "arquivos_esperados": [], "arquivos_baixados": []}
    salvar_estado_processo(estado_vazio)

def monitorar_e_baixar_arquivos(page, arquivos_esperados):
    """
    Monitora a aba 'Outros' em Files e baixa os arquivos esperados.
    Persiste estado e aguarda arquivos aparecerem.
    """
    print(f"\n--- INICIANDO MONITORAMENTO DE ARQUIVOS ---")
    
    # Carrega ou inicia estado
    estado = carregar_estado_processo()
    
    # Se não houver processo ativo ou for diferente, atualiza
    # (Assumindo que se chamou essa função, é o processo atual)
    # Mescla arquivos esperados atuais com os do estado se necessário
    if not estado["processo_id"]:
        estado["processo_id"] = datetime.now().strftime("%Y%m%d_%H%M")
    
    for arq in arquivos_esperados:
        if arq not in estado["arquivos_esperados"]:
            estado["arquivos_esperados"].append(arq)
    
    salvar_estado_processo(estado)
    
    arquivos_pendentes = [a for a in estado["arquivos_esperados"] if a not in estado["arquivos_baixados"]]
    
    if not arquivos_pendentes:
        print("Nenhum arquivo pendente para monitorar.")
        return

    print(f"Arquivos pendentes: {arquivos_pendentes}")

    try:
        print("Navegando para Files Manager...")
        if "files.deere.com" not in page.url:
            page.goto("https://files.deere.com/", wait_until="domcontentloaded")
            page.wait_for_timeout(5000)
        
        # Loop de monitoramento
        tentativa = 0
        while arquivos_pendentes:
            tentativa += 1
            print(f"\n--- Ciclo de Verificação {tentativa} ---")
            print(f"Hora atual: {datetime.now().strftime('%H:%M:%S')}")
            
            # Garante aba Outros
            print("Acessando aba 'Outros'...")
            try:
                page.get_by_role("tab", name="Outros").click()
            except:
                page.get_by_text("Outros").click()
            
            page.wait_for_timeout(5000) # Espera lista carregar
            
            novos_downloads = []
            
            for arquivo_nome in arquivos_pendentes:
                print(f"Procurando por: {arquivo_nome}")
                
                # Procura na lista (contendo o nome gerado)
                # O nome na lista pode ter extensão .zip ou .xls
                # Estrutura observada: div[data-field="fileName"] span span span text
                # Usaremos get_by_text com correspondência parcial
                
                elemento_arquivo = page.get_by_text(arquivo_nome)
                
                if elemento_arquivo.first.is_visible():
                    print(f"Arquivo ENCONTRADO: {arquivo_nome}")
                    
                    try:
                        # 1. Clica no arquivo para selecionar/abrir detalhes
                        print(f"Selecionando arquivo: {arquivo_nome}")
                        elemento_arquivo.first.click()
                        page.wait_for_timeout(2000)

                        # 2. Clica em "Baixar Arquivo" (Botão que abre a modal de escolha)
                        print("Tentando clicar no botão de iniciar download...")
                        
                        # Tenta encontrar o botão de download (pode ser "Baixar Arquivo", "Download", ou ícone)
                        # Baseado no relato do usuário, existe um passo intermediário antes da modal de tipo
                        
                        btn_download_inicial = None
                        if page.get_by_role("button", name="Baixar Arquivo").is_visible():
                            btn_download_inicial = page.get_by_role("button", name="Baixar Arquivo")
                        elif page.get_by_text("Baixar Arquivo").is_visible():
                            btn_download_inicial = page.get_by_text("Baixar Arquivo")
                        elif page.get_by_role("button", name="Download").is_visible(): # Fallback comum
                            btn_download_inicial = page.get_by_role("button", name="Download")
                        
                        if btn_download_inicial:
                            btn_download_inicial.click()
                        else:
                            print("AVISO: Botão 'Baixar Arquivo' não encontrado explicitamente. Tentando fluxo direto ou buscando ícone...")
                            # Pode ser que o clique na linha já abra, ou precise de outro seletor.
                            # Se não achar, tenta prosseguir caso a modal já tenha aberto.
                        
                        page.wait_for_timeout(2000)

                        # 3. Modal "Que tipo de arquivo gostaria de baixar?"
                        # HTML: <h6 ...>Que tipo de arquivo gostaria de baixar?</h6>
                        if page.get_by_text("Que tipo de arquivo gostaria de baixar?").is_visible():
                            print("Modal de seleção de tipo detectada.")
                            
                            # Garante ZIP selecionado (data-testid="zip-radio")
                            try:
                                page.get_by_test_id("zip-radio").click()
                            except:
                                pass
                                
                            print("Confirmando download na modal...")
                            # Botão final "Baixar" na modal
                            with page.expect_download(timeout=60000) as download_info:
                                page.get_by_role("button", name="Baixar").click()
                                
                            download = download_info.value
                            caminho_final = os.path.join("dados", download.suggested_filename)
                            os.makedirs("dados", exist_ok=True)
                            download.save_as(caminho_final)
                            
                            print(f"Download concluído com SUCESSO: {caminho_final}")
                            estado["arquivos_baixados"].append(arquivo_nome)
                            novos_downloads.append(arquivo_nome)
                            salvar_estado_processo(estado)
                        else:
                            print("Modal de tipo de arquivo NÃO apareceu. Verifique se o botão de download foi clicado corretamente.")
                        
                    except Exception as e:
                        print(f"Erro ao tentar baixar {arquivo_nome}: {e}")
                else:
                    print(f"Arquivo {arquivo_nome} ainda não visível na lista.")
            
            # Atualiza lista de pendentes
            arquivos_pendentes = [a for a in estado["arquivos_esperados"] if a not in estado["arquivos_baixados"]]
            
            if not arquivos_pendentes:
                print("Todos os arquivos foram baixados!")
                break
            
            print(f"Arquivos restantes: {arquivos_pendentes}")
            print("Aguardando 30 segundos para próxima verificação...")
            print("Pressione Ctrl+C no terminal para interromper se necessário.")
            
            # Espera 30 segundos
            time.sleep(30)
            
            print("Atualizando página...")
            page.reload()
            page.wait_for_timeout(5000)

    except Exception as e:
        print(f"Erro no monitoramento: {e}")
        # Salva estado atual antes de sair
        salvar_estado_processo(estado)

    # Limpa estado se tudo concluído
    if not arquivos_pendentes:
        print("Processo finalizado com sucesso. Limpando estado.")
        limpar_estado_processo()

def configurar_filtros_e_exportar(page, tipo_operacao, dt_inicial, dt_final, operacao_anterior=None):
    print(f"\n>>> INICIANDO OPERAÇÃO: {tipo_operacao} (Anterior: {operacao_anterior}) <<<")
    nome_final = None
    
    # --- 0. GARANTIA DE ESTADO ---
    try:
        if page.get_by_role("dialog").is_visible():
            print("Fechando modal remanescente...")
            page.keyboard.press("Escape")
            page.wait_for_timeout(1000)
    except:
        pass

    # --- 1. SELEÇÃO DA OPERAÇÃO ---
    try:
        print("Tentando abrir seletor de operações...")
        seletor = page.get_by_test_id("operation-selector").get_by_test_id("multiselect-button")
        seletor.wait_for(state="visible", timeout=10000)
        seletor.click(force=True)
        page.wait_for_timeout(1000)
        
        print(f"Tentando selecionar atual: {tipo_operacao}")
        botoes_atual = page.get_by_role("button", name=tipo_operacao)
        
        if botoes_atual.count() == 0:
            print(f"Role exato falhou para {tipo_operacao}. Tentando match parcial de texto...")
            botoes_atual = page.locator(f"text={tipo_operacao}")
        
        if botoes_atual.count() > 0:
             count_clicks = 0
             for i in range(botoes_atual.count()):
                 if botoes_atual.nth(i).is_visible():
                     botoes_atual.nth(i).click()
                     count_clicks += 1
                     print(f"Clique de seleção em {tipo_operacao} (índice {i})")
        else:
             print(f"Botão {tipo_operacao} não encontrado no menu.")
        
        print("Fechando seletor...")
        seletor.click(force=True)
        page.wait_for_timeout(1000)
        
    except Exception as e:
         print(f"ERRO CRÍTICO na seleção da operação: {e}")
         page.keyboard.press("Escape")

    # --- 2. FILTROS DE DATA ---
    print("Configurando datas...")
    try:
        page.get_by_role("button", name="Filtros Filtros").click()
        
        print(f"Digitando data inicial: {dt_inicial.strftime('%d%m%Y')}")
        page.get_by_role("group", name="Início").get_by_label("Dia").click()
        page.get_by_role("group", name="Início").get_by_label("Dia").type(dt_inicial.strftime("%d%m%Y"), delay=150)
        page.get_by_role("group", name="Início").get_by_label("Dia").press("Tab")
        
        if page.get_by_text("DD").is_visible():
            print(f"Digitando data final: {dt_final.strftime('%d%m%Y')}")
            page.get_by_text("DD").click()
            page.get_by_text("DD").type(dt_final.strftime("%d%m%Y"), delay=150)
            
        if page.locator("div").filter(has_text="Apagar TudoConcluído").nth(3).is_visible():
             page.locator("div").filter(has_text="Apagar TudoConcluído").nth(3).click()
        
        page.get_by_role("button", name="Concluído").click()
        
        print("Aguardando carregamento dos dados após filtro (5s)...")
        page.wait_for_timeout(5000)
        
        if page.get_by_text("Sem Informações Operacionais").is_visible():
            print(f"ALERTA: 'Sem Informações Operacionais' detectado para {tipo_operacao}. Pulando...")
            return None
        
    except Exception as e:
        print(f"Erro nos filtros de data: {e}")

    # --- 3. EXPORTAÇÃO ---
    print("Iniciando exportação...")
    try:
        btn_compartilhar = page.get_by_role("button", name="Compartilhar/Exportar")
        page.wait_for_timeout(2000)
        
        if not btn_compartilhar.is_enabled():
            print(f"AVISO: Botão de exportar DESABILITADO para {tipo_operacao}. Provavelmente não há dados neste período.")
            return None

        btn_compartilhar.click()
        page.get_by_role("menuitem", name="Dados de Trabalho").click()
        
        frame = page.get_by_role("dialog", name="Compartilhar/Exportar close").locator("iframe").content_frame
        frame.get_by_role("tab", name="Exportar Dados do Trabalho").click()
        
        textbox_nome = frame.get_by_role("textbox", name="Nome do Arquivo")
        textbox_nome.click()
        page.wait_for_timeout(1000)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        nome_final = f"Export_{timestamp}_{tipo_operacao}"
        
        print(f"Definindo nome do arquivo: {nome_final}")
        textbox_nome.fill(nome_final)
        
        # --- CÓDIGO GRAVADO PELO USUÁRIO ---
        try:
            page.locator("div").filter(has_text="Exportar Dados do Trabalho").nth(3).click()
        except:
            pass
            
        print("Aguardando botão habilitar...")
        page.wait_for_timeout(3000)
        
        print("Clicando em Exportar Dados do Trabalho...")
        try:
            page.get_by_role("button", name="Exportar Dados do Trabalho").click(timeout=5000)
        except:
            print("Tentativa via role falhou, tentando seletor CSS no botão...")
            page.locator("button[title='Exportar Dados do Trabalho']").click(timeout=5000)
        
        print("Aguardando processamento (5s)...")
        page.wait_for_timeout(5000)
        
        try:
            page.locator("div").filter(has_text="ConcluídoIr para Arquivos").nth(3).click()
        except:
            pass
        
        if page.get_by_role("button", name="Concluído").is_visible():
             print("Clicando em Concluído...")
             page.get_by_role("button", name="Concluído").click()
             
        print("Pausa visual de 5s após conclusão da exportação...")
        page.wait_for_timeout(5000)
            
    except Exception as e:
        print(f"Erro na exportação: {e}")
        
    return nome_final

def run():
    # Limpa estado de execuções anteriores para evitar contaminação
    limpar_estado_processo()

    config = load_config()
    automacao = config['automacao']
    url = automacao['urls']['url_john_deere']
    creds = automacao['credenciais']['john_deere']
    username = creds['username']
    senha = creds['senha']
    dt_inicial = datetime.strptime(automacao['parametros']['data_inicial'], "%d/%m/%Y")
    dt_final = datetime.strptime(automacao['parametros']['data_final'], "%d/%m/%Y")
    
    tipos_operacao = automacao['parametros'].get('tipos_operacao', ["Colheita", "Semeadura", "Aplicação", "Preparo do Solo"])

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=1000, args=["--start-maximized"])
        context = browser.new_context(viewport={'width': 1366, 'height': 768}, permissions=['geolocation'])
        page = context.new_page()
        
        try:
            print(f"Navegando para {url}...")
            page.goto(url, timeout=60000)
            if page.get_by_role("link", name="Login").is_visible():
                page.get_by_role("link", name="Login").click()
            page.get_by_role("textbox", name="Nome do usuário").fill(username)
            page.get_by_role("button", name="Próximo").click()
            page.get_by_role("textbox", name="Senha").fill(senha)
            page.get_by_role("button", name="Entrar").click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(5000)
            
            if "map.deere.com" not in page.url:
                page.goto("https://map.deere.com/", wait_until="domcontentloaded")
            
            page.wait_for_timeout(5000)
            try:
                menu_frame = page.frame_locator("iframe[title='Menu de navegação']")
                menu_frame.get_by_role("button", name="Analisar").click()
                menu_frame.get_by_role("link", name="Analisador de Trabalho").click()
            except:
                pass 
            page.wait_for_timeout(5000)

            arquivos_capturados = []
            operacao_anterior = None
            
            # Recupera arquivos já esperados do estado (caso restart)
            estado = carregar_estado_processo()
            if estado["arquivos_esperados"]:
                arquivos_capturados.extend(estado["arquivos_esperados"])

            # --- PROCESSAMENTO SEQUENCIAL ---
            
            for operacao in ["Colheita", "Semeadura", "Aplicação", "Preparo do Solo"]:
                if operacao in tipos_operacao:
                    # Verifica se já foi gerado neste processo (evita duplicar se restartar)
                    # Simplificação: Se já tem arquivo com sufixo da operação no estado, pula?
                    # Por enquanto, roda tudo para garantir.
                    
                    nome = configurar_filtros_e_exportar(page, operacao, dt_inicial, dt_final, operacao_anterior)
                    operacao_anterior = operacao
                    if nome: 
                        arquivos_capturados.append(nome)
                        # Salva estado parcial
                        estado["arquivos_esperados"] = list(set(arquivos_capturados)) # Unico
                        salvar_estado_processo(estado)
                        
                    print("Aguardando 5s antes da próxima operação...")
                    time.sleep(5)

            print(f"Arquivos gerados/esperados: {arquivos_capturados}")
            
            # Chama monitoramento
            monitorar_e_baixar_arquivos(page, arquivos_capturados)
            
        except Exception as e:
            print(f"Erro Geral: {e}")
            page.pause()
        finally:
            browser.close()

if __name__ == "__main__":
    run()
