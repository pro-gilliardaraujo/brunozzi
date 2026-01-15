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
from selenium.common.exceptions import TimeoutException, WebDriverException

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
        "unidade": "",  # Adicione o XPath aqui
        "frente": "",   # Adicione o XPath aqui
        "tipo_equipamento": "", # Adicione o XPath aqui
        "frota": "",    # Adicione o XPath aqui
    },
    "parametros": {
        "data_inicio": "", # Adicione o XPath aqui
        "data_fim": "",    # Adicione o XPath aqui
        "tipo_arquivo": "", # Adicione o XPath aqui
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


def abrir_navegador_com_perfil_padrao():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    download_path = os.path.join(base_dir, "dados")
    os.makedirs(download_path, exist_ok=True)

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

    driver = webdriver.Chrome(options=chrome_options)
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


def main():
    logging.info(">>> Iniciando automação <<<")

    driver = None
    try:
        config = carregar_configuracoes()
        if not config:
            logging.error("Configurações inválidas. Encerrando.")
            return

        driver = abrir_navegador_com_perfil_padrao()

        fazer_login(driver, config)
        ir_para_tela_de_relatorios(driver)
        preencher_assistente_geracao(driver)

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
