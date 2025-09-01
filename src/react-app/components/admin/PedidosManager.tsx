import { useState, useEffect } from 'react';
import { Search, Eye, Edit, Trash2, CheckCircle, Clock, Package, Truck, X, Printer, Plus } from 'lucide-react';
import { Pedido, PedidoStatus, Pasta } from '@/shared/types';
import { supabase } from '@/integrations/supabase/client';

interface PedidoWithItems extends Pedido {
  itens?: Array<{
    pasta_id: string;
    quantidade: number;
    pasta: Pasta;
  }>;
}

export default function PedidosManager() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PedidoStatus | ''>('ENVIADO');
  
  // Modal states
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PedidoWithItems | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  
  // Edit form states
  const [editForm, setEditForm] = useState({
    cliente_nome: '',
    cliente_contato: '',
    pendrive_gb: 16,
    observacoes: ''
  });

  // Edit items state (pastas do pedido)
  type EditItem = { pasta_id: string; nome_pasta: string; qtd_musicas: number; tamanho_gb: number; preco_unit: number };
  const [originalEditItems, setOriginalEditItems] = useState<EditItem[]>([]);
  const [currentEditItems, setCurrentEditItems] = useState<EditItem[]>([]);
  const [allPastas, setAllPastas] = useState<Pasta[]>([]);
  const [newPastaIdForAdd, setNewPastaIdForAdd] = useState<string>('');

  useEffect(() => {
    fetchPedidos();
  }, [statusFilter]);

  // Carregar itens e lista de pastas quando abrir modal de edição
  useEffect(() => {
    const loadEditData = async () => {
      if (!showEdit || !editingPedido) return;
      // Buscar itens atuais do pedido (snapshot)
      const { data: itemsData, error: itemsError } = await supabase
        .from('pedido_itens')
        .select('pasta_id, nome_pasta, qtd_musicas, tamanho_gb, preco_unit')
        .eq('pedido_id', editingPedido.id);
      if (!itemsError && itemsData) {
        const mapped: EditItem[] = itemsData.map((i: any) => ({
          pasta_id: i.pasta_id,
          nome_pasta: i.nome_pasta,
          qtd_musicas: i.qtd_musicas,
          tamanho_gb: i.tamanho_gb,
          preco_unit: i.preco_unit,
        }));
        setOriginalEditItems(mapped);
        setCurrentEditItems(mapped);
      }
      // Buscar todas as pastas ativas para adicionar
      const { data: pastasData } = await supabase
        .from('pastas')
        .select('*')
        .eq('is_active', true)
        .order('nome');
      setAllPastas(pastasData as Pasta[] || []);
    };
    loadEditData();
  }, [showEdit, editingPedido]);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      // Use the secure function that masks sensitive data for staff
      const { data: ordersData, error: ordersError } = await supabase
        .rpc('get_orders_for_staff');
      
      if (ordersError) throw ordersError;

      // Apply status filter if needed
      let filteredOrders = ordersData || [];
      if (statusFilter) {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
      }

      // Get order items for each order
      const ordersWithItems = await Promise.all(
        filteredOrders.map(async (order) => {
          const { data: items, error: itemsError } = await supabase
            .from('pedido_itens')
            .select(`
              pasta_id,
              qtd_musicas,
              pasta:pastas(nome, preco)
            `)
            .eq('pedido_id', order.id);

          if (itemsError) console.error('Error fetching items:', itemsError);
          
          return {
            ...order,
            status: order.status as PedidoStatus,
            cliente_contato: order.cliente_contato_masked, // Use masked contact from function
            forma_pagamento: order.forma_pagamento as any || undefined,
            observacoes: order.observacoes || undefined,
            historico_status: undefined, // Not available in masked function
            itens: items?.map(item => ({
              pasta_id: item.pasta_id,
              quantidade: item.qtd_musicas,
              pasta: item.pasta
            })) || []
          };
        })
      );

      setPedidos(ordersWithItems);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidoDetails = async (id: string) => {
    try {
      // Fetch pedido details
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', id)
        .single();

      if (pedidoError) {
        console.error('Error fetching pedido details:', pedidoError);
        return;
      }

      // Fetch pedido items with pasta details
      const { data: itemsData, error: itemsError } = await supabase
        .from('pedido_itens')
        .select(`
          *,
          pastas (*)
        `)
        .eq('pedido_id', id);

      if (itemsError) {
        console.error('Error fetching pedido items:', itemsError);
        return;
      }

      const pedidoWithItems: PedidoWithItems = {
        ...pedidoData,
        status: pedidoData.status as PedidoStatus,
        forma_pagamento: pedidoData.forma_pagamento as any || undefined,
        observacoes: pedidoData.observacoes || undefined,
        historico_status: pedidoData.historico_status ? JSON.stringify(pedidoData.historico_status) : undefined,
        itens: itemsData?.map(item => ({
          pasta_id: item.pasta_id,
          quantidade: 1, // We don't store quantity in pedido_itens, so default to 1
          pasta: {
            ...item.pastas,
            codigo: item.pastas.codigo || undefined,
            capa_url: item.pastas.capa_url || undefined,
            descricao: item.pastas.descricao || undefined,
            genero: item.pastas.genero || undefined
          } as Pasta
        })) || []
      };

      setSelectedPedido(pedidoWithItems);
    } catch (error) {
      console.error('Error fetching pedido details:', error);
    }
  };

  const updatePedidoStatus = async (id: string, status: PedidoStatus) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status })
        .eq('id', id);

      if (error) {
        console.error('Error updating pedido status:', error);
        alert('Erro ao atualizar status do pedido');
        return;
      }

      await fetchPedidos();
      alert('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating pedido status:', error);
      alert('Erro ao atualizar status do pedido');
    }
  };

  const handlePrint = (pedidoId: string) => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (pedido) {
      try {
        sessionStorage.setItem(`pedido_print_${pedidoId}`, JSON.stringify(pedido));
      } catch {}
    }
    const url = `/admin/pedidos/${pedidoId}/print`;
    window.location.assign(url);
  };

  const handleEdit = (pedido: Pedido) => {
    setEditingPedido(pedido);
    setEditForm({
      cliente_nome: pedido.cliente_nome,
      cliente_contato: pedido.cliente_contato,
      pendrive_gb: pedido.pendrive_gb,
      observacoes: pedido.observacoes || ''
    });
    setShowEdit(true);
  };

  const handleAddItem = async () => {
    if (!newPastaIdForAdd) return;
    const exists = currentEditItems.some(i => i.pasta_id === newPastaIdForAdd);
    if (exists) {
      alert('Esta pasta já está no pedido');
      return;
    }
    const pasta = allPastas.find(p => p.id === newPastaIdForAdd);
    if (!pasta) return;
    const newItem: EditItem = {
      pasta_id: pasta.id,
      nome_pasta: pasta.nome,
      qtd_musicas: pasta.qtd_musicas,
      tamanho_gb: pasta.tamanho_gb,
      preco_unit: pasta.preco,
    };
    setCurrentEditItems(prev => [...prev, newItem]);
    setNewPastaIdForAdd('');
  };

  const handleRemoveItem = (pasta_id: string) => {
    setCurrentEditItems(prev => prev.filter(i => i.pasta_id !== pasta_id));
  };

  const handleSaveEdit = async () => {
    if (!editingPedido) return;

    try {
      // Calcular diffs de itens
      const originalIds = new Set(originalEditItems.map(i => i.pasta_id));
      const currentIds = new Set(currentEditItems.map(i => i.pasta_id));

      const toInsert = currentEditItems.filter(i => !originalIds.has(i.pasta_id));
      const toRemoveIds = originalEditItems.filter(i => !currentIds.has(i.pasta_id)).map(i => i.pasta_id);

      // Inserir novos itens (snapshot)
      if (toInsert.length > 0) {
        const insertPayload = toInsert.map(i => ({
          pedido_id: editingPedido.id,
          pasta_id: i.pasta_id,
          nome_pasta: i.nome_pasta,
          qtd_musicas: i.qtd_musicas,
          tamanho_gb: i.tamanho_gb,
          preco_unit: i.preco_unit,
        }));
        const { error: insertErr } = await supabase
          .from('pedido_itens')
          .insert(insertPayload);
        if (insertErr) throw insertErr;
      }

      // Remover itens deletados
      if (toRemoveIds.length > 0) {
        const { error: delErr } = await supabase
          .from('pedido_itens')
          .delete()
          .eq('pedido_id', editingPedido.id)
          .in('pasta_id', toRemoveIds);
        if (delErr) throw delErr;
      }

      // Recalcular totais com base nos itens atuais
      const totals = currentEditItems.reduce(
        (acc, it) => {
          acc.total_gb += Number(it.tamanho_gb) || 0;
          acc.total_valor += Number(it.preco_unit) || 0;
          acc.total_musicas += Number(it.qtd_musicas) || 0;
          acc.total_itens += 1;
          return acc;
        },
        { total_gb: 0, total_valor: 0, total_musicas: 0, total_itens: 0 }
      );

      // Atualizar dados do pedido (campos editáveis + totais)
      const { error: updErr } = await supabase
        .from('pedidos')
        .update({
          cliente_nome: editForm.cliente_nome,
          cliente_contato: editForm.cliente_contato,
          pendrive_gb: editForm.pendrive_gb,
          observacoes: editForm.observacoes || null,
          total_gb: totals.total_gb,
          total_itens: totals.total_itens,
          total_musicas: totals.total_musicas,
          total_valor: totals.total_valor,
        })
        .eq('id', editingPedido.id);

      if (updErr) throw updErr;

      await fetchPedidos();
      setShowEdit(false);
      setEditingPedido(null);
      alert('Pedido atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating pedido:', error);
      alert('Erro ao atualizar pedido');
    }
  };

  const handleDelete = async (pedido: Pedido) => {
    if (!confirm(`Tem certeza que deseja deletar o pedido #${pedido.id.slice(0, 8)}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', pedido.id);

      if (error) {
        console.error('Error deleting pedido:', error);
        alert('Erro ao deletar pedido');
        return;
      }

      await fetchPedidos();
      alert('Pedido deletado com sucesso!');
    } catch (error) {
      console.error('Error deleting pedido:', error);
      alert('Erro ao deletar pedido');
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
    return `${sizeGB.toFixed(1)} GB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusIcon = (status: PedidoStatus) => {
    switch (status) {
      case 'ENVIADO':
        return <Clock className="w-4 h-4" />;
      case 'EM_SEPARACAO':
        return <Package className="w-4 h-4" />;
      case 'PRONTO':
        return <CheckCircle className="w-4 h-4" />;
      case 'ENTREGUE':
        return <Truck className="w-4 h-4" />;
      case 'CANCELADO':
        return <X className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: PedidoStatus) => {
    switch (status) {
      case 'ENVIADO':
        return 'bg-blue-100 text-blue-800';
      case 'EM_SEPARACAO':
        return 'bg-yellow-100 text-yellow-800';
      case 'PRONTO':
        return 'bg-green-100 text-green-800';
      case 'ENTREGUE':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPedidos = pedidos.filter(pedido =>
    pedido.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.cliente_contato.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
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
            onChange={(e) => setStatusFilter(e.target.value as PedidoStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos os status</option>
            <option value="ENVIADO">Enviado</option>
            <option value="EM_SEPARACAO">Em Separação</option>
            <option value="PRONTO">Pronto</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>
        
        <button
          onClick={() => console.log('Ver entregues - funcionalidade futura')}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Truck className="w-5 h-5" />
          Ver Entregues
        </button>
      </div>

      {/* Orders List */}
      {filteredPedidos.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum pedido encontrado
          </h3>
          <p className="text-gray-600">
            Tente ajustar os filtros de busca
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPedidos.map((pedido) => (
            <div key={pedido.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pedido.status)}`}>
                  {getStatusIcon(pedido.status)}
                  {pedido.status}
                </div>
                <span className="text-sm text-gray-500">#{pedido.id.slice(0, 8)}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{pedido.cliente_nome}</h3>
                  <p className="text-sm text-gray-600">{pedido.cliente_contato}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Pendrive:</span>
                    <p className="font-medium">{pedido.pendrive_gb} GB</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total:</span>
                    <p className="font-medium">{formatPrice(pedido.total_valor)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Itens:</span>
                    <p className="font-medium">{pedido.total_itens}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Músicas:</span>
                    <p className="font-medium">{pedido.total_musicas}</p>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Criado em: {formatDate(pedido.created_at)}
                </div>
              </div>

              {/* Botões de Ação - Layout Responsivo */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    fetchPedidoDetails(pedido.id);
                    setShowDetails(true);
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Ver Detalhes</span>
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(pedido)}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                    title="Editar pedido"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden xs:inline">Editar</span>
                  </button>
                  
                  <button
                    onClick={() => handlePrint(pedido.id)}
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                    title="Imprimir pedido"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden xs:inline">Imprimir</span>
                  </button>
                  
                  <button
                    onClick={() => handleDelete(pedido)}
                    className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                    title="Excluir pedido"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden xs:inline">Excluir</span>
                  </button>
                </div>
              </div>

              {/* Quick Status Update */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <select
                  value={pedido.status}
                  onChange={(e) => updatePedidoStatus(pedido.id, e.target.value as PedidoStatus)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="ENVIADO">Enviado</option>
                  <option value="EM_SEPARACAO">Em Separação</option>
                  <option value="PRONTO">Pronto</option>
                  <option value="ENTREGUE">Entregue</option>
                  <option value="CANCELADO">Cancelado</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {showDetails && selectedPedido && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetails(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Detalhes do Pedido #{selectedPedido.id.slice(0, 8)}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Customer Info */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Informações do Cliente</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div><strong>Nome:</strong> {selectedPedido.cliente_nome}</div>
                    <div><strong>Contato:</strong> {selectedPedido.cliente_contato}</div>
                    <div><strong>Pendrive:</strong> {selectedPedido.pendrive_gb} GB</div>
                    {selectedPedido.observacoes && (
                      <div><strong>Observações:</strong> {selectedPedido.observacoes}</div>
                    )}
                  </div>
                </div>

                {/* Order Summary */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Resumo do Pedido</h4>
                  <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                    <div><strong>Total de Itens:</strong> {selectedPedido.total_itens}</div>
                    <div><strong>Total de Músicas:</strong> {selectedPedido.total_musicas}</div>
                    <div><strong>Tamanho Total:</strong> {formatSize(selectedPedido.total_gb)}</div>
                    <div><strong>Valor Total:</strong> {formatPrice(selectedPedido.total_valor)}</div>
                  </div>
                </div>

                {/* Items List */}
                {selectedPedido.itens && selectedPedido.itens.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Itens do Pedido</h4>
                    <div className="space-y-2">
                      {selectedPedido.itens.map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 flex justify-between">
                          <div>
                            <div className="font-medium">{item.pasta.nome}</div>
                            <div className="text-sm text-gray-600">
                              {item.pasta.qtd_musicas} músicas • {formatSize(item.pasta.tamanho_gb)} • {item.pasta.genero}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatPrice(item.pasta.preco)}</div>
                            <div className="text-sm text-gray-600">Qtd: {item.quantidade}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-sm text-gray-500 border-t pt-4">
                  <div>Criado em: {formatDate(selectedPedido.created_at)}</div>
                  <div>Atualizado em: {formatDate(selectedPedido.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEdit && editingPedido && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEdit(false)}></div>
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Editar Pedido
                </h3>
                <button
                  onClick={() => setShowEdit(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.cliente_nome}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cliente_nome: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contato
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.cliente_contato}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cliente_contato: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tamanho do Pendrive (GB)
                  </label>
                  <select
                    value={editForm.pendrive_gb}
                    onChange={(e) => setEditForm(prev => ({ ...prev, pendrive_gb: parseInt(e.target.value) }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value={2}>2 GB</option>
                    <option value={4}>4 GB</option>
                    <option value={8}>8 GB</option>
                    <option value={16}>16 GB</option>
                    <option value={32}>32 GB</option>
                    <option value={64}>64 GB</option>
                    <option value={128}>128 GB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={editForm.observacoes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, observacoes: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Itens do Pedido (adicionar/remover pastas) */}
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Itens do Pedido (Pastas de Músicas)
                  </label>
                  <div className="space-y-2">
                    {currentEditItems.length === 0 ? (
                      <div className="text-sm text-gray-500">Nenhuma pasta adicionada</div>
                    ) : (
                      currentEditItems.map((it) => (
                        <div key={it.pasta_id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                          <div>
                            <div className="font-medium">{it.nome_pasta}</div>
                            <div className="text-xs text-gray-600">{it.qtd_musicas} músicas • {formatSize(it.tamanho_gb)} • {formatPrice(it.preco_unit)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.pasta_id)}
                            className="text-red-600 hover:text-red-700 px-2 py-1 rounded"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}

                    <div className="flex gap-2 items-center">
                      <select
                        value={newPastaIdForAdd}
                        onChange={(e) => setNewPastaIdForAdd(e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Selecionar pasta para adicionar...</option>
                        {allPastas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} — {formatPrice(p.preco)} — {p.qtd_musicas} músicas
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEdit(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}