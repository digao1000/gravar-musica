@echo off
echo 🔧 Corrigindo branch e enviando para GitHub...
echo.
echo 📊 Branches disponíveis:
git branch -a
echo.
echo 🔄 Verificando branch atual...
git branch --show-current
echo.
echo 📝 Adicionando arquivos...
git add .
echo.
echo 💬 Mensagem de commit:
set /p commit_msg=Digite a mensagem de commit: 
if "%commit_msg%"=="" set commit_msg=Atualização do projeto
echo.
git commit -m "%commit_msg%"
echo.
echo 🚀 Enviando para a branch main...
git push origin main
echo.
echo ✅ Pronto! Verifique se foi enviado corretamente.
pause