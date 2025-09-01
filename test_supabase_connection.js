// Script para testar conectividade com Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurações do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jwyukeakgoideixxuwte.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXVrZWFrZ29pZGVpeHh1d3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE5OTEsImV4cCI6MjA3MTkyNzk5MX0.4jkyF2YYVRvL_ZDohFzojk9y8f707UKxcy4SXOvc8e8";

console.log('🔍 Testando conectividade com Supabase...');
console.log('URL:', SUPABASE_URL);
console.log('Key (primeiros 20 chars):', SUPABASE_KEY.substring(0, 20) + '...');

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  try {
    console.log('\n📡 Testando conexão básica...');
    
    // Teste 1: Verificar se o projeto está acessível
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.error('❌ Erro na conexão:', healthError.message);
      console.error('Detalhes:', healthError);
      return;
    }
    
    console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    
    // Teste 2: Verificar tabelas
    console.log('\n📋 Testando acesso às tabelas...');
    
    const tables = ['users', 'pastas', 'pedidos', 'pedido_itens'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`❌ Erro ao acessar tabela ${table}:`, error.message);
        } else {
          console.log(`✅ Tabela ${table}: ${count} registros`);
        }
      } catch (err) {
        console.error(`❌ Erro ao acessar tabela ${table}:`, err.message);
      }
    }
    
    // Teste 3: Verificar autenticação
    console.log('\n🔐 Testando autenticação...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('ℹ️ Nenhum usuário autenticado (normal para teste):', authError.message);
    } else if (user) {
      console.log('✅ Usuário autenticado:', user.email);
    } else {
      console.log('ℹ️ Nenhum usuário autenticado');
    }
    
    console.log('\n🎉 Teste de conectividade concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    console.error('Stack:', error.stack);
    
    // Verificar se é problema de rede
    if (error.message.includes('fetch') || error.message.includes('network')) {
      console.log('\n🌐 Possíveis soluções para problemas de rede:');
      console.log('1. Verificar conexão com a internet');
      console.log('2. Verificar se o firewall está bloqueando a conexão');
      console.log('3. Tentar acessar https://jwyukeakgoideixxuwte.supabase.co no navegador');
      console.log('4. Verificar se o projeto Supabase está ativo');
    }
  }
}

// Executar teste
testConnection();