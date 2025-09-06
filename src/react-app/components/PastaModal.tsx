import { X, Music, HardDrive } from 'lucide-react';
import { Pasta } from '@/shared/types';

interface PastaModalProps {
  pasta: Pasta;
  isOpen: boolean;
  onClose: () => void;
}

export default function PastaModal({ pasta, isOpen, onClose }: PastaModalProps) {
  if (!isOpen) return null;

  const formatSize = (sizeGB: number) => {
    if (sizeGB < 1) {
      return `${(sizeGB * 1024).toFixed(0)} MB`;
    }
    return `${sizeGB.toFixed(2)} GB`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Detalhes da Pasta</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            <div className="w-full md:w-64 aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex-shrink-0">
              {pasta.capa_url ? (
                <img 
                  src={pasta.capa_url} 
                  alt={pasta.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-16 h-16 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h3 className="text-2xl font-bold text-gray-900">{pasta.nome}</h3>
                {pasta.codigo && (
                  <span className="bg-purple-100 text-purple-700 text-sm font-mono px-2 py-1 rounded">
                    #{pasta.codigo}
                  </span>
                )}
              </div>

              {pasta.genero && (
                <div className="mb-4">
                  <span className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">
                    {pasta.genero}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-6 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  <span>{pasta.qtd_musicas} músicas</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  <span>{formatSize(pasta.tamanho_gb)}</span>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-purple-600">
                  {formatPrice(pasta.preco)}
                </span>
              </div>

              {pasta.descricao && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Descrição:</h4>
                  <p className="text-gray-700 leading-relaxed">{pasta.descricao}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}