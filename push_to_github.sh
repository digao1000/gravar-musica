#!/bin/bash

# Script para enviar o projeto MusicaDrive para o GitHub
# Autor: Script gerado automaticamente

echo "🚀 Preparando para enviar o MusicaDrive para o GitHub..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se um comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar se o git está instalado
if ! command_exists git; then
    echo -e "${RED}❌ Git não está instalado. Por favor, instale o Git primeiro.${NC}"
    exit 1
fi

# Navegar para o diretório do projeto
cd "$(dirname "$0")"

# Verificar se já é um repositório git
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📁 Inicializando novo repositório Git...${NC}"
    git init
    
    # Adicionar remote origin (substitua com seu URL do GitHub)
    echo -e "${YELLOW}🔗 Por favor, adicione o remote manualmente:${NC}"
    echo "git remote add origin https://github.com/seu-usuario/musica-drive.git"
    echo -e "${YELLOW}Ou edite este script e adicione a linha abaixo:${NC}"
    echo "git remote add origin https://github.com/seu-usuario/musica-drive.git"
fi

# Verificar status atual
echo -e "${GREEN}📊 Status atual do repositório:${NC}"
git status

echo -e "${GREEN}📝 Adicionando todos os arquivos...${NC}"
git add .

echo -e "${GREEN}💬 Digite uma mensagem de commit:${NC}"
read -p "Mensagem de commit (padrão: 'Atualização do projeto'): " commit_message

if [ -z "$commit_message" ]; then
    commit_message="Atualização do projeto"
fi

echo -e "${GREEN}📦 Fazendo commit...${NC}"
git commit -m "$commit_message"

echo -e "${GREEN}🔄 Verificando remote...${NC}"
remote_url=$(git config --get remote.origin.url)
if [ -z "$remote_url" ]; then
    echo -e "${YELLOW}⚠️  Remote não configurado. Por favor, configure manualmente:${NC}"
    echo "git remote add origin https://github.com/seu-usuario/musica-drive.git"
    echo "git branch -M main"
    echo "git push -u origin main"
else
    echo -e "${GREEN}🚀 Enviando para o GitHub...${NC}"
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    git push -u origin "$current_branch"
fi

echo -e "${GREEN}✅ Pronto! Seu projeto foi enviado para o GitHub.${NC}"