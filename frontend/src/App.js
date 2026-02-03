import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import NovoLancamento from './pages/NovoLancamento';
import Lancamentos from './pages/Lancamentos';
import DetalhesLancamento from './pages/DetalhesLancamento';
import EditarLancamento from './pages/EditarLancamento';
import Relatorios from './pages/Relatorios';
import { Factory, ClipboardList, BarChart3, PlusCircle } from 'lucide-react';
import './App.css';

function Navigation() {
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
      </nav>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/novo-lancamento" element={<NovoLancamento />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/lancamentos/:id" element={<DetalhesLancamento />} />
            <Route path="/lancamentos/:id/editar" element={<EditarLancamento />} />
            <Route path="/relatorios" element={<Relatorios />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
