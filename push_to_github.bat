@echo off
chcp 65001 > nul
echo 🚀 Preparando para enviar o MusicaDrive para o GitHub...

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
    echo 📁 Inicializando novo repositório Git...
    git init
    echo 🔗 Por favor, adicione o remote manualmente:
    echo git remote add origin https://github.com/seu-usuario/musica-drive.git
    echo Ou edite este script para adicionar automaticamente.
)

echo 📊 Status atual do repositório:
git status

echo 📝 Adicionando todos os arquivos...
git add .

set /p commitMessage=💬 Digite uma mensagem de commit (padrão: 'Atualização do projeto'): 
if "%commitMessage%"=="" set commitMessage=Atualização do projeto

echo 📦 Fazendo commit...
git commit -m "%commitMessage%"

REM Verificar se o remote está configurado
git config --get remote.origin.url >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Remote não configurado. Por favor, configure manualmente:
    echo git remote add origin https://github.com/seu-usuario/musica-drive.git
    echo git branch -M main
    echo git push -u origin main
) else (
    echo 🚀 Enviando para o GitHub...
    for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set currentBranch=%%i
    git push -u origin %currentBranch%
)

echo ✅ Pronto! Seu projeto foi enviado para o GitHub.
pause