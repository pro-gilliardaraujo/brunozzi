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

from selenium.webdriver.common.keys import Keys

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
        "data_inicial": "/html/body/div[1]/div/div/div[2]/div[1]/form/div/div/div[5]/div/div[1]/div[1]/div/date-range-selector/div/div[1]/div/div/span/button",
        "data_final": "//*[@id='tabsReport']/div/div[5]/div/div[1]/div[1]/div/date-range-selector/div/div[2]/div/div/span/button",
        "tipo_arquivo": "//*[@id='tabsReport']/div/div[5]/div/div[1]/div[2]/div/div/div/span",
        "tipo_arquivo_opcao": "//*[@id='tabsReport']/div/div[5]/div/div[1]/div[2]/div/div/div/ul/li[2]/a", 
        "botao_gerar": "//*[@id='tabsReport']/div/div[5]/div/div[2]/button"
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
    dados_nav = XPATHS["navegacao"]

    url_login = dados_gerais["urls"]["url_login"]
    usuario = dados_gerais["credenciais"]["username"]
    senha = dados_gerais["credenciais"]["senha"]

    logging.info("--- Iniciando processo de login ---")

    try:
        if dados_nav.get("menu_relatorios") and driver.find_elements(
            By.XPATH, dados_nav["menu_relatorios"]
        ):
            logging.info("Sessão já parece autenticada. Pulando login.")
            return
    except Exception:
        pass

    abrir_url(driver, url_login, timeout=25)

    espera = WebDriverWait(driver, dados_login.get("timeout", 10))

    try:
        def preencher(campo, texto):
            campo.click()
            campo.send_keys(Keys.CONTROL, "a")
            campo.send_keys(Keys.BACKSPACE)
            campo.send_keys(texto)

        logging.info("Procurando campo de usuário...")
        campo_usuario = espera.until(
            EC.visibility_of_element_located((By.XPATH, dados_login["username"]))
        )
        logging.info("Campo de usuário encontrado. Preenchendo.")
        preencher(campo_usuario, usuario)

        logging.info("Procurando campo de senha...")
        campo_senha = espera.until(
            EC.visibility_of_element_located((By.XPATH, dados_login["password"]))
        )
        preencher(campo_senha, senha)

        logging.info("Procurando botão de entrar...")
        botao_entrar = espera.until(
            EC.element_to_be_clickable((By.XPATH, dados_login["submit_button"]))
        )
        botao_entrar.click()
        logging.info("Botão de entrar clicado.")

        if dados_nav.get("menu_relatorios"):
            WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.XPATH, dados_nav["menu_relatorios"]))
            )
        time.sleep(1)
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
    espera = WebDriverWait(driver, 20)

    logging.info("--- Iniciando seleção de equipamentos ---")

    try:
        def clicar(xpath, espera_click=True):
            espera.until(EC.visibility_of_element_located((By.XPATH, xpath)))
            el = espera.until(EC.element_to_be_clickable((By.XPATH, xpath)))
            driver.execute_script(
                "arguments[0].scrollIntoView({block: 'center'});", el
            )
            time.sleep(0.5)
            el.click()
            if espera_click:
                time.sleep(1)

        botao_inicio = dados_selecao.get("botao_selecionar_inicio")
        if botao_inicio:
            try:
                logging.info("Clicando no botão de início de seleção de equipamentos.")
                clicar(botao_inicio)
            except Exception as e:
                logging.warning(f"Não foi possível clicar no botão inicial de seleção: {e}")

        if cfg_selecao.get("unidade") == "Selecionar Tudo":
            xpath_unidade = dados_selecao.get("botao_selecionar_tudo_unidade")
            if xpath_unidade:
                logging.info("Selecionando todas as unidades.")
                clicar(xpath_unidade)

        if cfg_selecao.get("frente") == "Selecionar Tudo":
            xpath_frente = dados_selecao.get("botao_selecionar_tudo_frente")
            if xpath_frente:
                logging.info("Selecionando todas as frentes.")
                clicar(xpath_frente)

        tipos_config = cfg_selecao.get("tipo_equipamento", [])
        if tipos_config:
            lista_xpath = dados_selecao.get("lista_tipo_equipamento")
            if lista_xpath:
                logging.info(
                    f"Tipos de equipamento desejados (config): {', '.join(tipos_config)}"
                )

                container = espera.until(
                    EC.visibility_of_element_located((By.XPATH, lista_xpath))
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

                    combinado = label.text.strip()
                    if not combinado:
                        combinado = label.get_attribute("textContent").strip()

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
                clicar(xpath_frota)

        # Clicar em "Selecionar" (Confirmar seleção)
        xpath_botao_selecionar = dados_selecao.get("botao_selecionar")
        if xpath_botao_selecionar:
            logging.info("Confirmando seleção de equipamentos (Botão Selecionar)...")
            clicar(xpath_botao_selecionar, espera_click=False)
            time.sleep(2)

        # Clicar em "Próximo"
        xpath_botao_proximo = dados_selecao.get("botao_proximo")
        if xpath_botao_proximo:
            logging.info("Avançando para próxima etapa (Botão Próximo)...")
            clicar(xpath_botao_proximo, espera_click=False)
            time.sleep(2)

        logging.info("Seleção de equipamentos finalizada.")

    except Exception as e:
        logging.error(f"Erro ao selecionar equipamentos: {e}")
        logging.error(traceback.format_exc())


def gerar_relatorio(driver, config):
    dados_parametros = XPATHS["parametros"]
    espera = WebDriverWait(driver, 20)

    logging.info("--- Iniciando geração do relatório ---")

    try:
        xpath_botao_ini = dados_parametros.get("data_inicial")
        logging.info(f"DEBUG: XPath Data Inicial: '{xpath_botao_ini}'")
        if not xpath_botao_ini:
            logging.error("XPath do datepicker (Data Inicial) não está configurado.")
            return

        espera.until(EC.visibility_of_element_located((By.XPATH, xpath_botao_ini)))
        btn = espera.until(EC.element_to_be_clickable((By.XPATH, xpath_botao_ini)))
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", btn)
        time.sleep(0.5)
        logging.info("Clicando no datepicker (Data Inicial)...")
        try:
            btn.click()
        except Exception:
            driver.execute_script("arguments[0].click();", btn)
        logging.info("Clique no datepicker (Data Inicial) realizado.")
        time.sleep(1)

        print("\n" + "=" * 60)
        print("PAUSA: Datepicker de Data Inicial clicado. Calendário deve estar aberto.")
        input("Pressione ENTER para encerrar aqui...")
        print("=" * 60 + "\n")
        return

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
