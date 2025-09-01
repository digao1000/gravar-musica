import { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/react-app/hooks/useSupabaseAuth';
import { LayoutDashboard, Package, ShoppingBag, LogOut, Menu, X, FileText, Users } from 'lucide-react';
import Dashboard from '@/react-app/components/admin/Dashboard';
import PastasManager from '@/react-app/components/admin/PastasManager';
import PedidosManager from '@/react-app/components/admin/PedidosManager';
import RelatoriosManager from '@/react-app/components/admin/RelatoriosManager';
import UsersManager from '@/react-app/components/admin/UsersManager';

type ActiveTab = 'dashboard' | 'pastas' | 'pedidos' | 'usuarios' | 'relatorios';

export default function Admin() {
  const { user, logout } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check URL hash for navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['dashboard', 'pedidos', 'pastas', 'usuarios', 'relatorios'].includes(hash)) {
        setActiveTab(hash as ActiveTab);
      }
    };

    // Set initial tab from hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pastas' as const, label: 'Pastas', icon: Package },
    { id: 'pedidos' as const, label: 'Pedidos', icon: ShoppingBag },
    { id: 'usuarios' as const, label: 'Usuários', icon: Users },
    { id: 'relatorios' as const, label: 'Relatórios', icon: FileText },
  ];

  const handleTabChange = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'pastas':
        return <PastasManager />;
      case 'pedidos':
        return <PedidosManager />;
      case 'usuarios':
        return <UsersManager />;
      case 'relatorios':
        return <RelatoriosManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">MusicaDrive</h1>
                <p className="text-xs text-gray-500">Admin</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      handleTabChange(tab.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                      ${activeTab === tab.id 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role || 'Administrador'}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {activeTab}
            </h2>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {activeTab}
            </h2>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
