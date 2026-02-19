@echo off
setlocal

set "ROOT_DIR=%~dp0..\.."

start "PDF Backend" cmd /k cd /d "%~dp0" ^& python 1_BackendPdf.py
start "Frontend" cmd /k cd /d "%ROOT_DIR%\gerador_relatorios\frontend" ^& npm run dev

endlocal
