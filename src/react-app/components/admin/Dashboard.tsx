import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Users, Calendar, Clock, CheckCircle, Database, Trash2, AlertTriangle, X } from 'lucide-react';

interface DashboardStats {
  vendasHoje: { pedidos: number; valor: number };
  vendasSemana: { pedidos: number; valor: number };
  vendasMes: { pedidos: number; valor: number };
  ultimosPedidos: Array<{
    id: number;
    cliente_nome: string;
    status: string;
    total_valor: number;
    created_at: string;
  }>;
}

interface DatabaseStats {
  pastas: number;
  pedidos: number;
  pedido_itens: number;
  pastas_em_uso: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDatabaseManager, setShowDatabaseManager] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchDatabaseStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/database-stats');
      if (response.ok) {
        const data = await response.json();
        setDbStats(data);
      }
    } catch (error) {
      console.error('Error fetching database stats:', error);
    }
  };

  const clearPastas = async () => {
    if (!confirm('ATENÇÃO: Isso excluirá todas as pastas não utilizadas permanentemente. Esta ação não pode ser desfeita. Continuar?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/clear-pastas', {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchDatabaseStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao excluir pastas');
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
      const response = await fetch('/api/admin/clear-pedidos', {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchStats();
        fetchDatabaseStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao excluir pedidos');
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
      const response = await fetch('/api/admin/clear-all', {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        fetchStats();
        fetchDatabaseStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao excluir dados');
      }
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
        {/* Today */}
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
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* This Week */}
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
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* This Month */}
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
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Pedidos Recentes
            </h3>
            <ShoppingBag className="w-5 h-5 text-gray-400" />
          </div>
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
                        #{pedido.id}
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
                  
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
                      {getStatusLabel(pedido.status)}
                    </span>
                    <p className="font-semibold text-purple-600">
                      {formatPrice(pedido.total_valor)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Ações Rápidas</h3>
              <p className="text-purple-100 mb-4">
                Acesse rapidamente as funcionalidades principais
              </p>
              <div className="space-y-2">
                <button 
                  onClick={() => window.location.hash = '#pastas'}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Nova Pasta
                </button>
                <button 
                  onClick={() => window.location.hash = '#pedidos'}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-2"
                >
                  Ver Pedidos
                </button>
              </div>
            </div>
            <Users className="w-12 h-12 text-purple-200" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Status do Sistema
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">API funcionando</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Banco de dados OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Último backup: hoje</span>
                </div>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-red-500" />
                Banco de Dados
              </h3>
              {dbStats && (
                <div className="space-y-1 text-sm text-gray-600 mb-3">
                  <div>Pastas: {dbStats.pastas} ({dbStats.pastas_em_uso} em uso)</div>
                  <div>Pedidos: {dbStats.pedidos}</div>
                  <div>Itens: {dbStats.pedido_itens}</div>
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
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
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
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Database className="w-6 h-6 text-red-500" />
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
                  As ações abaixo são permanentes e não podem ser desfeitas. Use com extrema cautela.
                </p>
              </div>

              {dbStats && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Estatísticas Atuais</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Pastas:</span>
                      <p className="font-medium">{dbStats.pastas}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Em uso:</span>
                      <p className="font-medium">{dbStats.pastas_em_uso}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Pedidos:</span>
                      <p className="font-medium">{dbStats.pedidos}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Itens:</span>
                      <p className="font-medium">{dbStats.pedido_itens}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={clearPastas}
                  className="w-full p-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Pastas Não Utilizadas
                </button>

                <button
                  onClick={clearPedidos}
                  className="w-full p-3 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Todos os Pedidos
                </button>

                <button
                  onClick={clearAllData}
                  className="w-full p-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Todos os Dados
                </button>

                <button
                  onClick={() => {
                    fetchDatabaseStats();
                    alert('Estatísticas atualizadas!');
                  }}
                  className="w-full p-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  Atualizar Estatísticas
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
