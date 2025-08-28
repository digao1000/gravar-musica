Write-Host "🔧 Corrigindo branch e enviando para GitHub..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Branches disponíveis:" -ForegroundColor Yellow
$branches = git branch -a
$branches

Write-Host ""
Write-Host "🔄 Branch atual:" -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host $currentBranch -ForegroundColor Green

Write-Host ""
Write-Host "📝 Adicionando arquivos..." -ForegroundColor Yellow
git add .

Write-Host ""
$commitMsg = Read-Host "💬 Digite a mensagem de commit (padrão: 'Atualização do projeto')"
if ([string]::IsNullOrWhiteSpace($commitMsg)) {
    $commitMsg = "Atualização do projeto"
}

Write-Host ""
Write-Host "📦 Fazendo commit..." -ForegroundColor Yellow
git commit -m $commitMsg

Write-Host ""
Write-Host "🚀 Enviando para a branch $currentBranch..." -ForegroundColor Yellow
git push origin $currentBranch

Write-Host ""
Write-Host "✅ Pronto! Verifique se foi enviado corretamente." -ForegroundColor Green