import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Calendar, Database, Trash2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  vendasHoje: { pedidos: number; valor: number };
  vendasSemana: { pedidos: number; valor: number };
  vendasMes: { pedidos: number; valor: number };
  ultimosPedidos: Array<{
    id: string;
    cliente_nome: string;
    status: string;
    created_at: string;
  }>;
}

interface DatabaseStats {
  totalPastas: number;
  totalPedidos: number;
  totalUsers: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDatabaseManager, setShowDatabaseManager] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchDatabaseStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch basic stats from Supabase
      const today = new Date().toISOString().split('T')[0];
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      // Get today's orders
      const { data: todayOrders } = await supabase
        .from('pedidos')
        .select('total_valor')
        .gte('created_at', today);

      // Get week's orders
      const { data: weekOrders } = await supabase
        .from('pedidos')
        .select('total_valor')
        .gte('created_at', startOfWeek.toISOString());

      // Get month's orders
      const { data: monthOrders } = await supabase
        .from('pedidos')
        .select('total_valor, created_at, cliente_nome, status, id')
        .gte('created_at', startOfMonth.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      const stats: DashboardStats = {
        vendasHoje: {
          pedidos: todayOrders?.length || 0,
          valor: todayOrders?.reduce((sum, order) => sum + order.total_valor, 0) || 0
        },
        vendasSemana: {
          pedidos: weekOrders?.length || 0,
          valor: weekOrders?.reduce((sum, order) => sum + order.total_valor, 0) || 0
        },
        vendasMes: {
          pedidos: monthOrders?.length || 0,
          valor: monthOrders?.reduce((sum, order) => sum + order.total_valor, 0) || 0
        },
        ultimosPedidos: monthOrders?.map(order => ({
          id: order.id,
          cliente_nome: order.cliente_nome,
          status: order.status,
          created_at: order.created_at
        })) || []
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseStats = async () => {
    try {
      // Get counts from Supabase
      const [pastasResult, pedidosResult] = await Promise.all([
        supabase.from('pastas').select('id', { count: 'exact' }),
        supabase.from('pedidos').select('id', { count: 'exact' })
      ]);

      setDatabaseStats({
        totalPastas: pastasResult.count || 0,
        totalPedidos: pedidosResult.count || 0,
        totalUsers: 0 // Placeholder since we don't track users separately yet
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
    }
  };

  const clearPastas = async () => {
    if (!confirm('ATENÇÃO: Isso excluirá todas as pastas permanentemente. Esta ação não pode ser desfeita. Continuar?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pastas')
        .delete()
        .neq('id', 'dummy'); // Delete all rows

      if (error) {
        alert('Erro ao excluir pastas: ' + error.message);
      } else {
        alert('Pastas excluídas com sucesso!');
        fetchDatabaseStats();
      }
    } catch (error) {
      console.error('Error clearing pastas:', error);
      alert('Erro ao excluir pastas');
    }
  };

  const clearPedidos = async () => {
    if (!confirm('ATENÇÃO: Isso excluirá TODOS os pedidos permanentemente. Esta ação não pode ser desfeita. Continuar?')) {
      return;
    }

    try {
      // First delete pedido_itens (due to foreign key constraint)
      await supabase.from('pedido_itens').delete().neq('id', 'dummy');
      
      // Then delete pedidos
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .neq('id', 'dummy');

      if (error) {
        alert('Erro ao excluir pedidos: ' + error.message);
      } else {
        alert('Pedidos excluídos com sucesso!');
        fetchStats();
        fetchDatabaseStats();
      }
    } catch (error) {
      console.error('Error clearing pedidos:', error);
      alert('Erro ao excluir pedidos');
    }
  };

  const clearAllData = async () => {
    if (!confirm('ATENÇÃO: Isso excluirá TODOS os dados (pastas, pedidos, etc.) permanentemente. Esta ação não pode ser desfeita. Continuar?')) {
      return;
    }

    if (!confirm('Tem ABSOLUTA certeza? Esta ação apagará todo o banco de dados!')) {
      return;
    }

    try {
      // Delete in order to respect foreign keys
      await supabase.from('pedido_itens').delete().neq('id', 'dummy');
      await supabase.from('pedidos').delete().neq('id', 'dummy');
      await supabase.from('pastas').delete().neq('id', 'dummy');

      alert('Todos os dados foram excluídos com sucesso!');
      fetchStats();
      fetchDatabaseStats();
    } catch (error) {
      console.error('Error clearing all data:', error);
      alert('Erro ao excluir dados');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'ENVIADO': 'bg-blue-100 text-blue-800',
      'EM_SEPARACAO': 'bg-yellow-100 text-yellow-800',
      'PRONTO': 'bg-green-100 text-green-800',
      'ENTREGUE': 'bg-gray-100 text-gray-800',
      'CANCELADO': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'ENVIADO': 'Enviado',
      'EM_SEPARACAO': 'Em Separação',
      'PRONTO': 'Pronto',
      'ENTREGUE': 'Entregue',
      'CANCELADO': 'Cancelado'
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Erro ao carregar estatísticas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hoje</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(stats.vendasHoje.valor)}
              </p>
              <p className="text-sm text-gray-500">
                {stats.vendasHoje.pedidos} pedido(s)
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Esta Semana</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(stats.vendasSemana.valor)}
              </p>
              <p className="text-sm text-gray-500">
                {stats.vendasSemana.pedidos} pedido(s)
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Este Mês</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(stats.vendasMes.valor)}
              </p>
              <p className="text-sm text-gray-500">
                {stats.vendasMes.pedidos} pedido(s)
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Pedidos Recentes
          </h3>
        </div>
        
        <div className="p-6">
          {stats.ultimosPedidos.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum pedido recente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.ultimosPedidos.map((pedido) => (
                <div key={pedido.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">
                        #{pedido.id.slice(0, 6)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {pedido.cliente_nome}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(pedido.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
                    {getStatusLabel(pedido.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Ações Rápidas</h3>
          <p className="text-purple-100 mb-4">
            Acesse rapidamente as funcionalidades principais
          </p>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.hash = '#pastas'}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Nova Pasta
            </button>
            <button 
              onClick={() => window.location.hash = '#pedidos'}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Ver Pedidos
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-red-500" />
                Banco de Dados
              </h3>
              {databaseStats && (
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  <div>Pastas: {databaseStats.totalPastas}</div>
                  <div>Pedidos: {databaseStats.totalPedidos}</div>
                </div>
              )}
              <button
                onClick={() => setShowDatabaseManager(true)}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Gerenciar
              </button>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Database Manager Modal */}
      {showDatabaseManager && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDatabaseManager(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Gerenciar Banco de Dados
                </h3>
                <button
                  onClick={() => setShowDatabaseManager(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h4 className="font-semibold text-red-800">Área de Perigo</h4>
                </div>
                <p className="text-sm text-red-700">
                  As ações abaixo são permanentes e não podem ser desfeitas.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={clearPastas}
                  className="w-full p-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg font-medium transition-colors"
                >
                  Excluir Todas as Pastas
                </button>

                <button
                  onClick={clearPedidos}
                  className="w-full p-3 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg font-medium transition-colors"
                >
                  Excluir Todos os Pedidos
                </button>

                <button
                  onClick={clearAllData}
                  className="w-full p-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium transition-colors"
                >
                  Excluir Todos os Dados
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDatabaseManager(false)}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}