# 🚨 Erro: "src refspec vendamusica does not match any"

## Problema
Você está tentando enviar para uma branch chamada "vendamusica" mas esta branch não existe no repositório local.

## Solução Imediata

### Opção 1: Usar os scripts de correção
- **Windows (PowerShell)**: Execute `fix_branch_and_push.ps1`
- **Windows (CMD)**: Execute `fix_branch_and_push.bat`

### Opção 2: Comandos manuais

1. **Verificar branch atual**:
```bash
git branch --show-current
```

2. **Ver todas as branches**:
```bash
git branch -a
```

3. **Se estiver na branch main** (mais comum):
```bash
git push origin main
```

4. **Se quiser criar a branch "vendamusica"**:
```bash
git checkout -b vendamusica
git push origin vendamusica
```

## Comandos Úteis

### Criar e trocar de branch
```bash
git checkout -b vendamusica
```

### Enviar branch específica
```bash
git push origin nome-da-branch
```

### Ver branches remotas
```bash
git remote show origin
```

## Fluxo Recomendado

1. **Verificar status**:
```bash
git status
```

2. **Adicionar arquivos**:
```bash
git add .
```

3. **Fazer commit**:
```bash
git commit -m "Mensagem do commit"
```

4. **Enviar para a branch correta**:
```bash
git push origin main
```

## Dica Importante
- A branch padrão é geralmente `main` ou `master`
- Substitua `vendamusica` pelo nome correto da branch que você deseja usar
- Sempre verifique qual é a branch atual antes de enviar