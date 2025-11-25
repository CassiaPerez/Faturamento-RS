
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Package, Users, ClipboardCheck, BarChart3, Upload, LogOut } from 'lucide-react';
import { base44 } from "@/api/base44Client";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const getNavItems = () => {
    if (!user) return [];
    
    const permissao = user.permissao_customizada || user.role;
    const items = [];
    
    // Gerenciar Pedidos - apenas admin
    if (permissao === 'admin') {
      items.push({ name: 'GerenciarPedidos', label: 'Gerenciar Pedidos', icon: Upload });
      items.push({ name: 'GerenciarUsuarios', label: 'Gerenciar Usuários', icon: Users });
    }
    
    // Meus Pedidos - apenas vendedores individuais
    if (permissao === 'user' || (!permissao && user.codigo_vendedor)) {
      items.push({ name: 'MeusPedidos', label: 'Meus Pedidos', icon: Package });
    }

    // Painel Vendedor - apenas admin
    if (permissao === 'admin') {
      items.push({ name: 'PainelVendedor', label: 'Painel Vendedor', icon: Package });
    }
    
    // Painel Faturamento - role faturamento ou admin
    if (permissao === 'faturamento' || permissao === 'admin') {
      items.push({ name: 'PainelFaturamento', label: 'Faturamento', icon: ClipboardCheck });
    }
    
    // Painel Gerente - role gerente ou admin
    if (permissao === 'gerente' || permissao === 'admin') {
      items.push({ name: 'PainelGerente', label: 'Painel Gerente', icon: BarChart3 });
    }
    
    return items;
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <style>{`
        :root {
          --color-primary: #1e3a8a;
          --color-primary-dark: #1e40af;
          --color-accent: #059669;
          --color-accent-dark: #047857;
        }
      `}</style>
      
      <nav className="bg-gradient-to-r from-blue-900 to-blue-800 shadow-xl border-b border-blue-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Sistema de Faturamento</h1>
                <p className="text-blue-200 text-sm">Gestão Completa de Pedidos</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
          
          <div className="flex gap-2 pb-4 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.name;
              
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-blue-900 shadow-lg font-semibold'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-140px)]">
        {children}
      </main>

      <footer className="bg-gradient-to-r from-blue-900 to-blue-800 text-blue-200 py-6 border-t border-blue-700">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm">© 2024 Sistema de Faturamento - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
