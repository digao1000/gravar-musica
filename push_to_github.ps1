# Script PowerShell para enviar o projeto MusicaDrive para o GitHub
# Autor: Script gerado automaticamente

Write-Host "🚀 Preparando para enviar o MusicaDrive para o GitHub..." -ForegroundColor Cyan

# Função para verificar se um comando existe
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Verificar se o git está instalado
if (-not (Test-Command "git")) {
    Write-Host "❌ Git não está instalado. Por favor, instale o Git primeiro." -ForegroundColor Red
    exit 1
}

# Navegar para o diretório do script
Set-Location $PSScriptRoot

# Verificar se já é um repositório git
if (-not (Test-Path ".git")) {
    Write-Host "📁 Inicializando novo repositório Git..." -ForegroundColor Yellow
    git init
    
    Write-Host "🔗 Por favor, adicione o remote manualmente:" -ForegroundColor Yellow
    Write-Host "git remote add origin https://github.com/seu-usuario/musica-drive.git" -ForegroundColor Green
    Write-Host "Ou edite este script para adicionar automaticamente." -ForegroundColor Yellow
}

# Verificar status atual
Write-Host "📊 Status atual do repositório:" -ForegroundColor Green
git status

Write-Host "📝 Adicionando todos os arquivos..." -ForegroundColor Green
git add .

# Solicitar mensagem de commit
$commitMessage = Read-Host "💬 Digite uma mensagem de commit (padrão: 'Atualização do projeto')"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Atualização do projeto"
}

Write-Host "📦 Fazendo commit..." -ForegroundColor Green
git commit -m $commitMessage

# Verificar se o remote está configurado
try {
    $remoteUrl = git config --get remote.origin.url
    if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
        Write-Host "⚠️  Remote não configurado. Por favor, configure manualmente:" -ForegroundColor Yellow
        Write-Host "git remote add origin https://github.com/seu-usuario/musica-drive.git" -ForegroundColor Green
        Write-Host "git branch -M main" -ForegroundColor Green
        Write-Host "git push -u origin main" -ForegroundColor Green
    } else {
        Write-Host "🚀 Enviando para o GitHub..." -ForegroundColor Green
        $currentBranch = git rev-parse --abbrev-ref HEAD
        git push -u origin $currentBranch
    }
} catch {
    Write-Host "⚠️  Erro ao verificar remote. Por favor, configure manualmente." -ForegroundColor Yellow
    Write-Host "git remote add origin https://github.com/seu-usuario/musica-drive.git" -ForegroundColor Green
    Write-Host "git branch -M main" -ForegroundColor Green
    Write-Host "git push -u origin main" -ForegroundColor Green
}

Write-Host "✅ Pronto! Seu projeto foi enviado para o GitHub." -ForegroundColor Green