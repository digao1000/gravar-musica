import { Music, HardDrive, ShoppingCart } from 'lucide-react';
import { Pasta } from '@/shared/types';
import { useCart } from '@/react-app/hooks/useCart';

interface PastaCardProps {
  pasta: Pasta;
}

export default function PastaCard({ pasta }: PastaCardProps) {
  const { addItem } = useCart();

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

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
      <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100">
        {pasta.capa_url ? (
          <img 
            src={pasta.capa_url} 
            alt={pasta.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-16 h-16 text-purple-400" />
          </div>
        )}
        {pasta.genero && (
          <div className="absolute top-2 right-2 bg-black/20 backdrop-blur-sm rounded-full px-2 py-1">
            <span className="text-white text-xs font-medium">{pasta.genero}</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
          {pasta.nome}
        </h3>
        
        {pasta.codigo && (
          <div className="mb-2">
            <span className="inline-block bg-purple-100 text-purple-800 text-xs font-mono px-2 py-1 rounded">
              #{pasta.codigo}
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Music className="w-4 h-4" />
            <span>{pasta.qtd_musicas} músicas</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-4 h-4" />
            <span>{formatSize(pasta.tamanho_gb)}</span>
          </div>
        </div>

        {pasta.descricao && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {pasta.descricao}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-purple-600">
            {formatPrice(pasta.preco)}
          </span>
          
          <button
            onClick={() => addItem(pasta)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
