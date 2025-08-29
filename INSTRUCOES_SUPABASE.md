# 🚀 Configuração das Funções RPC - Supabase MusicaDrive

## 📋 Status Atual
✅ **Tabelas já existem no Supabase:**
- `pastas`
- `pedido_itens` 
- `pedidos`
- `users`

✅ **Políticas RLS já configuradas:**
- Todas as políticas de segurança estão ativas
- RLS habilitado em todas as tabelas
- Permissões configuradas corretamente

❌ **Faltando configurar:**
- **Funções RPC** (`create_order`, `get_orders_for_staff`, `get_current_user_role`)

## 🎯 **O Problema do Erro 404**

O erro 404 está acontecendo porque:
1. ❌ A função `create_order` não existe no Supabase
2. ✅ As tabelas existem
3. ✅ As políticas RLS estão configuradas
4. ✅ As permissões estão corretas

**Solução:** Criar apenas as 3 funções RPC que estão faltando!

## 🔧 Passos para Configuração

### 1. Acessar o SQL Editor
1. Faça login no [Supabase](https://supabase.com)
2. Acesse seu projeto
3. Vá para **SQL Editor** no menu lateral

### 2. Executar o Script de Funções
1. Clique em **"New Query"**
2. Cole todo o conteúdo do arquivo `supabase_functions_only.sql`
3. Clique em **"Run"** para executar

### 3. Verificar Configuração
Após executar o script, você deve ver:
- ✅ 3 funções criadas: `get_current_user_role`, `get_orders_for_staff`, `create_order`
- ✅ Função `create_order` disponível (resolve o erro 404!)

## 🎯 O que o Script Faz

### 🔐 Funções RPC Criadas
- **`get_current_user_role()`**: Obtém role do usuário logado
- **`get_orders_for_staff()`**: Lista pedidos para funcionários (com mascaramento de contato)
- **`create_order()`**: **ESTA RESOLVE O ERRO 404!** - Cria pedidos de forma segura

## 🚨 **Resolução do Erro 404**

**Antes:** ❌ `404: NOT_FOUND` - Função `create_order` não existe
**Depois:** ✅ Sistema funcionando - Função `create_order` disponível

## ✅ Verificação Final

Após executar o script, teste:
1. **Criar pedido**: Deve funcionar sem erros 404 ✅
2. **Listar pastas**: Deve funcionar ✅
3. **Relatórios**: Deve funcionar sem erros ✅
4. **Upload de imagens**: Deve funcionar (base64) ✅

## 📞 Suporte

Se ainda houver problemas:
1. Verifique se as 3 funções foram criadas no SQL Editor
2. Confirme se a função `create_order` aparece na lista de funções
3. Teste a função diretamente no SQL Editor

---

**🎉 Sistema configurado e pronto para uso!**
**O erro 404 será resolvido após executar este script simples!**
