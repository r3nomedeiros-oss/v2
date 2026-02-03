import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NovoLancamento from './pages/NovoLancamento';
import Lancamentos from './pages/Lancamentos';
import DetalhesLancamento from './pages/DetalhesLancamento';
import EditarLancamento from './pages/EditarLancamento';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';
import Login from './pages/Login';
import { Factory, ClipboardList, BarChart3, PlusCircle, Users, LogOut } from 'lucide-react';
import './App.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Navigation({ user, onLogout }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <Factory size={32} />
        {isSidebarOpen && <h2>Controle de Produção</h2>}
      </div>
      
      {isSidebarOpen && user && (
        <div style={{padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', marginBottom: '20px'}}>
          <div style={{fontSize: '14px', fontWeight: '600'}}>{user.nome}</div>
          <div style={{fontSize: '12px', opacity: 0.8}}>{user.tipo}</div>
        </div>
      )}
      
      <nav className="sidebar-nav">
        <Link to="/" className={`nav-item ${isActive('/')}`}>
          <BarChart3 size={20} />
          {isSidebarOpen && <span>Dashboard</span>}
        </Link>
        
        <Link to="/novo-lancamento" className={`nav-item ${isActive('/novo-lancamento')}`}>
          <PlusCircle size={20} />
          {isSidebarOpen && <span>Novo Lançamento</span>}
        </Link>
        
        <Link to="/lancamentos" className={`nav-item ${isActive('/lancamentos')}`}>
          <ClipboardList size={20} />
          {isSidebarOpen && <span>Lançamentos</span>}
        </Link>
        
        <Link to="/relatorios" className={`nav-item ${isActive('/relatorios')}`}>
          <BarChart3 size={20} />
          {isSidebarOpen && <span>Relatórios</span>}
        </Link>
        
        <Link to="/usuarios" className={`nav-item ${isActive('/usuarios')}`}>
          <Users size={20} />
          {isSidebarOpen && <span>Usuários</span>}
        </Link>
        
        <button onClick={onLogout} className="nav-item" style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left'}}>
          <LogOut size={20} />
          {isSidebarOpen && <span>Sair</span>}
        </button>
      </nav>
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app-container">
      {!isLoginPage && <Navigation user={user} onLogout={handleLogout} />}
      <div className={isLoginPage ? '' : 'main-content'}>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/novo-lancamento" element={<ProtectedRoute><NovoLancamento /></ProtectedRoute>} />
          <Route path="/lancamentos" element={<ProtectedRoute><Lancamentos /></ProtectedRoute>} />
          <Route path="/lancamentos/:id" element={<ProtectedRoute><DetalhesLancamento /></ProtectedRoute>} />
          <Route path="/lancamentos/:id/editar" element={<ProtectedRoute><EditarLancamento /></ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
          <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
