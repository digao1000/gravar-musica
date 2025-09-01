import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Download, TrendingUp, DollarSign, ShoppingBag, Users, Filter, FileText, BarChart3, ArrowUpDown, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface RelatorioFiltros {
  dataInicio: string;
  dataFim: string;
  status?: string;
  formaPagamento?: string;
}

interface RelatorioData {
  resumo: {
    totalPedidos: number;
    totalValor: number;
    totalItens: number;
    totalMusicas: number;
    ticketMedio: number;
  };
  vendasPorDia: Array<{
    data: string;
    pedidos: number;
    valor: number;
  }>;
  vendasPorStatus: Array<{
    status: string;
    pedidos: number;
    valor: number;
  }>;
  vendasPorPagamento: Array<{
    forma: string;
    pedidos: number;
    valor: number;
  }>;
  topPastas: Array<{
    nome: string;
    quantidade: number;
    valor: number;
  }>;
  pedidos: Array<{
    id: number;
    cliente_nome: string;
    status: string;
    forma_pagamento: string;
    total_valor: number;
    total_itens: number;
    created_at: string;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe'];

export default function RelatoriosManager() {
  const [filtros, setFiltros] = useState<RelatorioFiltros>({
    dataInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias atrás
    dataFim: new Date().toISOString().split('T')[0] // hoje
  });
  const [dados, setDados] = useState<RelatorioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'resumo' | 'graficos' | 'detalhes'>('resumo');

  useEffect(() => {
    // Não carregar automaticamente ao montar o componente
    // O usuário deve clicar em "Filtrar" para gerar o relatório
  }, []);

  const buscarDados = async () => {
    setLoading(true);
    try {
      // Busca pedidos via Supabase RPC e agrega no cliente
      const { data, error } = await supabase.rpc('get_orders_for_staff');
      if (error) {
        console.error('Erro RPC get_orders_for_staff:', error);
        alert('Erro ao carregar dados de pedidos');
        setLoading(false);
        return;
      }

      const inicio = new Date(filtros.dataInicio + 'T00:00:00');
      const fim = new Date(filtros.dataFim + 'T23:59:59');

      const pedidos = (data || []).filter((p: any) => {
        const d = new Date(p.created_at);
        const byDate = d >= inicio && d <= fim;
        const byStatus = filtros.status ? p.status === filtros.status : true;
        const byPay = filtros.formaPagamento ? p.forma_pagamento === filtros.formaPagamento : true;
        return byDate && byStatus && byPay;
      });

      // Agregações
      const resumo = pedidos.reduce(
        (acc: any, p: any) => {
          acc.totalPedidos += 1;
          acc.totalValor += p.total_valor || 0;
          acc.totalItens += p.total_itens || 0;
          acc.totalMusicas += p.total_musicas || 0;
          return acc;
        },
        { totalPedidos: 0, totalValor: 0, totalItens: 0, totalMusicas: 0, ticketMedio: 0 }
      );
      resumo.ticketMedio = resumo.totalPedidos > 0 ? resumo.totalValor / resumo.totalPedidos : 0;

      const toDateKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

      const mapaDia: Record<string, { data: string; pedidos: number; valor: number }> = {};
      const mapaStatus: Record<string, { status: string; pedidos: number; valor: number }> = {};
      const mapaPagamento: Record<string, { forma: string; pedidos: number; valor: number }> = {};

      for (const p of pedidos) {
        const key = toDateKey(p.created_at);
        mapaDia[key] ||= { data: key, pedidos: 0, valor: 0 };
        mapaDia[key].pedidos += 1;
        mapaDia[key].valor += p.total_valor || 0;

        const st = p.status || 'DESCONHECIDO';
        mapaStatus[st] ||= { status: st, pedidos: 0, valor: 0 };
        mapaStatus[st].pedidos += 1;
        mapaStatus[st].valor += p.total_valor || 0;

        const pay = p.forma_pagamento || 'N/A';
        mapaPagamento[pay] ||= { forma: pay, pedidos: 0, valor: 0 };
        mapaPagamento[pay].pedidos += 1;
        mapaPagamento[pay].valor += p.total_valor || 0;
      }

      const vendasPorDia = Object.values(mapaDia).sort((a, b) => a.data.localeCompare(b.data));
      const vendasPorStatus = Object.values(mapaStatus);
      const vendasPorPagamento = Object.values(mapaPagamento);

      // Top pastas indisponível sem join; placeholder vazio
      const topPastas: RelatorioData['topPastas'] = [];

      setDados({
        resumo,
        vendasPorDia,
        vendasPorStatus,
        vendasPorPagamento,
        topPastas,
        pedidos: pedidos.map((p: any) => ({
          id: p.id,
          cliente_nome: p.cliente_nome,
          status: p.status,
          forma_pagamento: p.forma_pagamento,
          total_valor: p.total_valor,
          total_itens: p.total_itens,
          created_at: p.created_at,
        })),
      });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      alert('Erro de conexão ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroChange = (key: keyof RelatorioFiltros, value: string) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const exportarRelatorio = async () => {
    try {
      if (!dados) return;
      const rows = [
        ['ID', 'Cliente', 'Status', 'Pagamento', 'Total (BRL)', 'Itens', 'Criado em'],
        ...dados.pedidos.map(p => [
          p.id,
          p.cliente_nome,
          p.status,
          p.forma_pagamento,
          String(p.total_valor).replace('.', ','),
          String(p.total_itens),
          new Date(p.created_at).toLocaleString('pt-BR'),
        ])
      ];
      const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${filtros.dataInicio}_${filtros.dataFim}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      alert('Erro ao exportar relatório');
    }
  };

  const imprimirRelatorio = async () => {
    try {
      // Gerar relatório no cliente e imprimir
      if (!dados) {
        alert('Gere um relatório primeiro antes de imprimir');
        return;
      }

      const printContent = `
        <html>
          <head>
            <title>Relatório MusicaDrive</title>
            <style>
              body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
              .header { text-align: center; margin-bottom: 20px; }
              .section { margin-bottom: 15px; }
              .total { font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #000; padding: 3px; text-align: left; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>MusicaDrive - Relatório</h2>
              <p>Período: ${filtros.dataInicio} a ${filtros.dataFim}</p>
            </div>
            
            <div class="section">
              <h3>Resumo</h3>
              <p>Total de Pedidos: ${dados.resumo.totalPedidos}</p>
              <p>Total de Valor: R$ ${dados.resumo.totalValor.toFixed(2)}</p>
              <p>Total de Itens: ${dados.resumo.totalItens}</p>
              <p>Total de Músicas: ${dados.resumo.totalMusicas}</p>
            </div>
            
            <div class="section">
              <h3>Pedidos</h3>
              <table>
                <tr><th>ID</th><th>Cliente</th><th>Status</th><th>Valor</th><th>Data</th></tr>
                ${dados.pedidos.map(p => `
                  <tr>
                    <td>${p.id}</td>
                    <td>${p.cliente_nome}</td>
                    <td>${p.status}</td>
                    <td>R$ ${p.total_valor.toFixed(2)}</td>
                    <td>${new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Erro ao imprimir relatório:', error);
      alert('Erro ao imprimir relatório');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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

  const getFormaPagamentoLabel = (forma: string) => {
    const labels = {
      'DINHEIRO': 'Dinheiro',
      'PIX': 'PIX',
      'CARTAO_DEBITO': 'Cartão Débito',
      'CARTAO_CREDITO': 'Cartão Crédito'
    };
    return labels[forma as keyof typeof labels] || forma;
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => handleFiltroChange('dataInicio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => handleFiltroChange('dataFim', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filtros.status || ''}
              onChange={(e) => handleFiltroChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="ENVIADO">Enviado</option>
              <option value="EM_SEPARACAO">Em Separação</option>
              <option value="PRONTO">Pronto</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pagamento
            </label>
            <select
              value={filtros.formaPagamento || ''}
              onChange={(e) => handleFiltroChange('formaPagamento', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CARTAO_DEBITO">Cartão Débito</option>
              <option value="CARTAO_CREDITO">Cartão Crédito</option>
            </select>
          </div>
          
          {/* Botões - Layout Responsivo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <button
              onClick={buscarDados}
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Carregando...' : (
                <>
                  <ArrowUpDown className="w-4 h-4" />
                  Filtrar
                </>
              )}
            </button>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={exportarRelatorio}
                disabled={loading || !dados}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden xs:inline">CSV</span>
              </button>
              <button
                onClick={imprimirRelatorio}
                disabled={loading || !dados}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden xs:inline">80mm</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação das Views */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'resumo' as const, label: 'Resumo', icon: FileText },
            { id: 'graficos' as const, label: 'Gráficos', icon: BarChart3 },
            { id: 'detalhes' as const, label: 'Detalhes', icon: Users }
          ].map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${activeView === view.id 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando dados...</p>
        </div>
      )}

      {dados && !loading && (
        <>
          {/* Resumo */}
          {activeView === 'resumo' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
                      <p className="text-2xl font-bold text-gray-900">{dados.resumo.totalPedidos}</p>
                    </div>
                    <ShoppingBag className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Faturamento</p>
                      <p className="text-2xl font-bold text-gray-900">{formatPrice(dados.resumo.totalValor)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Itens</p>
                      <p className="text-2xl font-bold text-gray-900">{dados.resumo.totalItens}</p>
                    </div>
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Músicas</p>
                      <p className="text-2xl font-bold text-gray-900">{dados.resumo.totalMusicas.toLocaleString('pt-BR')}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-orange-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                      <p className="text-2xl font-bold text-gray-900">{formatPrice(dados.resumo.ticketMedio)}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-pink-600" />
                  </div>
                </div>
              </div>

              {/* Top Pastas */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pastas Mais Vendidas</h3>
                <div className="space-y-3">
                  {dados.topPastas.map((pasta, index) => (
                    <div key={pasta.nome} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                        </div>
                        <span className="font-medium text-gray-900">{pasta.nome}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">{pasta.quantidade} unidades</span>
                        <span className="font-semibold text-purple-600">{formatPrice(pasta.valor)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Gráficos */}
          {activeView === 'graficos' && (
            <div className="space-y-6">
              {/* Vendas por Dia */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas por Dia</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dados.vendasPorDia}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" tickFormatter={formatDate} />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => formatDate(value as string)}
                        formatter={(value, name) => [
                          name === 'valor' ? formatPrice(value as number) : value,
                          name === 'valor' ? 'Valor' : 'Pedidos'
                        ]}
                      />
                      <Bar dataKey="pedidos" fill="#8884d8" name="pedidos" />
                      <Line type="monotone" dataKey="valor" stroke="#82ca9d" name="valor" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vendas por Status */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas por Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          dataKey="valor"
                          data={dados.vendasPorStatus.map(item => ({
                            ...item,
                            status: getStatusLabel(item.status)
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ status, valor }: any) => `${status}: ${formatPrice(valor)}`}
                        >
                          {dados.vendasPorStatus.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatPrice(value as number)} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Vendas por Forma de Pagamento */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendas por Pagamento</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dados.vendasPorPagamento.map(item => ({
                        ...item,
                        forma: getFormaPagamentoLabel(item.forma)
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="forma" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatPrice(value as number)} />
                        <Bar dataKey="valor" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detalhes */}
          {activeView === 'detalhes' && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Detalhes dos Pedidos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagamento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dados.pedidos.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{pedido.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pedido.cliente_nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {getStatusLabel(pedido.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pedido.forma_pagamento ? getFormaPagamentoLabel(pedido.forma_pagamento) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pedido.total_itens}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                          {formatPrice(pedido.total_valor)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(pedido.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!dados && !loading && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Clique em "Filtrar" para gerar o relatório</p>
        </div>
      )}
    </div>
  );
}
