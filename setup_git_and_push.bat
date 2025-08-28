@echo off
echo 🚀 Configurando Git e enviando para GitHub...
echo.

REM Verificar se o git está instalado
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git não está instalado. Por favor, instale o Git primeiro.
    pause
    exit /b 1
)

REM Navegar para o diretório do script
cd /d "%~dp0"

REM Verificar se já é um repositório git
if not exist ".git" (
    echo 📁 Inicializando repositório Git...
    git init
    echo ✅ Repositório inicializado
) else (
    echo ✅ Repositório Git já existe
)

REM Verificar se há remote configurado
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔗 Configurando remote origin...
    set /p github_url=Digite a URL do seu repositório GitHub: 
    if "%github_url%"=="" (
        echo ❌ URL é obrigatória
        pause
        exit /b 1
    )
    git remote add origin %github_url%
    echo ✅ Remote configurado
) else (
    echo ✅ Remote já configurado
    git remote get-url origin
)

REM Configurar branch principal
git branch -M main

echo.
echo 📊 Status do repositório:
git status

echo.
echo 📝 Adicionando todos os arquivos...
git add .

echo.
set /p commit_msg=💬 Digite a mensagem de commit (padrão: 'Primeiro commit'): 
if "%commit_msg%"=="" set commit_msg=Primeiro commit

echo 📦 Fazendo commit...
git commit -m "%commit_msg%"

echo.
echo 🚀 Enviando para GitHub...
git push -u origin main

echo.
echo ✅ Pronto! Seu projeto foi enviado para o GitHub.
pause