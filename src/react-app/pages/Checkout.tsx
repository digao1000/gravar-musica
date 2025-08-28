import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCart } from '@/react-app/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, User, Phone, MessageSquare, ArrowLeft, Check, CreditCard, Smartphone, DollarSign } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const { state, getTotals, clearCart } = useCart();
  const totals = getTotals();

  const [formData, setFormData] = useState({
    cliente_nome: '',
    cliente_contato: '',
    forma_pagamento: 'DINHEIRO' as const,
    observacoes: ''
  });

  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');
  const [observacoesError, setObservacoesError] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pedidoId, setPedidoId] = useState<string | null>(null);

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

  const validatePhone = (phone: string) => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Check if it has the correct length (10 or 11 digits)
    if (digits.length < 10 || digits.length > 11) {
      return 'Telefone deve ter 10 ou 11 dígitos (ex: 11999999999)';
    }
    
    // Check if it's a valid mobile number (starts with 9 for mobile)
    if (digits.length === 11 && digits[2] !== '9') {
      return 'Número de celular deve começar com 9 após o DDD';
    }
    
    return '';
  };

  const validateName = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return 'Nome deve ter entre 2 e 100 caracteres';
    }
    if (!/^[A-Za-zÀ-ÿ\s'.-]+$/.test(trimmed)) {
      return 'Nome contém caracteres inválidos';
    }
    return '';
  };

  const validateObservacoes = (text: string) => {
    if (text.length > 500) {
      return 'Observações não podem exceder 500 caracteres';
    }
    return '';
  };

  const handlePhoneChange = (value: string) => {
    // Allow only numbers, spaces, parentheses, and hyphens
    const formattedValue = value.replace(/[^\d\s()-]/g, '');
    setFormData(prev => ({ ...prev, cliente_contato: formattedValue }));
    
    const error = validatePhone(formattedValue);
    setPhoneError(error);
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({ ...prev, cliente_nome: value }));
    const error = validateName(value);
    setNameError(error);
  };

  const handleObservacoesChange = (value: string) => {
    setFormData(prev => ({ ...prev, observacoes: value }));
    const error = validateObservacoes(value);
    setObservacoesError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!totals.canCheckout) {
      alert('Verifique a capacidade do pendrive antes de finalizar');
      return;
    }

    // Validate all fields before submitting
    const phoneValidationError = validatePhone(formData.cliente_contato);
    const nameValidationError = validateName(formData.cliente_nome);
    const observacoesValidationError = validateObservacoes(formData.observacoes);

    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      return;
    }
    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }
    if (observacoesValidationError) {
      setObservacoesError(observacoesValidationError);
      return;
    }

    setLoading(true);

    try {
      // Call the secure database function
      const { data, error } = await supabase.rpc('create_order', {
        p_cliente_nome: formData.cliente_nome.trim(),
        p_cliente_contato: formData.cliente_contato,
        p_pendrive_gb: state.pendriveSize,
        p_forma_pagamento: formData.forma_pagamento,
        p_observacoes: formData.observacoes.trim() || '',
        p_itens: JSON.stringify(state.items.map(item => ({
          pasta_id: item.pasta.id,
          quantidade: item.quantidade
        })))
      });

      if (error) {
        console.error('Error creating order:', error);
        alert(error.message || 'Erro ao criar pedido');
        return;
      }

      if (data) {
        setPedidoId(data);
        setSuccess(true);
        clearCart();
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (state.items.length === 0 && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Carrinho vazio</h2>
          <p className="text-gray-600 mb-6">Adicione algumas pastas antes de finalizar o pedido</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Continuar Comprando
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Pedido Realizado!
          </h1>
          <p className="text-gray-600 mb-4">
            Seu pedido #{pedidoId} foi enviado com sucesso!
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Entraremos em contato pelo número fornecido para confirmar os detalhes e combinar a entrega.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Voltar à Loja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo do Pedido</h2>
            
            <div className="space-y-4 mb-6">
              {state.items.map((item) => (
                <div key={item.pasta.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.pasta.nome}</h3>
                    <p className="text-sm text-gray-600">
                      {item.pasta.codigo && <span className="font-mono text-purple-600">#{item.pasta.codigo}</span>}
                      {item.pasta.codigo && ' • '}
                      {item.quantidade}x • {item.pasta.qtd_musicas} músicas • {formatSize(item.pasta.tamanho_gb)}
                    </p>
                  </div>
                  <span className="font-semibold text-purple-600">
                    {formatPrice(item.pasta.preco * item.quantidade)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span>Total de itens:</span>
                <span>{totals.totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total de músicas:</span>
                <span>{totals.totalMusicas.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tamanho total:</span>
                <span>{formatSize(totals.totalTamanho)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pendrive:</span>
                <span>{state.pendriveSize} GB</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-3">
                <span>Total:</span>
                <span className="text-purple-600">{formatPrice(totals.totalValor)}</span>
              </div>
            </div>

            {/* Capacity Warning */}
            {!totals.canCheckout && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Capacidade do pendrive excedida
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Volte ao carrinho e ajuste o tamanho do pendrive ou remova algumas pastas
                </p>
              </div>
            )}
          </div>

          {/* Customer Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Dados do Cliente</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.cliente_nome}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                    nameError 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-purple-500'
                  }`}
                  placeholder="Seu nome completo"
                />
                {nameError && (
                  <p className="text-red-600 text-sm mt-1">{nameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Telefone/WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.cliente_contato}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                    phoneError 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-purple-500'
                  }`}
                  placeholder="(11) 99999-9999"
                />
                {phoneError && (
                  <p className="text-red-600 text-sm mt-1">{phoneError}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Digite apenas números. Ex: 11999999999 ou (11) 99999-9999
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Forma de Pagamento *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'DINHEIRO', label: 'Dinheiro', icon: DollarSign },
                    { value: 'PIX', label: 'PIX', icon: Smartphone },
                    { value: 'CARTAO_DEBITO', label: 'Cartão Débito', icon: CreditCard },
                    { value: 'CARTAO_CREDITO', label: 'Cartão Crédito', icon: CreditCard }
                  ].map((payment) => {
                    const Icon = payment.icon;
                    return (
                      <label
                        key={payment.value}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.forma_pagamento === payment.value
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="forma_pagamento"
                          value={payment.value}
                          checked={formData.forma_pagamento === payment.value}
                          onChange={(e) => setFormData(prev => ({ ...prev, forma_pagamento: e.target.value as any }))}
                          className="sr-only"
                        />
                        <Icon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">{payment.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Observações (opcional)
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => handleObservacoesChange(e.target.value)}
                  rows={4}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-transparent ${
                    observacoesError 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-purple-500'
                  }`}
                  placeholder="Alguma observação especial sobre seu pedido..."
                />
                {observacoesError && (
                  <p className="text-red-600 text-sm mt-1">{observacoesError}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Máximo 500 caracteres. {formData.observacoes.length}/500
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !totals.canCheckout || !!phoneError || !!nameError || !!observacoesError}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                  totals.canCheckout && !loading && !phoneError && !nameError && !observacoesError
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processando...
                  </div>
                ) : (
                  'Finalizar Pedido'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
