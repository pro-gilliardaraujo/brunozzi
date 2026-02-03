import json
import os
import re
import time
from datetime import datetime
from playwright.sync_api import sync_playwright

ESTADO_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "utils", "processos_opc_case.json")

def load_config():
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "utils", "config_automacao.json")
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

def obter_lista_equipamentos(page):
    """
    Navega para aba Equipamento e extrai lista de equipamentos disponíveis (MUI DataGrid).
    """
    try:
        print("\n🚜 Navegando para aba 'Equipamento'...")
        # Clica na aba Equipamento
        tab_equipamento = page.get_by_role("tab", name="Equipamento")
        tab_equipamento.wait_for(state="visible", timeout=10000)
        tab_equipamento.click()
        page.wait_for_timeout(5000)
        
        print("📋 Extraindo lista de equipamentos...")
        
        # Baseado no snippet do usuário: .MuiDataGrid-root
        grid = page.locator(".MuiDataGrid-root")
        try:
            grid.wait_for(state="visible", timeout=15000)
        except:
             print("Aviso: DataGrid não apareceu. Tentando continuar...")

        # No MUI DataGrid, as linhas têm role="row"
        # Ignora o cabeçalho (que geralmente é a primeira row)
        linhas = page.get_by_role("row")
        num_linhas = linhas.count()
        print(f"   Total de rows encontradas: {num_linhas}")
        
        equipamentos = []
        # Começa de 1 para pular cabeçalho (se houver)
        # Atenção: Precisa verificar se a linha é de dados
        
        for i in range(num_linhas):
            linha = linhas.nth(i)
            try:
                # Pega todas as células da linha
                celulas = linha.get_by_role("gridcell")
                if celulas.count() > 0:
                    # Geralmente a primeira célula tem o nome ou a segunda (checkbox na primeira?)
                    # O snippet do usuário clicou em get_by_role("gridcell", name="MB 560...")
                    # Vamos pegar o texto da primeira célula de texto visível
                    
                    texto_celula = celulas.first.inner_text().strip()
                    
                    # Se for vazio, tenta a segunda (as vezes tem checkbox)
                    if not texto_celula and celulas.count() > 1:
                         texto_celula = celulas.nth(1).inner_text().strip()
                    
                    if texto_celula and texto_celula != "Totais/Médias":
                         # Verifica se é um nome de equipamento válido (não cabeçalho)
                         equipamentos.append({
                            'nome': texto_celula,
                            'linha': linha, # Guarda a referencia da linha inteira
                            'celula': celulas.first # Guarda referencia da celula para clique
                         })
                         print(f"   ✓ Equipamento encontrado: {texto_celula}")
            except Exception as e:
                # Row pode não ser de dados
                continue
        
        print(f"\n✅ Total de equipamentos identificados: {len(equipamentos)}")
        return equipamentos
        
    except Exception as e:
        print(f"❌ Erro ao obter lista de equipamentos: {e}")
        return []

def clicar_voltar_lista(page):
    """Clica para fechar painel ou voltar à lista."""
    try:
        print("\n🔙 Voltando para lista de equipamentos...")
        
        # Tenta fechar o painel lateral (X ou botão de fechar)
        # Snippet do usuário: page.get_by_role("img").first.click() -> provavelmente ícone de fechar
        # Vamos tentar um seletor mais específico para fechar painel
        
        try:
            # Tenta botão de fechar comum em painéis laterais
            fechar_btn = page.locator("button[aria-label='Fechar'], button[title='Fechar']")
            if fechar_btn.is_visible():
                fechar_btn.click()
                print("✅ Painel fechado via botão 'Fechar'")
                page.wait_for_timeout(2000)
                return True
        except:
             pass

        # Tenta breadcrumb como fallback
        breadcrumb = page.locator('[data-testid="drill-in-breadcrumb"]')
        if breadcrumb.count() > 0 and breadcrumb.first.is_visible():
            breadcrumb.first.click()
            page.wait_for_timeout(2000)
            return True
            
        # Fallback do usuário: page.get_by_role("img").first.click() (Arriscado, mas vamos tentar se nada funcionar)
        print("⚠️  Tentando fechar via ícone genérico (fallback do usuário)...")
        page.get_by_role("img").first.click()
        page.wait_for_timeout(2000)
        return True
            
    except Exception as e:
        print(f"❌ Erro ao voltar: {e}")
        # Tenta ESC como último recurso
        page.keyboard.press("Escape")
        return False

def realizar_export(page, nome_arquivo):
    """Realiza o processo de exportação (clicar botões e preencher nome)."""
    try:
        print(f"\n📤 Iniciando exportação: {nome_arquivo}")
        
        btn_compartilhar = page.get_by_role("button", name="Compartilhar/Exportar")
        page.wait_for_timeout(2000)
        
        if not btn_compartilhar.is_enabled():
            print(f"⚠️  Botão de exportar DESABILITADO.")
            return False

        btn_compartilhar.click()
        page.get_by_role("menuitem", name="Dados de Trabalho").click()
        
        frame = page.get_by_role("dialog", name="Compartilhar/Exportar close").locator("iframe").content_frame
        frame.get_by_role("tab", name="Exportar Dados do Trabalho").click()
        
        textbox_nome = frame.get_by_role("textbox", name="Nome do Arquivo")
        textbox_nome.click()
        page.wait_for_timeout(1000)
        
        print(f"   Nome do arquivo: {nome_arquivo}")
        textbox_nome.fill(nome_arquivo)
        
        # Tenta clicar no botão de exportar (várias tentativas como no original)
        try:
            page.locator("div").filter(has_text="Exportar Dados do Trabalho").nth(3).click()
        except:
            pass
            
        page.wait_for_timeout(2000)
        
        try:
            frame.get_by_role("button", name="Exportar Dados do Trabalho").click(timeout=5000)
        except:
             # Fallback
             pass
        
        print("   Aguardando processamento...")
        page.wait_for_timeout(5000)
        
        # Concluído
        try:
            if frame.get_by_role("button", name="Concluído").is_visible():
                frame.get_by_role("button", name="Concluído").click()
                print("✅ Export concluído!")
                page.wait_for_timeout(2000)
                return True
        except:
             pass
             
        # Tenta fechar modal com ESC se não conseguiu clicar
        page.keyboard.press("Escape")
        return True # Assume que iniciou
            
    except Exception as e:
        print(f"❌ Erro no export: {e}")
        return False

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

    # --- 3. ITERAÇÃO POR EQUIPAMENTOS E EXPORTAÇÃO ---
    print("\n" + "="*80)
    print("🚜 INICIANDO ITERAÇÃO POR EQUIPAMENTOS")
    print("="*80)
    
    # Obtém lista de equipamentos
    equipamentos = obter_lista_equipamentos(page)
    
    if not equipamentos:
        print("❌ Nenhum equipamento encontrado! Abortando...")
        return None
    
    arquivos_exportados = []
    
    # Itera por cada equipamento
    for indice_equipamento, equipamento in enumerate(equipamentos):
        print(f"\n{'='*80}")
        print(f"📍 EQUIPAMENTO [{indice_equipamento+1}/{len(equipamentos)}]: {equipamento['nome']}")
        print(f"{'='*80}")
        
        try:
            # Clica no equipamento (célula específica)
            print(f"🖱️  Clicando no equipamento: {equipamento['nome']}")
            
            # Se tivermos a referência direta da célula, usamos ela
            if 'celula' in equipamento:
                 try:
                     equipamento['celula'].click()
                 except:
                     # Fallback: tentar pelo texto na página se a referência ficou stale
                     page.get_by_role("gridcell", name=equipamento['nome']).first.click()
            else:
                 # Fallback antigo
                 equipamento['linha'].click()
                 
            page.wait_for_timeout(3000)
            
            # Extrai nome da frota com Regex (MB + números)
            # Padrão: MB\s*(\d+) -> ex: MB 547 -> MB547
            nome_completo = equipamento['nome']
            match = re.search(r'MB\s*(\d+)', nome_completo, re.IGNORECASE)
            
            if match:
                numero = match.group(1)
                nome_frota_limpo = f"MB{numero}"
            else:
                # Fallback: primeira palavra limpa
                nome_frota_limpo = re.sub(r'[^a-zA-Z0-9]', '', nome_completo.split()[0])
            
            # Substitui Colheita por Colhedora apenas no arquivo
            tipo_operacao_arquivo = tipo_operacao.replace("Colheita", "Colhedora")
            
            # Nome final: Colhedora_MB547
            nome_arquivo = f"{tipo_operacao_arquivo}_{nome_frota_limpo}"
            
            # Realiza export
            sucesso = realizar_export(page, nome_arquivo)
            
            if sucesso:
                arquivos_exportados.append(nome_arquivo + ".zip") # Assume zip
                print(f"✅ Export solicitado para {equipamento['nome']}")
            
            # Volta para lista
            if indice_equipamento < len(equipamentos) - 1:
                if not clicar_voltar_lista(page):
                     # Se falhar voltar, tenta re-navegar para aba
                     page.get_by_role("tab", name="Equipamento").click()
                     page.wait_for_timeout(2000)

        except Exception as e:
            print(f"❌ Erro no equipamento {equipamento['nome']}: {e}")
            try:
                clicar_voltar_lista(page)
            except:
                pass
            continue

    return arquivos_exportados[0] if arquivos_exportados else None

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
