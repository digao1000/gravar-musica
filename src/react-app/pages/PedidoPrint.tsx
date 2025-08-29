import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { supabase } from '@/integrations/supabase/client';

type Pedido = {
  id: string;
  cliente_nome: string;
  cliente_contato: string;
  pendrive_gb: number;
  forma_pagamento: string;
  observacoes: string | null;
  total_gb: number;
  total_itens: number;
  total_musicas: number;
  total_valor: number;
  created_at: string;
};

export default function PedidoPrint() {
  const { id } = useParams();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    const fetchPedido = async () => {
      if (!id) {
        setError('Pedido não encontrado');
        setLoading(false);
        return;
      }
      // Primeiro tenta recuperar dados do sessionStorage
      try {
        const cached = sessionStorage.getItem(`pedido_print_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setPedido(parsed as Pedido);
          setLoading(false);
          return;
        }
      } catch {}
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        setError(error.message);
      } else {
        setPedido(data as Pedido);
      }
      setLoading(false);
    };
    document.title = `Impressão do Pedido ${id?.slice(0, 8) || ''}`;
    fetchPedido();
  }, [id]);

  useEffect(() => {
    if (!loading && pedido && !hasPrintedRef.current) {
      const trigger = () => {
        if (hasPrintedRef.current) return;
        hasPrintedRef.current = true;
        setTimeout(() => window.print(), 150);
      };
      // tenta imprimir ao carregar e ao ganhar foco
      trigger();
      const onFocus = () => trigger();
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
  }, [loading, pedido]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR');

  if (loading) {
    return <div style={{ padding: 16 }}>Carregando...</div>;
  }

  if (error || !pedido) {
    return <div style={{ padding: 16, color: 'red' }}>Erro: {error || 'Pedido não encontrado'}</div>;
  }

  const handleManualPrint = () => {
    try { window.print(); } catch {}
  };

  return (
    <div
      style={{
        width: 302, // ~80mm a 96dpi
        margin: '0 auto',
        fontFamily: 'monospace',
        padding: 8,
      }}
      onClick={() => { if (!hasPrintedRef.current) handleManualPrint(); }}
    >
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>MusicaDrive</div>
        <div style={{ fontSize: 12 }}>{formatDateTime(pedido.created_at)}</div>
        <div style={{ fontSize: 12 }}>Pedido #{pedido.id.slice(0, 8)}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

      <div style={{ fontSize: 12, lineHeight: 1.4 }}>
        <div><strong>Cliente:</strong> {pedido.cliente_nome}</div>
        <div><strong>Contato:</strong> {pedido.cliente_contato}</div>
        <div><strong>Pendrive:</strong> {pedido.pendrive_gb} GB</div>
        <div><strong>Pagamento:</strong> {pedido.forma_pagamento}</div>
        {pedido.observacoes ? (
          <div style={{ marginTop: 4 }}>
            <strong>Obs:</strong> {pedido.observacoes}
          </div>
        ) : null}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

      <div style={{ fontSize: 12 }}>
        <div>Total de itens: {pedido.total_itens}</div>
        <div>Total de músicas: {pedido.total_musicas}</div>
        <div>Total GB: {pedido.total_gb.toFixed(2)}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
        <span>Total</span>
        <span>{formatPrice(pedido.total_valor)}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
        <button onClick={handleManualPrint} style={{ fontSize: 12, padding: '6px 10px' }}>Imprimir</button>
        <button onClick={() => window.close()} style={{ fontSize: 12, padding: '6px 10px' }}>Fechar</button>
      </div>

      <style>{`
        @page { size: 80mm auto; margin: 4mm; }
        @media print {
          button { display: none; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}


