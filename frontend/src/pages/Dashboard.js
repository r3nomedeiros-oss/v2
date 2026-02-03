import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, AlertCircle, Calendar, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/relatorios?periodo=mensal`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral da produção mensal</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Produção Total</h3>
          <div className="value">{stats?.producao_total || 0} kg</div>
          <div className="subtitle">
            <Package size={14} style={{display: 'inline', marginRight: '5px'}} />
            {stats?.dias_produzidos || 0} dias produzidos
          </div>
        </div>

        <div className="stat-card">
          <h3>Média Diária</h3>
          <div className="value">{stats?.media_diaria || 0} kg</div>
          <div className="subtitle">
            <TrendingUp size={14} style={{display: 'inline', marginRight: '5px'}} />
            Por dia produzido
          </div>
        </div>

        <div className="stat-card">
          <h3>Perdas Totais</h3>
          <div className="value">{stats?.perdas_total || 0} kg</div>
          <div className="subtitle">
            <AlertCircle size={14} style={{display: 'inline', marginRight: '5px'}} />
            {stats?.percentual_perdas || 0}% da produção
          </div>
        </div>

        <div className="stat-card">
          <h3>Período</h3>
          <div className="value">Mensal</div>
          <div className="subtitle">
            <Calendar size={14} style={{display: 'inline', marginRight: '5px'}} />
            Últimos 30 dias
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{marginBottom: '20px'}}>Produção por Turno</h2>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
          <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px'}}>
            <h3 style={{color: '#667eea', marginBottom: '10px'}}>Turno A</h3>
            <div style={{fontSize: '24px', fontWeight: '700', marginBottom: '5px'}}>
              {stats?.por_turno?.A?.producao || 0} kg
            </div>
            <div style={{fontSize: '14px', color: '#718096'}}>
              Perdas: {stats?.por_turno?.A?.perdas || 0} kg
            </div>
          </div>

          <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px'}}>
            <h3 style={{color: '#667eea', marginBottom: '10px'}}>Turno B</h3>
            <div style={{fontSize: '24px', fontWeight: '700', marginBottom: '5px'}}>
              {stats?.por_turno?.B?.producao || 0} kg
            </div>
            <div style={{fontSize: '14px', color: '#718096'}}>
              Perdas: {stats?.por_turno?.B?.perdas || 0} kg
            </div>
          </div>

          <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px'}}>
            <h3 style={{color: '#667eea', marginBottom: '10px'}}>Administrativo</h3>
            <div style={{fontSize: '24px', fontWeight: '700', marginBottom: '5px'}}>
              {stats?.por_turno?.Administrativo?.producao || 0} kg
            </div>
            <div style={{fontSize: '14px', color: '#718096'}}>
              Perdas: {stats?.por_turno?.Administrativo?.perdas || 0} kg
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
