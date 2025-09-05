import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Search, Music, Save, X, Download, Upload } from 'lucide-react';
import { Pasta } from '@/shared/types';
import { supabase } from '@/integrations/supabase/client';

interface PastaFormData {
  nome: string;
  codigo?: string;
  qtd_musicas: number;
  tamanho_gb: number;
  preco: number;
  capa_url?: string;
  descricao?: string;
  genero?: string;
  is_active: boolean;
}

export default function PastasManager() {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPasta, setEditingPasta] = useState<Pasta | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<PastaFormData>({
    nome: '',
    codigo: '',
    qtd_musicas: 0,
    tamanho_gb: 0,
    preco: 0,
    capa_url: '',
    descricao: '',
    genero: '',
    is_active: true
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categorias, setCategorias] = useState<Array<{id: string; nome: string; cor: string | null}>>([]);

  useEffect(() => {
    fetchPastas();
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nome, cor')
        .eq('is_active', true)
        .order('nome');
      
      if (!error && data) {
        setCategorias(data);
      }
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const fetchPastas = async () => {
    try {
      const { data, error } = await supabase
        .from('pastas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pastas:', error);
      } else {
        const pastasWithDefaults = data?.map(pasta => ({
          ...pasta,
          codigo: pasta.codigo || undefined,
          capa_url: pasta.capa_url || undefined,
          descricao: pasta.descricao || undefined,
          genero: pasta.genero || undefined
        })) || [];
        setPastas(pastasWithDefaults);
      }
    } catch (error) {
      console.error('Error fetching pastas:', error);
    } finally {
      setLoading(false);
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
  
  const DEFAULT_CODE_PREFIX = 'MUS';
  const CODE_PAD_LENGTH = 4;

  const generateNextCodigo = async (prefix: string = DEFAULT_CODE_PREFIX): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('pastas')
        .select('codigo')
        .not('codigo', 'is', null)
        .limit(1000);

      if (error) {
        console.warn('Não foi possível buscar códigos existentes. Gerando padrão.', error);
      }

      let maxNum = 0;
      (data || []).forEach((row: { codigo: string | null }) => {
        const code = (row.codigo || '').toString();
        if (code.startsWith(prefix)) {
          const match = code.match(/(\d+)$/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n)) {
              maxNum = Math.max(maxNum, n);
            }
          }
        }
      });

      const next = maxNum + 1;
      return `${prefix}${String(next).padStart(CODE_PAD_LENGTH, '0')}`;
    } catch (e) {
      console.warn('Falha ao gerar código automaticamente. Usando fallback MUS0001.', e);
      return `${prefix}${String(1).padStart(CODE_PAD_LENGTH, '0')}`;
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      qtd_musicas: 0,
      tamanho_gb: 0,
      preco: 0,
      capa_url: '',
      descricao: '',
      genero: '',
      is_active: true
    });
    setEditingPasta(null);
    setShowForm(false);
  };

  const handleEdit = (pasta: Pasta) => {
    setFormData({
      nome: pasta.nome,
      codigo: pasta.codigo || '',
      qtd_musicas: pasta.qtd_musicas,
      tamanho_gb: pasta.tamanho_gb,
      preco: pasta.preco,
      capa_url: pasta.capa_url || '',
      descricao: pasta.descricao || '',
      genero: pasta.genero || '',
      is_active: pasta.is_active
    });
    setEditingPasta(pasta);
    setShowForm(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Converter arquivo para base64 para armazenar diretamente
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setFormData(prev => ({ ...prev, capa_url: base64 }));
        alert('Imagem carregada com sucesso!');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageDownload = async (url: string, filename: string) => {
    if (!url) {
      alert('Nenhuma imagem para baixar');
      return;
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'capa.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Erro ao baixar imagem');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submitting pasta form:', { formData, editingPasta: !!editingPasta });
    
    // Validate required fields
    if (!formData.nome.trim()) {
      alert('Nome da pasta é obrigatório');
      return;
    }

    if (formData.qtd_musicas <= 0) {
      alert('Quantidade de músicas deve ser maior que zero');
      return;
    }

    if (formData.tamanho_gb <= 0) {
      alert('Tamanho deve ser maior que zero');
      return;
    }

    if (formData.preco < 0) {
      alert('Preço não pode ser negativo');
      return;
    }
    
    try {
      // Gerar código automaticamente se for um novo cadastro e o campo estiver vazio
      let codigoToUse = formData.codigo?.trim() || '';
      if (!editingPasta && !codigoToUse) {
        codigoToUse = await generateNextCodigo();
      }

      // Clean data before sending
      const cleanedData = {
        nome: formData.nome.trim(),
        codigo: codigoToUse || null,
        descricao: formData.descricao?.trim() || null,
        genero: formData.genero?.trim() || null,
        capa_url: formData.capa_url?.trim() || null,
        qtd_musicas: formData.qtd_musicas,
        tamanho_gb: formData.tamanho_gb,
        preco: formData.preco,
        is_active: formData.is_active
      };
      
      let result;
      if (editingPasta) {
        // Update existing pasta
        result = await supabase
          .from('pastas')
          .update(cleanedData)
          .eq('id', editingPasta.id);
      } else {
        // Create new pasta
        result = await supabase
          .from('pastas')
          .insert([cleanedData]);
      }

      if (result.error) {
        console.error('Error saving pasta:', result.error);
        alert('Erro ao salvar pasta: ' + result.error.message);
        return;
      }

      await fetchPastas();
      resetForm();
      alert(editingPasta ? 'Pasta atualizada com sucesso!' : 'Pasta criada com sucesso!');
    } catch (error) {
      console.error('Error saving pasta:', error);
      alert('Erro de conexão. Verifique sua internet e tente novamente.');
    }
  };

  const handleDelete = async (pasta: Pasta) => {
    if (!confirm(`Tem certeza que deseja deletar a pasta "${pasta.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('pastas')
        .delete()
        .eq('id', pasta.id);

      if (error) {
        console.error('Error deleting pasta:', error);
        alert('Erro ao deletar pasta: ' + error.message);
        return;
      }

      await fetchPastas();
      alert('Pasta deletada com sucesso!');
    } catch (error) {
      console.error('Error deleting pasta:', error);
      alert('Erro ao deletar pasta. Tente novamente.');
    }
  };

  const filteredPastas = pastas.filter(pasta =>
    pasta.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pasta.genero && pasta.genero.toLowerCase().includes(searchTerm.toLowerCase()))
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar pastas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Nova Pasta
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={resetForm}></div>
            
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingPasta ? 'Editar Pasta' : 'Nova Pasta'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Pasta *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código da Pasta
                    </label>
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                      placeholder="Ex: MUS0001 (gerado automaticamente se vazio)"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoria/Gênero
                    </label>
                    <select
                      value={formData.genero}
                      onChange={(e) => setFormData(prev => ({ ...prev, genero: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade de Músicas *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.qtd_musicas}
                      onChange={(e) => setFormData(prev => ({ ...prev, qtd_musicas: parseInt(e.target.value) || 0 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tamanho (GB) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.tamanho_gb}
                      onChange={(e) => setFormData(prev => ({ ...prev, tamanho_gb: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço (R$) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.preco}
                      onChange={(e) => setFormData(prev => ({ ...prev, preco: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Imagem da Capa
                    </label>
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={formData.capa_url || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, capa_url: e.target.value }))}
                        placeholder="URL da imagem ou envie um arquivo"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                        />
                        
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4" />
                          {isUploading ? 'Enviando...' : 'Enviar Imagem'}
                        </button>
                        
                        {formData.capa_url && (
                          <button
                            type="button"
                            onClick={() => handleImageDownload(formData.capa_url!, `capa_${formData.nome || 'pasta'}.jpg`)}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Baixar
                          </button>
                        )}
                      </div>
                      
                      {formData.capa_url && (
                        <div className="mt-2">
                          <img
                            src={formData.capa_url}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Pasta ativa (visível na loja)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {editingPasta ? 'Atualizar' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pastas Grid */}
      {filteredPastas.length === 0 ? (
        <div className="text-center py-12">
          <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nenhuma pasta encontrada' : 'Nenhuma pasta cadastrada'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? 'Tente ajustar os termos de busca' : 'Comece criando sua primeira pasta'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Criar Primeira Pasta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPastas.map((pasta) => (
            <div key={pasta.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
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
                <div className="absolute top-2 right-2 flex gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pasta.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {pasta.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
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
                  <span>{pasta.qtd_musicas} músicas</span>
                  <span>{formatSize(pasta.tamanho_gb)}</span>
                  {pasta.genero && <span>{pasta.genero}</span>}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-xl font-bold text-purple-600">
                    {formatPrice(pasta.preco)}
                  </span>
                  
                  {/* Botões de Ação - Layout Responsivo */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleEdit(pasta)}
                      className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      title="Editar pasta"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm">Editar</span>
                    </button>
                    <button
                      onClick={() => handleDelete(pasta)}
                      className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                      title="Deletar pasta"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Deletar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
