# 🚀 Comandos Rápidos para GitHub

## 📋 Passo a Passo Completo

### 1. Criar Repositório no GitHub
1. Acesse [github.com](https://github.com)
2. Clique em "New repository"
3. Nome: `musica-drive`
4. **NÃO** marque "Initialize with README"
5. Copie a URL: `https://github.com/seu-usuario/musica-drive.git`

### 2. Comandos para Executar

```bash
# Inicializar git (se ainda não foi feito)
git init

# Adicionar remote (substitua pela sua URL)
git remote add origin https://github.com/seu-usuario/musica-drive.git

# Configurar branch principal
git branch -M main

# Adicionar arquivos
git add .

# Fazer commit
git commit -m "Primeiro commit - MusicaDrive"

# Enviar para GitHub
git push -u origin main
```

### 3. Se aparecer erro de autenticação
- Use seu token do GitHub ao invés da senha
- Ou configure SSH: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### 4. Scripts Prontos para Usar
- **setup_git_and_push.bat** - Executar no Windows
- **setup_git_and_push.ps1** - Executar no PowerShell
- **COMANDOS_RAPIDOS.md** - Este arquivo

## ⚡ Execução Rápida

**Windows:**
```cmd
setup_git_and_push.bat
```

**PowerShell:**
```powershell
.\setup_git_and_push.ps1
```

## 📝 Notas Importantes
- Substitua `seu-usuario` pelo seu nome de usuário do GitHub
- Se usar 2FA, precisará de um Personal Access Token
- A branch padrão é `main`, não `vendamusica`