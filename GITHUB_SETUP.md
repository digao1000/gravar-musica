# 📤 Enviando MusicaDrive para o GitHub

Este guia mostra como enviar seu projeto MusicaDrive para o GitHub usando os scripts fornecidos.

## 🚀 Opções de Script

### Windows (PowerShell)
```powershell
# Executar o script PowerShell
.\push_to_github.ps1
```

### Windows (Command Prompt)
```cmd
# Executar o script Batch
push_to_github.bat
```

### Linux/macOS (Bash)
```bash
# Tornar o script executável e executar
chmod +x push_to_github.sh
./push_to_github.sh
```

## 📋 Passo a Passo Manual

Se preferir fazer manualmente, siga estes passos:

### 1. Criar Repositório no GitHub
1. Acesse [github.com](https://github.com)
2. Clique em "New repository"
3. Nomeie como "musica-drive" (ou outro nome desejado)
4. Deixe público ou privado conforme preferir
5. **NÃO** inicialize com README (deixe desmarcado)
6. Clique em "Create repository"

### 2. Configurar Localmente
```bash
# No diretório do projeto
git init
git add .
git commit -m "Primeiro commit - MusicaDrive"
git branch -M main
git remote add origin https://github.com/seu-usuario/musica-drive.git
git push -u origin main
```

### 3. Substitua `seu-usuario` pelo seu nome de usuário do GitHub

## 🔧 Configuração de Segurança

### Token de Acesso (Se necessário)
Se você usa autenticação de dois fatores, precisará de um token de acesso:

1. GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Selecione os escopos: `repo`, `workflow`
4. Use o token ao invés da senha quando solicitado

## 📁 Estrutura do Projeto

```
musica-drive/
├── src/
│   ├── react-app/          # Frontend React
│   ├── shared/            # Tipos compartilhados
│   └── worker/            # Cloudflare Worker
├── migrations/            # Migrações do banco
├── push_to_github.*       # Scripts de deploy
├── package.json
├── README.md
└── ...
```

## 🐛 Solução de Problemas

### Erro: "Permission denied"
```bash
# No Linux/macOS
chmod +x push_to_github.sh

# No Windows, execute como administrador se necessário
```

### Erro: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/seu-usuario/musica-drive.git
```

### Erro: "failed to push"
```bash
# Forçar push (cuidado: sobrescreve remoto)
git push -f origin main
```

## 📝 Próximos Passos

Após enviar para o GitHub:
1. Configure o README.md com informações do projeto
2. Adicione um arquivo `.gitignore` se ainda não existir
3. Configure GitHub Actions para CI/CD
4. Adicione colaboradores se for um projeto em equipe

## 📞 Suporte

Se encontrar problemas:
1. Verifique se o Git está instalado: `git --version`
2. Verifique sua conexão com a internet
3. Verifique suas credenciais do GitHub
4. Consulte a [documentação oficial do Git](https://docs.github.com)