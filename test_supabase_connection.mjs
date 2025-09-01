// Script para testar conectividade com Supabase
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (hardcoded para teste)
const SUPABASE_URL = "https://jwyukeakgoideixxuwte.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXVrZWFrZ29pZGVpeHh1d3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE5OTEsImV4cCI6MjA3MTkyNzk5MX0.4jkyF2YYVRvL_ZDohFzojk9y8f707UKxcy4SXOvc8e8";

console.log('🔍 Testando conectividade com Supabase...');
console.log('URL:', SUPABASE_URL);
console.log('Key (primeiros 20 chars):', SUPABASE_KEY.substring(0, 20) + '...');

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  try {
    console.log('\n📡 Testando conexão básica...');
    
    // Teste 1: Verificar se o projeto está acessível
    console.log('Tentando acessar tabela pastas...');
    
    const { data, error } = await supabase
      .from('pastas')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão:', error.message);
      console.error('Código do erro:', error.code);
      console.error('Detalhes:', error.details);
      
      // Verificar tipos específicos de erro
      if (error.message.includes('recursion') || error.message.includes('policy')) {
        console.log('\n🔄 PROBLEMA IDENTIFICADO: Recursão infinita nas políticas RLS');
        console.log('SOLUÇÃO URGENTE: Execute o script fix_delete_permissions.sql no Supabase Dashboard');
        console.log('Ou execute o script radical_fix_supabase.sql para desabilitar RLS temporariamente');
      }
      
      if (error.message.includes('Failed to fetch') || error.code === 'PGRST301') {
        console.log('\n🌐 PROBLEMA IDENTIFICADO: Falha de conectividade');
        console.log('Possíveis causas:');
        console.log('- Projeto Supabase pausado ou inativo');
        console.log('- Problemas de rede/firewall');
        console.log('- Credenciais incorretas');
      }
      
      return;
    }
    
    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    console.log('Dados retornados:', data);
    
    // Teste 2: Verificar autenticação
    console.log('\n🔐 Testando autenticação...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('ℹ️ Nenhum usuário autenticado:', authError.message);
    } else if (user) {
      console.log('✅ Usuário autenticado:', user.email);
    } else {
      console.log('ℹ️ Nenhum usuário autenticado (normal para teste)');
    }
    
    // Teste 3: Verificar outras tabelas
    console.log('\n📋 Testando acesso a outras tabelas...');
    
    const tables = ['users', 'pedidos', 'pedido_itens'];
    
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (tableError) {
          console.error(`❌ Erro ao acessar tabela ${table}:`, tableError.message);
        } else {
          console.log(`✅ Tabela ${table}: acessível`);
        }
      } catch (err) {
        console.error(`❌ Erro ao acessar tabela ${table}:`, err.message);
      }
    }
    
    console.log('\n🎉 Teste de conectividade concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    console.error('Stack completo:', error.stack);
    
    // Diagnóstico detalhado
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      console.log('\n🌐 DIAGNÓSTICO: Problema de conectividade de rede');
      console.log('Ações recomendadas:');
      console.log('1. Verificar se o projeto Supabase está ativo em https://supabase.com/dashboard');
      console.log('2. Verificar conexão com internet');
      console.log('3. Tentar acessar ' + SUPABASE_URL + ' no navegador');
      console.log('4. Verificar configurações de firewall/proxy');
    }
    
    if (error.message.includes('recursion') || error.message.includes('policy')) {
      console.log('\n🔄 DIAGNÓSTICO: Problema nas políticas RLS do Supabase');
      console.log('AÇÃO URGENTE: Execute um dos scripts SQL no Supabase Dashboard:');
      console.log('- fix_delete_permissions.sql (correção específica)');
      console.log('- radical_fix_supabase.sql (correção completa)');
    }
  }
}

// Executar teste
console.log('Iniciando diagnóstico...');
testConnection().then(() => {
  console.log('\nDiagnóstico finalizado.');
}).catch((err) => {
  console.error('Erro fatal no diagnóstico:', err);
});