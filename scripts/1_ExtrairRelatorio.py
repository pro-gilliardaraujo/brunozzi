import os
import time
import json
import logging
import traceback
import sys
import shutil

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    WebDriverException,
    SessionNotCreatedException,
)

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
logs_dir = os.path.join(base_dir, "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(
            os.path.join(logs_dir, "extrair_relatorio.log"),
            encoding="utf-8",
            mode="w",
        ),
        logging.StreamHandler(sys.stdout),
    ],
)

XPATHS = {
    "login": {
        "username": "/html/body/div[1]/div/div/div/div/form/fieldset/section[1]/label[2]/input",
        "password": "/html/body/div[1]/div/div/div/div/form/fieldset/section[2]/label[2]/input",
        "submit_button": "/html/body/div[1]/div/div/div/div/form/footer/button",
        "timeout": 10,
    },
    "navegacao": {
        "menu_relatorios": "//*[@id='left-panel']/div/nav/ul/li[5]/a",
        "menu_gerador_relatorios": "//*[@id='left-panel']/div/nav/ul/li[5]/ul/li[3]/a",
    },
    "assistente_geracao": {
        "tipo_relatorio": "//*[@id='filter-dropdown-button-1']",
        "opcao_tipo_relatorio": "//*[@id='reportTypeField']/div/div/div[1]/ul/li[10]",
        "relatorio": "//*[@id='filter-dropdown-button-2']",
        "opcao_relatorio": "//*[@id='reportInfoField']/div/div/div[1]/ul/li[2]",
        "botao_proximo": "//*[@id='tabsReport']/div/div[1]/div/div[2]/button",
    },
    "selecao_equipamentos": {
        "botao_selecionar_inicio": '//*[@id="tabsReport"]/div/div[2]/div/div[1]/div/div/span/button',
        "botao_selecionar_tudo_unidade": '/html/body/div[1]/div/div/div[2]/div[1]/div[3]/div[1]/multi-select/div/div[1]/div/label',  
        "botao_selecionar_tudo_frente": '/html/body/div[1]/div/div/div[2]/div[1]/div[3]/div[2]/multi-select/div/div[1]/div/label',  
        "lista_tipo_equipamento": '/html/body/div[1]/div/div/div[2]/div[1]/div[3]/div[3]/multi-select/div/div[2]', 
        "botao_selecionar_tudo_frota": '/html/body/div[1]/div/div/div[2]/div[1]/div[3]/div[4]/multi-select/div/div[1]/div/label',
        "botao_selecionar": "/html/body/div[1]/div/div/div[2]/div[2]/button[2]",
        "botao_proximo": '//*[@id="tabsReport"]/div/div[2]/div/div[2]/button[2]'
    },
    "parametros": {
        "data_inicial": '//*[@id="tabsReport"]/div/div[5]/div/div[1]/div[1]/div/date-range-selector/div/div[1]/div/div/span/button',
        "data_inicial_calendario":'/html/body/div[7]/ul',
        "data_final": '//*[@id="tabsReport"]/div/div[5]/div/div[1]/div[1]/div/date-range-selector/div/div[2]/div/div/span/button',
        "data_final_calendario":'/html/body/div[8]/ul',
        "tipo_arquivo": '//*[@id="filter-dropdown-button-3"]',
        "tipo_arquivo_opcao": '//*[@id="fileTypeField"]/div/div/div[1]/ul/li[3]/a',
        "botao_gerar": '//*[@id="tabsReport"]/div/div[2]/div/div[2]/button[2]'
    }
}


def preparar_perfil_selenium():
    if sys.platform.startswith("win"):
        local_appdata = os.environ.get("LOCALAPPDATA", "")
        if local_appdata:
            base_chrome = os.path.join(local_appdata, "Google", "Chrome")
        else:
            base_chrome = os.path.join(
                os.path.expanduser("~"), "AppData", "Local", "Google", "Chrome"
            )
    elif sys.platform == "darwin":
        base_chrome = os.path.join(
            os.path.expanduser("~"),
            "Library",
            "Application Support",
            "Google",
            "Chrome",
        )
    else:
        base_chrome = os.path.join(
            os.path.expanduser("~"), ".config", "google-chrome"
        )

    origem = os.path.join(base_chrome, "User Data")
    destino = os.path.join(base_chrome, "User Data Selenium")
    marcador = os.path.join(destino, ".perfil_copiado_ok")

    if os.path.exists(marcador):
        logging.info("Perfil Selenium já preparado.")
        return destino

    if not os.path.exists(origem):
        logging.error(f"Perfil original não encontrado: {origem}")
        return destino

    logging.info(
        "Copiando perfil padrão do Chrome para pasta 'User Data Selenium'."
    )
    logging.info("Certifique-se de que o Chrome está fechado durante a cópia.")

    try:
        shutil.copytree(origem, destino, dirs_exist_ok=True)
        with open(marcador, "w", encoding="utf-8") as f:
            f.write("ok")
        logging.info("Cópia do perfil concluída.")
    except Exception as e:
        logging.error(f"Erro ao copiar perfil: {e}")

    return destino


def carregar_configuracoes():
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        logging.info(f"Base de configuração: {base_dir}")

        caminho_config = os.path.join(base_dir, "utils", "config_automacao.json")
        if not os.path.exists(caminho_config):
            logging.error(f"Arquivo não encontrado: {caminho_config}")
            return None

        logging.info(f"Lendo: {caminho_config}")
        with open(caminho_config, "r", encoding="utf-8") as f:
            config_geral = json.load(f)

        url_login = config_geral["automacao"]["urls"]["url_login"]
        logging.info(f"URL de login identificada: {url_login}")

        return config_geral
    except Exception as e:
        logging.error(f"Erro crítico ao carregar configurações: {e}")
        logging.error(traceback.format_exc())
        return None


def abrir_navegador_com_perfil_padrao(config=None):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define pasta de download (padrão 'dados' ou via config)
    nome_pasta_download = "dados"
    if config:
        try:
            nome_pasta_download = config["automacao"]["parametros"].get("download_dir", "dados")
        except KeyError:
            pass
            
    download_path = os.path.join(base_dir, nome_pasta_download)
    os.makedirs(download_path, exist_ok=True)
    logging.info(f"Pasta de download configurada: {download_path}")

    logging.info("Configurando Chrome com perfil clonado para Selenium.")

    chrome_options = Options()
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    chrome_options.add_argument("--disable-infobars")
    chrome_options.add_experimental_option("detach", True)

    prefs = {
        "download.default_directory": download_path,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True,
    }
    chrome_options.add_experimental_option("prefs", prefs)

    user_data_dir = preparar_perfil_selenium()
    chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
    chrome_options.add_argument("--profile-directory=Default")

    logging.info(f"User Data Dir Selenium: {user_data_dir}")
    logging.info("Abrindo Chrome com o perfil clonado, incluindo extensões.")

    try:
        driver = webdriver.Chrome(options=chrome_options)
    except SessionNotCreatedException as e:
        logging.error("Falha ao iniciar Chrome com perfil clonado.")
        logging.error(str(e))
        logging.info("Tentando iniciar Chrome com perfil padrão (sem clone).")

        chrome_options_fallback = Options()
        chrome_options_fallback.add_argument(
            "--disable-blink-features=AutomationControlled"
        )
        chrome_options_fallback.add_experimental_option(
            "excludeSwitches", ["enable-automation"]
        )
        chrome_options_fallback.add_experimental_option(
            "useAutomationExtension", False
        )
        chrome_options_fallback.add_argument("--disable-infobars")
        chrome_options_fallback.add_experimental_option("detach", True)
        chrome_options_fallback.add_experimental_option("prefs", prefs)

        driver = webdriver.Chrome(options=chrome_options_fallback)

    driver.execute_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    logging.info("Chrome aberto com perfil padrão real.")
    return driver


def abrir_url(driver, url, timeout=20):
    logging.info(f"Navegando para: {url}")
    try:
        driver.get(url)
        logging.info("Comando de navegação enviado.")
    except Exception as e:
        logging.error(f"Erro ao tentar navegar para {url}: {e}")
        return

    limite = time.time() + timeout
    while time.time() < limite:
        try:
            estado = driver.execute_script("return document.readyState")
            if estado == "complete":
                logging.info("Página carregada (readyState=complete).")
                break
        except Exception:
            pass
        time.sleep(0.5)

    logging.info(f"Título da página atual: {driver.title}")


def fazer_login(driver, config):
    dados_gerais = config["automacao"]
    dados_login = XPATHS["login"]

    url_login = dados_gerais["urls"]["url_login"]
    usuario = dados_gerais["credenciais"]["username"]
    senha = dados_gerais["credenciais"]["senha"]

    logging.info("--- Iniciando processo de login ---")
    abrir_url(driver, url_login, timeout=25)

    espera = WebDriverWait(driver, dados_login.get("timeout", 10))

    try:
        logging.info("Procurando campo de usuário...")
        campo_usuario = espera.until(
            EC.visibility_of_element_located((By.XPATH, dados_login["username"]))
        )
        logging.info("Campo de usuário encontrado. Preenchendo.")
        campo_usuario.clear()
        campo_usuario.send_keys(usuario)

        logging.info("Procurando campo de senha...")
        campo_senha = espera.until(
            EC.visibility_of_element_located((By.XPATH, dados_login["password"]))
        )
        campo_senha.clear()
        campo_senha.send_keys(senha)

        logging.info("Procurando botão de entrar...")
        botao_entrar = espera.until(
            EC.element_to_be_clickable((By.XPATH, dados_login["submit_button"]))
        )
        botao_entrar.click()
        logging.info("Botão de entrar clicado.")

        logging.info("Aguardando transição de tela...")
        time.sleep(5)
    except TimeoutException:
        logging.warning("Tempo esgotado procurando campos de login.")
        logging.warning(
            "Verifique se a página carregou, se os XPaths estão corretos ou se você já está logado."
        )
        logging.info(f"URL atual: {driver.current_url}")
    except Exception as e:
        logging.error(f"Erro durante o login: {e}")
        logging.error(traceback.format_exc())


def ir_para_tela_de_relatorios(driver):
    dados_nav = XPATHS["navegacao"]
    espera = WebDriverWait(driver, 10)

    logging.info("--- Iniciando navegação pelos menus ---")

    try:
        if dados_nav.get("menu_relatorios"):
            logging.info(f"Buscando menu Relatórios: {dados_nav['menu_relatorios']}")
            menu_relatorios = espera.until(
                EC.element_to_be_clickable((By.XPATH, dados_nav["menu_relatorios"]))
            )
            menu_relatorios.click()
            logging.info("Menu Relatórios clicado.")
            time.sleep(2)

        if dados_nav.get("menu_gerador_relatorios"):
            logging.info(
                f"Buscando Gerador de Relatórios: {dados_nav['menu_gerador_relatorios']}"
            )
            menu_gerador = espera.until(
                EC.element_to_be_clickable(
                    (By.XPATH, dados_nav["menu_gerador_relatorios"])
                )
            )
            menu_gerador.click()
            logging.info("Gerador de Relatórios clicado.")
            time.sleep(2)

        logging.info("Navegação de menus finalizada com sucesso.")
    except Exception as e:
        logging.error(f"Falha na navegação dos menus: {e}")
        logging.error(traceback.format_exc())


def preencher_assistente_geracao(driver):
    dados_assistente = XPATHS["assistente_geracao"]
    espera = WebDriverWait(driver, 10)

    logging.info("--- Iniciando preenchimento do Assistente de Geração ---")

    try:
        # 1. Selecionar Tipo de Relatório
        logging.info("Abrindo dropdown 'Tipo de Relatório'...")
        dropdown_tipo = espera.until(
            EC.element_to_be_clickable((By.XPATH, dados_assistente["tipo_relatorio"]))
        )
        dropdown_tipo.click()
        time.sleep(1)

        logging.info("Selecionando opção de Tipo de Relatório...")
        opcao_tipo = espera.until(
            EC.element_to_be_clickable(
                (By.XPATH, dados_assistente["opcao_tipo_relatorio"])
            )
        )
        opcao_tipo.click()
        logging.info("Tipo de Relatório selecionado.")
        time.sleep(2)

        # 2. Selecionar Relatório
        logging.info("Abrindo dropdown 'Relatório'...")
        dropdown_relatorio = espera.until(
            EC.element_to_be_clickable((By.XPATH, dados_assistente["relatorio"]))
        )
        dropdown_relatorio.click()
        time.sleep(1)

        logging.info("Selecionando opção de Relatório...")
        opcao_relatorio = espera.until(
            EC.element_to_be_clickable((By.XPATH, dados_assistente["opcao_relatorio"]))
        )
        opcao_relatorio.click()
        logging.info("Relatório selecionado.")
        time.sleep(2)

        # 3. Clicar em Próximo
        logging.info("Clicando em 'Próximo'...")
        botao_prox = espera.until(
            EC.element_to_be_clickable((By.XPATH, dados_assistente["botao_proximo"]))
        )
        botao_prox.click()
        logging.info("Botão 'Próximo' clicado.")
        time.sleep(3)

        logging.info("Assistente de geração preenchido com sucesso.")

    except Exception as e:
        logging.error(f"Erro ao preencher assistente de geração: {e}")
        logging.error(traceback.format_exc())


def selecionar_equipamentos(driver, config):
    dados_selecao = XPATHS["selecao_equipamentos"]
    cfg_selecao = config["automacao"]["selecao_equipamentos"]
    espera = WebDriverWait(driver, 10)

    logging.info("--- Iniciando seleção de equipamentos ---")

    try:
        botao_inicio = dados_selecao.get("botao_selecionar_inicio")
        if botao_inicio:
            try:
                logging.info("Clicando no botão de início de seleção de equipamentos.")
                btn_inicio = espera.until(
                    EC.element_to_be_clickable((By.XPATH, botao_inicio))
                )
                btn_inicio.click()
                time.sleep(1)
            except Exception as e:
                logging.warning(f"Não foi possível clicar no botão inicial de seleção: {e}")

        if cfg_selecao.get("unidade") == "Selecionar Tudo":
            xpath_unidade = dados_selecao.get("botao_selecionar_tudo_unidade")
            if xpath_unidade:
                logging.info("Selecionando todas as unidades.")
                btn_unidade = espera.until(
                    EC.element_to_be_clickable((By.XPATH, xpath_unidade))
                )
                btn_unidade.click()
                time.sleep(1)

        if cfg_selecao.get("frente") == "Selecionar Tudo":
            xpath_frente = dados_selecao.get("botao_selecionar_tudo_frente")
            if xpath_frente:
                logging.info("Selecionando todas as frentes.")
                btn_frente = espera.until(
                    EC.element_to_be_clickable((By.XPATH, xpath_frente))
                )
                btn_frente.click()
                time.sleep(1)

        tipos_config = cfg_selecao.get("tipo_equipamento", [])
        if tipos_config:
            lista_xpath = dados_selecao.get("lista_tipo_equipamento")
            if lista_xpath:
                logging.info(
                    f"Tipos de equipamento desejados (config): {', '.join(tipos_config)}"
                )

                container = espera.until(
                    EC.presence_of_element_located((By.XPATH, lista_xpath))
                )

                def normalizar_texto(s):
                    return " ".join(s.split()).lower()

                alvos_normalizados = {normalizar_texto(t) for t in tipos_config}
                logging.info(
                    f"Alvos normalizados: {', '.join(sorted(alvos_normalizados))}"
                )

                checkboxes = container.find_elements(By.CSS_SELECTOR, "div.checkbox")
                logging.info(f"Total de checkboxes encontrados: {len(checkboxes)}")

                for cb in checkboxes:
                    try:
                        label = cb.find_element(By.TAG_NAME, "label")
                    except Exception:
                        logging.warning("Checkbox sem label, ignorando.")
                        continue

                    # Captura o texto completo do label
                    # Evita a lógica de spans que estava duplicando hífens (ex: "53 - - Caminhão")
                    combinado = label.text.strip()
                    if not combinado:
                        # Tenta via atributo se .text falhar (elemento oculto ou similar)
                        combinado = label.get_attribute("textContent").strip()

                    # Remove hífens duplicados se houver (segurança extra)
                    combinado = combinado.replace(" - - ", " - ")

                    chave = normalizar_texto(combinado)
                    logging.info(
                        f"Checkbox encontrado: combinado='{combinado}', normalizado='{chave}'"
                    )

                    if chave not in alvos_normalizados:
                        continue

                    logging.info(f"Match com config, selecionando: {combinado}")

                    alvo_click = label
                    try:
                        if not alvo_click.is_displayed():
                            driver.execute_script(
                                "arguments[0].scrollIntoView(true);", alvo_click
                            )
                            time.sleep(0.5)

                        if alvo_click.is_enabled():
                            alvo_click.click()
                            logging.info(f"Clique realizado em: {combinado}")
                            time.sleep(1.0)
                    except Exception as e:
                        logging.warning(
                            f"Falha ao clicar na opção de equipamento '{combinado}': {e}"
                        )

        if cfg_selecao.get("frota") == "Selecionar Tudo":
            xpath_frota = dados_selecao.get("botao_selecionar_tudo_frota")
            if xpath_frota:
                logging.info("Selecionando todas as frotas.")
                btn_frota = espera.until(
                    EC.element_to_be_clickable((By.XPATH, xpath_frota))
                )
                btn_frota.click()
                time.sleep(1)

        # Clicar em "Selecionar" (Confirmar seleção)
        xpath_botao_selecionar = dados_selecao.get("botao_selecionar")
        if xpath_botao_selecionar:
            logging.info("Confirmando seleção de equipamentos (Botão Selecionar)...")
            btn_selecionar = espera.until(
                EC.element_to_be_clickable((By.XPATH, xpath_botao_selecionar))
            )
            btn_selecionar.click()
            time.sleep(2)

        # Clicar em "Próximo"
        xpath_botao_proximo = dados_selecao.get("botao_proximo")
        if xpath_botao_proximo:
            logging.info("Avançando para próxima etapa (Botão Próximo)...")
            btn_proximo = espera.until(
                EC.element_to_be_clickable((By.XPATH, xpath_botao_proximo))
            )
            btn_proximo.click()
            time.sleep(2)

        logging.info("Seleção de equipamentos finalizada.")

    except Exception as e:
        logging.error(f"Erro ao selecionar equipamentos: {e}")
        logging.error(traceback.format_exc())


def definir_data_js(driver, elemento, data_valor):
    """
    Define o valor de um campo de data via JavaScript e dispara eventos de mudança.
    Isso é útil para campos readonly ou controlados por datepickers complexos.
    """
    driver.execute_script("arguments[0].value = arguments[1];", elemento, data_valor)
    driver.execute_script("arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", elemento)
    driver.execute_script("arguments[0].dispatchEvent(new Event('change', { bubbles: true }));", elemento)
    driver.execute_script("arguments[0].dispatchEvent(new Event('blur', { bubbles: true }));", elemento)


def gerar_relatorio(driver, config):
    dados_parametros = XPATHS["parametros"]
    cfg_parametros = config["automacao"]["parametros"]
    espera = WebDriverWait(driver, 10)

    logging.info("--- Iniciando geração do relatório ---")

    try:
        # Preencher Data Inicial
        # O XPath no config aponta para o botão de abrir o calendário (.../span/button)
        # Assumimos que o input está no mesmo nível do span ou próximo.
        # Estratégia: Substituir '/span/button' por '/input' para achar o campo real.
        xpath_botao_ini = dados_parametros.get("data_inicial")
        val_data_ini = cfg_parametros.get("data_inicial")
        
        if xpath_botao_ini and val_data_ini:
            logging.info(f"Tentando preencher Data Inicial: {val_data_ini}")
            xpath_input_ini = xpath_botao_ini.replace("/span/button", "/input")
            try:
                campo_ini = espera.until(EC.presence_of_element_located((By.XPATH, xpath_input_ini)))
                definir_data_js(driver, campo_ini, val_data_ini)
                logging.info("Data Inicial injetada via JS.")
            except Exception as e:
                logging.warning(f"Falha ao injetar Data Inicial no input (tentativa JS): {e}")

        # Preencher Data Final
        xpath_botao_fim = dados_parametros.get("data_final")
        val_data_fim = cfg_parametros.get("data_final")
        
        if xpath_botao_fim and val_data_fim:
            logging.info(f"Tentando preencher Data Final: {val_data_fim}")
            xpath_input_fim = xpath_botao_fim.replace("/span/button", "/input")
            try:
                campo_fim = espera.until(EC.presence_of_element_located((By.XPATH, xpath_input_fim)))
                definir_data_js(driver, campo_fim, val_data_fim)
                logging.info("Data Final injetada via JS.")
            except Exception as e:
                logging.warning(f"Falha ao injetar Data Final no input (tentativa JS): {e}")

        # Selecionar Tipo de Arquivo
        xpath_dropdown = dados_parametros.get("tipo_arquivo")
        xpath_opcao = dados_parametros.get("tipo_arquivo_opcao")
        val_tipo_arq = cfg_parametros.get("tipo_arquivo")
        
        if xpath_dropdown and val_tipo_arq:
            logging.info(f"Selecionando Tipo de Arquivo: {val_tipo_arq}")
            dropdown = espera.until(EC.element_to_be_clickable((By.XPATH, xpath_dropdown)))
            dropdown.click()
            time.sleep(1)
            
            if xpath_opcao:
                # Clica na opção configurada (XLS)
                opcao = espera.until(EC.element_to_be_clickable((By.XPATH, xpath_opcao)))
                opcao.click()
                time.sleep(1)
        
        # Clicar em "Gerar"
        xpath_botao_gerar = dados_parametros.get("botao_gerar")
        if xpath_botao_gerar:
            logging.info("Clicando em 'Gerar'...")
            btn_gerar = espera.until(
                EC.element_to_be_clickable((By.XPATH, xpath_botao_gerar))
            )
            btn_gerar.click()
            logging.info("Botão 'Gerar' clicado. Aguardando processamento...")
            time.sleep(5) # Aguarda um pouco o início do processamento/download

        logging.info("Etapa de geração finalizada.")

    except Exception as e:
        logging.error(f"Erro ao gerar relatório: {e}")
        logging.error(traceback.format_exc())


def main():
    logging.info(">>> Iniciando automação <<<")

    driver = None
    try:
        config = carregar_configuracoes()
        if not config:
            logging.error("Configurações inválidas. Encerrando.")
            return

        driver = abrir_navegador_com_perfil_padrao(config)

        fazer_login(driver, config)
        ir_para_tela_de_relatorios(driver)
        preencher_assistente_geracao(driver)
        selecionar_equipamentos(driver, config)
        gerar_relatorio(driver, config)

        logging.info(">>> Automação concluída <<<")

    except Exception as e:
        logging.critical("Erro fatal na execução.")
        logging.critical(f"Detalhes: {e}")
        logging.critical(traceback.format_exc())
    finally:
        if driver:
            logging.info("O navegador permanecerá aberto (detach=True).")

        print("\nVerifique o arquivo 'extrair_relatorio.log' para detalhes.")
        input("Pressione ENTER para fechar esta janela do terminal...")


if __name__ == "__main__":
    main()
