// Script para testar login admin
// Execute com: node test_login.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jwyukeakgoideixxuwte.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3eXVrZWFrZ29pZGVpeHh1d3RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTE5OTEsImV4cCI6MjA3MTkyNzk5MX0.4jkyF2YYVRvL_ZDohFzojk9y8f707UKxcy4SXOvc8e8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
  console.log('🔍 Testando login admin...');
  
  // Testar com diferentes combinações de credenciais
  const credentials = [
    { email: 'rodrigomucuri@hotmail.com', password: 'admin123' },
    { email: 'rodrigomucuri@hotmail.com', password: 'Rodrigo123' },
    { email: 'admin@admin.com', password: 'admin123' },
  ];
  
  for (const cred of credentials) {
    console.log(`\n📧 Tentando login com: ${cred.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: cred.password
      });
      
      if (error) {
        console.log(`❌ Erro: ${error.message}`);
      } else {
        console.log('✅ Login bem-sucedido!');
        console.log('👤 Usuário:', data.user?.email);
        
        // Verificar dados do usuário na tabela public.users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user?.id)
          .single();
          
        if (userError) {
          console.log(`❌ Erro ao buscar dados do usuário: ${userError.message}`);
        } else {
          console.log('📋 Dados do usuário:', userData);
        }
        
        // Fazer logout
        await supabase.auth.signOut();
        return;
      }
    } catch (err) {
      console.log(`💥 Erro inesperado: ${err.message}`);
    }
  }
  
  console.log('\n🔍 Verificando usuários existentes...');
  
  try {
    // Verificar usuários na tabela public.users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, is_active')
      .limit(10);
      
    if (error) {
      console.log(`❌ Erro ao buscar usuários: ${error.message}`);
    } else {
      console.log('👥 Usuários encontrados:', users);
    }
  } catch (err) {
    console.log(`💥 Erro ao verificar usuários: ${err.message}`);
  }
}

testLogin().catch(console.error);