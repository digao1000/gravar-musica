// Script para testar a função de exclusão de dados
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const SUPABASE_URL = "https://jwyukeakgoideixxuwte.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXVrZWFrZ29pZGVpeHh1d3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE5OTEsImV4cCI6MjA3MTkyNzk5MX0.4jkyF2YYVRvL_ZDohFzojk9y8f707UKxcy4SXOvc8e8";

console.log('🧪 Testando função de exclusão de dados...');

// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDeleteFunction() {
  try {
    console.log('\n📊 Verificando dados atuais...');
    
    // Verificar quantos registros existem em cada tabela
    const tables = ['pedido_itens', 'pedidos', 'pastas', 'users'];
    const counts = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`❌ Erro ao contar ${table}:`, error.message);
          counts[table] = 'ERRO';
        } else {
          counts[table] = count || 0;
          console.log(`📋 ${table}: ${count || 0} registros`);
        }
      } catch (err) {
        console.error(`❌ Erro ao acessar ${table}:`, err.message);
        counts[table] = 'ERRO';
      }
    }
    
    console.log('\n🗑️ Testando exclusão método 1 (políticas RLS)...');
    
    // Teste 1: Tentar exclusão normal
    try {
      // Delete pedido_itens first (foreign key dependency)
      console.log('Tentando excluir pedido_itens...');
      const { error: itemsError, count: itemsCount } = await supabase
        .from('pedido_itens')
        .delete()
        .not('id', 'is', null);
      
      if (itemsError) {
        console.error('❌ Erro ao excluir pedido_itens:', itemsError.message);
        console.error('Detalhes:', itemsError);
      } else {
        console.log(`✅ ${itemsCount || 0} itens de pedido excluídos`);
      }

      // Delete pedidos
      console.log('Tentando excluir pedidos...');
      const { error: pedidosError, count: pedidosCount } = await supabase
        .from('pedidos')
        .delete()
        .not('id', 'is', null);
      
      if (pedidosError) {
        console.error('❌ Erro ao excluir pedidos:', pedidosError.message);
        console.error('Detalhes:', pedidosError);
      } else {
        console.log(`✅ ${pedidosCount || 0} pedidos excluídos`);
      }

      // Delete pastas
      console.log('Tentando excluir pastas...');
      const { error: pastasError, count: pastasCount } = await supabase
        .from('pastas')
        .delete()
        .not('id', 'is', null);
      
      if (pastasError) {
        console.error('❌ Erro ao excluir pastas:', pastasError.message);
        console.error('Detalhes:', pastasError);
      } else {
        console.log(`✅ ${pastasCount || 0} pastas excluídas`);
      }
      
      // Se chegou até aqui sem erros, a exclusão normal funcionou
      if (!itemsError && !pedidosError && !pastasError) {
        console.log('\n🎉 Exclusão normal funcionou perfeitamente!');
        return;
      }
      
    } catch (normalError) {
      console.error('❌ Erro na exclusão normal:', normalError.message);
    }
    
    console.log('\n🔧 Testando exclusão método 2 (função RPC)...');
    
    // Teste 2: Tentar com função RPC
    try {
      console.log('Verificando se função RPC existe...');
      
      const { data, error: rpcError } = await supabase.rpc('clear_all_data_admin');
      
      if (rpcError) {
        console.error('❌ Erro na função RPC:', rpcError.message);
        console.error('Código:', rpcError.code);
        console.error('Detalhes:', rpcError.details);
        
        if (rpcError.code === '42883') {
          console.log('\n🚨 PROBLEMA IDENTIFICADO: Função RPC não existe!');
          console.log('SOLUÇÃO: Execute o script fix_delete_permissions.sql no Supabase Dashboard');
        }
      } else {
        console.log('✅ Função RPC executada com sucesso!');
        console.log('Resultado:', data);
      }
      
    } catch (rpcError) {
      console.error('❌ Erro ao chamar função RPC:', rpcError.message);
    }
    
    console.log('\n📊 Verificando dados após tentativas de exclusão...');
    
    // Verificar novamente os dados
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`❌ Erro ao contar ${table}:`, error.message);
        } else {
          const before = counts[table];
          const after = count || 0;
          console.log(`📋 ${table}: ${before} → ${after} registros`);
        }
      } catch (err) {
        console.error(`❌ Erro ao acessar ${table}:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
console.log('Iniciando teste de exclusão...');
testDeleteFunction().then(() => {
  console.log('\n🏁 Teste finalizado.');
  console.log('\n💡 DIAGNÓSTICO:');
  console.log('- Se a exclusão normal falhou: problema de políticas RLS');
  console.log('- Se a função RPC não existe: execute fix_delete_permissions.sql');
  console.log('- Se ambos falharam: execute radical_fix_supabase.sql');
}).catch((err) => {
  console.error('Erro fatal no teste:', err);
});