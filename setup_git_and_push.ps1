Write-Host "🚀 Configurando Git e enviando para GitHub..." -ForegroundColor Cyan
Write-Host ""

# Verificar se o git está instalado
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git não está instalado. Por favor, instale o Git primeiro." -ForegroundColor Red
    Read-Host "Pressione Enter para saiar"
    exit 1
}

# Navegar para o diretório do script
Set-Location $PSScriptRoot

# Verificar se já é um repositório git
if (-not (Test-Path ".git")) {
    Write-Host "📁 Inicializando repositório Git..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Repositório inicializado" -ForegroundColor Green
} else {
    Write-Host "✅ Repositório Git já existe" -ForegroundColor Green
}

# Verificar se há remote configurado
try {
    $remoteUrl = git remote get-url origin
    Write-Host "✅ Remote já configurado: $remoteUrl" -ForegroundColor Green
} catch {
    Write-Host "🔗 Configurando remote origin..." -ForegroundColor Yellow
    $githubUrl = Read-Host "Digite a URL do seu repositório GitHub (ex: https://github.com/seu-usuario/musica-drive.git)"
    if ([string]::IsNullOrWhiteSpace($githubUrl)) {
        Write-Host "❌ URL é obrigatória" -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit 1
    }
    git remote add origin $githubUrl
    Write-Host "✅ Remote configurado" -ForegroundColor Green
}

# Configurar branch principal
git branch -M main

Write-Host ""
Write-Host "📊 Status do repositório:" -ForegroundColor Green
git status

Write-Host ""
Write-Host "📝 Adicionando todos os arquivos..." -ForegroundColor Green
git add .

Write-Host ""
$commitMsg = Read-Host "💬 Digite a mensagem de commit (padrão: 'Primeiro commit')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "Primeiro commit"
}

Write-Host "📦 Fazendo commit..." -ForegroundColor Green
git commit -m $commitMsg

Write-Host ""
Write-Host "🚀 Enviando para GitHub..." -ForegroundColor Green
git push -u origin main

Write-Host ""
Write-Host "✅ Pronto! Seu projeto foi enviado para o GitHub." -ForegroundColor Green
Read-Host "Pressione Enter para continuar"