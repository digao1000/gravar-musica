# Como Criar o Repositório no GitHub

## Opção 1: Criar Manualmente pelo Site

1. Acesse [https://github.com/new](https://github.com/new)
2. Preencha os campos:
   - **Repository name**: `musica-drive`
   - **Description**: (opcional) Descrição do projeto
   - **Public/Private**: Escolha conforme preferir
   - **Initialize repository**: ❌ **NÃO** marque "Add a README file"
   - **Add .gitignore**: ❌ Não selecione nada
   - **Add a license**: ❌ Não selecione nada
3. Clique em "Create repository"

## Opção 2: Usar GitHub CLI (se instalado)

```bash
gh repo create digao1000/musica-drive --private --description "MusicaDrive - A modern music application"
```

## Após Criar o Repositório

Execute os comandos abaixo para fazer push do seu código:

```bash
git remote set-url origin https://github.com/digao1000/musica-drive.git
git push -u origin main
```

## Se Precisar de Autenticação

Quando solicitado, use:
- **Username**: `digao1000`
- **Password**: Seu **Personal Access Token** (não sua senha do GitHub)

Para criar um Personal Access Token:
1. Vá para [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Clique em "Generate new token"
3. Selecione os escopos: `repo`, `workflow`
4. Copie o token gerado e use como senha