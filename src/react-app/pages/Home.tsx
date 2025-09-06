import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, ShoppingCart, Filter, Music } from 'lucide-react';
import PastaCard from '@/react-app/components/PastaCard';
import CartSidebar from '@/react-app/components/CartSidebar';
import { useCart } from '@/react-app/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { Pasta } from '@/shared/types';

export default function Home() {
  const navigate = useNavigate();
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenero, setSelectedGenero] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [minPreco, setMinPreco] = useState('');
  const [maxPreco, setMaxPreco] = useState('');
  const [categorias, setCategorias] = useState<{ nome: string }[]>([]);

  const { getTotals } = useCart();
  const totals = getTotals();

  useEffect(() => {
    fetchCategorias();
    fetchPastas();
  }, [searchTerm, selectedGenero, minPreco, maxPreco]);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('nome')
        .eq('is_active', true)
        .order('nome');

      if (error) {
        console.error('Error fetching categorias:', error);
      } else {
        setCategorias(data || []);
      }
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const fetchPastas = async () => {
    try {
      let query = supabase
        .from('pastas')
        .select('*')
        .eq('is_active', true);

      // Apply search filter
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`);
      }

      // Apply genre filter
      if (selectedGenero) {
        query = query.eq('genero', selectedGenero);
      }

      // Apply price filters
      if (minPreco) {
        query = query.gte('preco', parseFloat(minPreco));
      }
      if (maxPreco) {
        query = query.lte('preco', parseFloat(maxPreco));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pastas:', error);
      } else {
        setPastas(data?.map(pasta => ({
          ...pasta,
          codigo: pasta.codigo || undefined,
          capa_url: pasta.capa_url || undefined,
          descricao: pasta.descricao || undefined,
          genero: pasta.genero || undefined
        })) || []);
      }
    } catch (error) {
      console.error('Error fetching pastas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MusicaDrive</h1>
                <p className="text-xs text-gray-500">Sua música favorita no pendrive</p>
              </div>
            </div>

            <button
              onClick={() => setCartOpen(true)}
              className="relative bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline">Carrinho</span>
              {totals.totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                  {totals.totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome, código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filtros
            </button>

            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-4">
              <select
                value={selectedGenero}
                onChange={(e) => setSelectedGenero(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Todos os gêneros</option>
                {categorias.map(categoria => (
                  <option key={categoria.nome} value={categoria.nome}>{categoria.nome}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Preço mín."
                value={minPreco}
                onChange={(e) => setMinPreco(e.target.value)}
                className="w-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />

              <input
                type="number"
                placeholder="Preço máx."
                value={maxPreco}
                onChange={(e) => setMaxPreco(e.target.value)}
                className="w-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="lg:hidden mt-4 pt-4 border-t border-gray-200 space-y-4">
              <select
                value={selectedGenero}
                onChange={(e) => setSelectedGenero(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Todos os gêneros</option>
                {categorias.map(categoria => (
                  <option key={categoria.nome} value={categoria.nome}>{categoria.nome}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Preço mínimo"
                  value={minPreco}
                  onChange={(e) => setMinPreco(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />

                <input
                  type="number"
                  placeholder="Preço máximo"
                  value={maxPreco}
                  onChange={(e) => setMaxPreco(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pastas de Música
          </h2>
          <p className="text-gray-600">
            {pastas.length} pastas encontradas
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-8 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!loading && pastas.length > 0 && (
          <div className="grid grid-cols-4 gap-6">
            {pastas.map((pasta) => (
              <PastaCard key={pasta.id} pasta={pasta} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && pastas.length === 0 && (
          <div className="text-center py-12">
            <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma pasta encontrada
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros de busca
            </p>
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <CartSidebar 
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
