import { X, ShoppingCart, Trash2, Plus, Minus, Music, AlertTriangle } from 'lucide-react';
import { useCart } from '@/react-app/hooks/useCart';
import { PENDRIVE_SIZES } from '@/shared/types';

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export default function CartSidebar({ isOpen, onClose, onCheckout }: CartSidebarProps) {
  const { state, removeItem, updateQuantity, clearCart, setPendriveSize, getTotals } = useCart();
  const totals = getTotals();

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Carrinho</h2>
            <span className="bg-secondary text-secondary-foreground text-sm px-2 py-1 rounded-full">
              {totals.totalItems}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {state.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Carrinho vazio</p>
              <p className="text-sm">Adicione algumas pastas para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.items.map((item) => (
                <div key={item.pasta.id} className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <Music className="w-6 h-6 text-primary-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-card-foreground truncate">
                        {item.pasta.nome}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{item.pasta.qtd_musicas} músicas</span>
                        <span>{formatSize(item.pasta.tamanho_gb)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-semibold text-primary">
                          {formatPrice(item.pasta.preco)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.pasta.id, item.quantidade - 1)}
                            className="w-6 h-6 bg-secondary hover:bg-muted rounded flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {item.quantidade}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.pasta.id, item.quantidade + 1)}
                            className="w-6 h-6 bg-secondary hover:bg-muted rounded flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(item.pasta.id)}
                            className="w-6 h-6 text-destructive hover:bg-destructive/10 rounded flex items-center justify-center transition-colors ml-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {state.items.length > 0 && (
          <div className="border-t border-border p-4 space-y-4">
            {/* Pendrive Size Selector */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Tamanho do Pendrive
              </label>
              <select
                value={state.pendriveSize}
                onChange={(e) => setPendriveSize(parseInt(e.target.value) as any)}
                className="w-full p-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              >
                {PENDRIVE_SIZES.map(size => (
                  <option key={size} value={size}>{size} GB</option>
                ))}
              </select>
            </div>

            {/* Capacity Bar */}
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Uso do pendrive</span>
                <span>{totals.capacityUsed.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    totals.capacityUsed > 100 
                      ? 'bg-destructive' 
                      : totals.capacityUsed > 80 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(totals.capacityUsed, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{formatSize(totals.totalTamanho)}</span>
                <span>{state.pendriveSize} GB</span>
              </div>
            </div>

            {/* Error Message */}
            {!totals.canCheckout && totals.totalItems > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Capacidade do pendrive excedida
                  </span>
                </div>
                <p className="text-xs text-destructive/80 mt-1">
                  Aumente o tamanho do pendrive ou remova algumas pastas
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total de pastas:</span>
                <span className="font-medium">{totals.totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total de músicas:</span>
                <span className="font-medium">{totals.totalMusicas.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tamanho total:</span>
                <span className="font-medium">{formatSize(totals.totalTamanho)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                <span>Total:</span>
                <span className="text-primary">{formatPrice(totals.totalValor)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={onCheckout}
                disabled={!totals.canCheckout}
                className={`w-full py-3 rounded-lg font-medium transition-all duration-200 ${
                  totals.canCheckout
                    ? 'bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-lg hover:shadow-xl'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Finalizar Pedido
              </button>
              
              <button
                onClick={clearCart}
                className="w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpar Carrinho
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
