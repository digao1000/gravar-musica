import { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle, Clock, Package, Truck, X, Printer, CreditCard, DollarSign, Smartphone, Edit3, Archive, Trash2, Plus, Minus } from 'lucide-react';
import { Pedido, PedidoStatus, Pasta } from '@/shared/types';

interface PedidoWithItems extends Pedido {
  itens?: Array<{
    id: number;
    nome_pasta: string;
    qtd_musicas: number;
    tamanho_gb: number;
    preco_unit: number;
  }>;
}

export default function PedidosManager() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<PedidoWithItems | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({
    cliente_nome: '',
    cliente_contato: '',
    forma_pagamento: '',
    observacoes: ''
  });
  const [showDelivered, setShowDelivered] = useState(false);
  const [deliveredPedidos, setDeliveredPedidos] = useState<Pedido[]>([]);
  const [showEditItems, setShowEditItems] = useState(false);
  const [availablePastas, setAvailablePastas] = useState<Pasta[]>([]);
  const [editItems, setEditItems] = useState<Array<{
    pasta_id: number;
    quantidade: number;
    pasta: Pasta;
  }>>([]);
  const [searchPasta, setSearchPasta] = useState('');

  const statusOptions = [
    { value: 'ENVIADO', label: 'Enviado', icon: Clock, color: 'bg-blue-100 text-blue-800' },
    { value: 'EM_SEPARACAO', label: 'Em Separação', icon: Package, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'PRONTO', label: 'Pronto', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    { value: 'ENTREGUE', label: 'Entregue', icon: Truck, color: 'bg-gray-100 text-gray-800' },
    { value: 'CANCELADO', label: 'Cancelado', icon: X, color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchPedidos();
  }, [statusFilter]);

  const fetchPedidos = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/pedidos?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPedidos(data);
      }
    } catch (error) {
      console.error('Error fetching pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidoDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/pedidos/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedPedido(data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching pedido details:', error);
    }
  };

  const updatePedidoStatus = async (id: number, status: PedidoStatus) => {
    try {
      const response = await fetch(`/api/pedidos/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await fetchPedidos();
        if (selectedPedido && selectedPedido.id === id) {
          await fetchPedidoDetails(id);
        }
        alert('Status atualizado com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatSize = (sizeGB: number) => {
    if (sizeGB < 1) {
      return `${(sizeGB * 1024).toFixed(0)} MB`;
    }
    return `${sizeGB.toFixed(2)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = async (pedidoId: number) => {
    try {
      const response = await fetch(`/api/pedidos/${pedidoId}/print`);
      if (response.ok) {
        const receiptHtml = await response.text();
        
        // Create optimized print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.write(receiptHtml);
          printWindow.document.close();
          
          // Wait for content to load then print
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 250);
          };
        }
      }
    } catch (error) {
      console.error('Error printing:', error);
      alert('Erro ao imprimir pedido');
    }
  };

  const handleEdit = (pedido: Pedido) => {
    if (pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO') {
      alert('Não é possível editar pedidos entregues ou cancelados');
      return;
    }
    
    setEditData({
      cliente_nome: pedido.cliente_nome,
      cliente_contato: pedido.cliente_contato,
      forma_pagamento: pedido.forma_pagamento || '',
      observacoes: pedido.observacoes || ''
    });
    setSelectedPedido(pedido as any);
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPedido) return;
    
    try {
      const response = await fetch(`/api/pedidos/${selectedPedido.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        await fetchPedidos();
        setShowEdit(false);
        alert('Pedido atualizado com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao atualizar pedido');
      }
    } catch (error) {
      console.error('Error updating pedido:', error);
      alert('Erro ao atualizar pedido');
    }
  };

  const fetchDeliveredPedidos = async () => {
    try {
      // Use the main pedidos endpoint with status filter for delivered orders
      const response = await fetch('/api/pedidos?status=ENTREGUE');
      if (response.ok) {
        const data = await response.json();
        setDeliveredPedidos(data);
      }
    } catch (error) {
      console.error('Error fetching delivered pedidos:', error);
    }
  };

  const handleStatusUpdate = async (id: number, status: PedidoStatus) => {
    await updatePedidoStatus(id, status);
    
    // If status changed to delivered, refresh delivered list and main list
    if (status === 'ENTREGUE') {
      fetchDeliveredPedidos();
      // Refresh main pedidos list to remove delivered order
      fetchPedidos();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/pedidos/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchPedidos();
        alert('Pedido excluído com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao excluir pedido');
      }
    } catch (error) {
      console.error('Error deleting pedido:', error);
      alert('Erro ao excluir pedido');
    }
  };

  const fetchAvailablePastas = async () => {
    try {
      const response = await fetch('/api/pastas');
      if (response.ok) {
        const data = await response.json();
        setAvailablePastas(data);
      }
    } catch (error) {
      console.error('Error fetching pastas:', error);
    }
  };

  const handleEditItems = async (pedido: Pedido) => {
    if (pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO') {
      alert('Não é possível editar itens de pedidos entregues ou cancelados');
      return;
    }
    
    setSelectedPedido(pedido as any);
    
    try {
      // Get current items from pedido details
      const response = await fetch(`/api/pedidos/${pedido.id}`);
      if (response.ok) {
        const data = await response.json();
        
        if (data.itens && data.itens.length > 0) {
          // Map current items with their quantities
          const itemCounts: { [key: number]: number } = {};
          data.itens.forEach((item: any) => {
            itemCounts[item.pasta_id] = (itemCounts[item.pasta_id] || 0) + 1;
          });
          
          // Create unique items with quantities
          const uniqueItems = Object.entries(itemCounts).map(([pastaId, quantidade]) => {
            const item = data.itens.find((i: any) => i.pasta_id === parseInt(pastaId));
            return {
              pasta_id: parseInt(pastaId),
              quantidade,
              pasta: {
                id: parseInt(pastaId),
                nome: item.nome_pasta,
                qtd_musicas: item.qtd_musicas,
                tamanho_gb: item.tamanho_gb,
                preco: item.preco_unit,
                is_active: true,
                created_at: '',
                updated_at: ''
              } as Pasta
            };
          });
          
          setEditItems(uniqueItems);
        } else {
          setEditItems([]);
        }
        
        await fetchAvailablePastas();
        setSearchPasta('');
        setShowEditItems(true);
      } else {
        alert('Erro ao carregar dados do pedido');
      }
    } catch (error) {
      console.error('Error loading pedido details:', error);
      alert('Erro ao carregar dados do pedido');
    }
  };

  const addItemToEdit = (pasta: Pasta) => {
    const existingItem = editItems.find(item => item.pasta_id === pasta.id);
    if (existingItem) {
      setEditItems(prev => prev.map(item => 
        item.pasta_id === pasta.id 
          ? { ...item, quantidade: item.quantidade + 1 }
          : item
      ));
    } else {
      setEditItems(prev => [...prev, {
        pasta_id: pasta.id,
        quantidade: 1,
        pasta
      }]);
    }
  };

  const removeItemFromEdit = (pastaId: number) => {
    setEditItems(prev => prev.filter(item => item.pasta_id !== pastaId));
  };

  const updateItemQuantity = (pastaId: number, quantidade: number) => {
    if (quantidade <= 0) {
      removeItemFromEdit(pastaId);
    } else {
      setEditItems(prev => prev.map(item => 
        item.pasta_id === pastaId 
          ? { ...item, quantidade }
          : item
      ));
    }
  };

  const handleSaveEditItems = async () => {
    if (!selectedPedido || editItems.length === 0) {
      alert('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      // Validate that all pasta IDs exist in available pastas
      const invalidItems = editItems.filter(item => 
        !availablePastas.some(pasta => pasta.id === item.pasta_id)
      );

      if (invalidItems.length > 0) {
        console.error('Invalid pasta IDs:', invalidItems.map(item => item.pasta_id));
        alert('Algumas pastas selecionadas não estão mais disponíveis. Remova-as e tente novamente.');
        return;
      }

      const response = await fetch(`/api/pedidos/${selectedPedido.id}/itens`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itens: editItems.map(item => ({
            pasta_id: item.pasta_id,
            quantidade: item.quantidade
          }))
        })
      });

      if (response.ok) {
        await fetchPedidos();
        setShowEditItems(false);
        setShowDetails(false);
        alert('Itens do pedido atualizados com sucesso!');
      } else {
        const error = await response.json();
        console.error('Server error:', error);
        alert(error.error || 'Erro ao atualizar itens');
      }
    } catch (error) {
      console.error('Error updating items:', error);
      alert('Erro ao atualizar itens');
    }
  };

  const getPaymentIcon = (forma: string) => {
    switch (forma) {
      case 'PIX': return Smartphone;
      case 'CARTAO_DEBITO':
      case 'CARTAO_CREDITO': return CreditCard;
      default: return DollarSign;
    }
  };

  const getPaymentLabel = (forma: string) => {
    const labels = {
      'DINHEIRO': 'Dinheiro',
      'PIX': 'PIX',
      'CARTAO_DEBITO': 'Cartão Débito',
      'CARTAO_CREDITO': 'Cartão Crédito'
    };
    return labels[forma as keyof typeof labels] || forma;
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(opt => opt.value === status) || statusOptions[0];
  };

  const filteredAvailablePastas = availablePastas.filter(pasta =>
    pasta.nome.toLowerCase().includes(searchPasta.toLowerCase()) ||
    pasta.codigo?.toLowerCase().includes(searchPasta.toLowerCase()) ||
    pasta.genero?.toLowerCase().includes(searchPasta.toLowerCase())
  );

  const filteredPedidos = pedidos.filter(pedido => {
    // Exclude delivered orders from main list
    if (pedido.status === 'ENTREGUE') return false;
    
    return (
      pedido.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.cliente_contato.includes(searchTerm) ||
      pedido.id.toString().includes(searchTerm)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar pedidos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os status</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={() => {
            setShowDelivered(true);
            fetchDeliveredPedidos();
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Archive className="w-4 h-4" />
          Pedidos Entregues
        </button>
      </div>

      {/* Pedidos List */}
      {filteredPedidos.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
          </h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter ? 'Tente ajustar os filtros de busca' : 'Os pedidos aparecerão aqui quando forem feitos'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPedidos.map((pedido) => {
            const statusInfo = getStatusInfo(pedido.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div key={pedido.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">
                        #{pedido.id}
                      </span>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {pedido.cliente_nome}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {pedido.cliente_contato}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDate(pedido.created_at)}</span>
                        {pedido.forma_pagamento && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {(() => {
                                const Icon = getPaymentIcon(pedido.forma_pagamento);
                                return <Icon className="w-3 h-3" />;
                              })()}
                              {getPaymentLabel(pedido.forma_pagamento)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {pedido.total_itens} itens • {formatSize(pedido.total_gb)} • {pedido.pendrive_gb}GB
                      </p>
                      <p className="font-bold text-purple-600">
                        {formatPrice(pedido.total_valor)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePrint(pedido.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Imprimir"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(pedido)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar pedido"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditItems(pedido)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Editar itens"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => fetchPedidoDetails(pedido.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pedido.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir pedido"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Status Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 mr-2">Status:</span>
                    <select
                      value={pedido.status}
                      onChange={(e) => handleStatusUpdate(pedido.id, e.target.value as PedidoStatus)}
                      className="px-3 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pedido Details Modal */}
      {showDetails && selectedPedido && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetails(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Pedido #{selectedPedido.id}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint(selectedPedido.id)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Dados do Cliente</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Nome:</span>
                        <p className="text-gray-900">{selectedPedido.cliente_nome}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Contato:</span>
                        <p className="text-gray-900">{selectedPedido.cliente_contato}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Data do Pedido:</span>
                        <p className="text-gray-900">{formatDate(selectedPedido.created_at)}</p>
                      </div>
                      {selectedPedido.forma_pagamento && (
                        <div>
                          <span className="text-sm font-medium text-gray-600">Forma de Pagamento:</span>
                          <div className="flex items-center gap-2 text-gray-900">
                            {(() => {
                              const Icon = getPaymentIcon(selectedPedido.forma_pagamento);
                              return <Icon className="w-4 h-4" />;
                            })()}
                            {getPaymentLabel(selectedPedido.forma_pagamento)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedPedido.observacoes && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Observações</h4>
                      <p className="text-gray-700">{selectedPedido.observacoes}</p>
                    </div>
                  )}

                  {/* Status History */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Histórico de Status</h4>
                    <div className="space-y-2">
                      {JSON.parse(selectedPedido.historico_status || '[]').map((entry: any, index: number) => {
                        const statusInfo = getStatusInfo(entry.status);
                        const StatusIcon = statusInfo.icon;
                        
                        return (
                          <div key={index} className="flex items-center gap-3">
                            <div className={`p-1 rounded-full ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3" />
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">{statusInfo.label}</span>
                              <p className="text-xs text-gray-500">
                                {formatDate(entry.timestamp)} • {entry.usuario}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Resumo do Pedido</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total de Itens:</span>
                        <p className="font-medium">{selectedPedido.total_itens}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Total de Músicas:</span>
                        <p className="font-medium">{selectedPedido.total_musicas.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Tamanho Total:</span>
                        <p className="font-medium">{formatSize(selectedPedido.total_gb)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Pendrive:</span>
                        <p className="font-medium">{selectedPedido.pendrive_gb} GB</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total:</span>
                        <span className="text-xl font-bold text-purple-600">
                          {formatPrice(selectedPedido.total_valor)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Itens do Pedido</h4>
                    <div className="space-y-3">
                      {selectedPedido.itens?.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{item.nome_pasta}</h5>
                              <p className="text-sm text-gray-600">
                                {item.qtd_musicas} músicas • {formatSize(item.tamanho_gb)}
                              </p>
                            </div>
                            <span className="font-semibold text-purple-600">
                              {formatPrice(item.preco_unit)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Alterar Status</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.map((status) => {
                        const Icon = status.icon;
                        const isCurrentStatus = status.value === selectedPedido.status;
                        
                        return (
                          <button
                            key={status.value}
                            onClick={() => updatePedidoStatus(selectedPedido.id, status.value as PedidoStatus)}
                            disabled={isCurrentStatus}
                            className={`p-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                              isCurrentStatus
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {status.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && selectedPedido && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEdit(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Editar Pedido #{selectedPedido.id}
                </h3>
                <button
                  onClick={() => setShowEdit(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={editData.cliente_nome}
                    onChange={(e) => setEditData(prev => ({ ...prev, cliente_nome: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
                  <input
                    type="text"
                    value={editData.cliente_contato}
                    onChange={(e) => setEditData(prev => ({ ...prev, cliente_contato: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                  <select
                    value={editData.forma_pagamento}
                    onChange={(e) => setEditData(prev => ({ ...prev, forma_pagamento: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO_DEBITO">Cartão Débito</option>
                    <option value="CARTAO_CREDITO">Cartão Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={editData.observacoes}
                    onChange={(e) => setEditData(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => setShowEdit(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Orders Modal */}
      {showDelivered && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDelivered(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-6xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Pedidos Entregues
                </h3>
                <button
                  onClick={() => setShowDelivered(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {deliveredPedidos.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum pedido entregue</h3>
                    <p className="text-gray-600">Os pedidos entregues aparecerão aqui</p>
                  </div>
                ) : (
                  deliveredPedidos.map((pedido) => (
                    <div key={pedido.id} className="bg-gray-50 rounded-xl p-4 border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Truck className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">#{pedido.id} - {pedido.cliente_nome}</h4>
                            <p className="text-sm text-gray-600">
                              {pedido.cliente_contato} • {formatDate(pedido.updated_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatPrice(pedido.total_valor)}</p>
                          <p className="text-sm text-gray-500">{pedido.total_itens} itens</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Items Modal */}
      {showEditItems && selectedPedido && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditItems(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Editar Itens - Pedido #{selectedPedido.id}
                </h3>
                <button
                  onClick={() => setShowEditItems(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Pastas */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Pastas Disponíveis</h4>
                  
                  {/* Search Input */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Pesquisar pastas..."
                        value={searchPasta}
                        onChange={(e) => setSearchPasta(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {filteredAvailablePastas.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        {searchPasta ? 'Nenhuma pasta encontrada' : 'Carregando pastas...'}
                      </div>
                    ) : (
                      filteredAvailablePastas.map((pasta) => (
                        <div key={pasta.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{pasta.nome}</h5>
                              <p className="text-sm text-gray-600">
                                {pasta.codigo && <span className="text-purple-600 font-mono">{pasta.codigo} • </span>}
                                {pasta.qtd_musicas} músicas • {formatSize(pasta.tamanho_gb)} • {formatPrice(pasta.preco)}
                                {pasta.genero && <span className="text-gray-500"> • {pasta.genero}</span>}
                              </p>
                            </div>
                            <button
                              onClick={() => addItemToEdit(pasta)}
                              className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                              title="Adicionar ao pedido"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Selected Items */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">Itens Selecionados</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {editItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Nenhum item selecionado
                      </div>
                    ) : (
                      editItems.map((item) => (
                        <div key={item.pasta_id} className="bg-purple-50 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{item.pasta.nome}</h5>
                              <p className="text-sm text-gray-600">
                                {item.pasta.qtd_musicas} músicas • {formatSize(item.pasta.tamanho_gb)} • {formatPrice(item.pasta.preco)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateItemQuantity(item.pasta_id, item.quantidade - 1)}
                                className="p-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantidade}</span>
                              <button
                                onClick={() => updateItemQuantity(item.pasta_id, item.quantidade + 1)}
                                className="p-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removeItemFromEdit(item.pasta_id)}
                                className="p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded transition-colors ml-2"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary */}
                  {editItems.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Total de Itens:</span>
                          <span>{editItems.reduce((sum, item) => sum + item.quantidade, 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Músicas:</span>
                          <span>{editItems.reduce((sum, item) => sum + (item.pasta.qtd_musicas * item.quantidade), 0).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tamanho Total:</span>
                          <span>{formatSize(editItems.reduce((sum, item) => sum + (item.pasta.tamanho_gb * item.quantidade), 0))}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Valor Total:</span>
                          <span>{formatPrice(editItems.reduce((sum, item) => sum + (item.pasta.preco * item.quantidade), 0))}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveEditItems}
                      disabled={editItems.length === 0}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200"
                    >
                      Salvar Alterações
                    </button>
                    <button
                      onClick={() => setShowEditItems(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
