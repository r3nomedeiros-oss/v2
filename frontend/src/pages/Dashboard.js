import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Calendar, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDados } from '../contexts/DadosContext';

// Função para formatar números
const formatarKg = (valor) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
};

function Dashboard() {
  const { lancamentos, stats, carregarLancamentos, carregarStats, loading } = useDados();
  const [localLoading, setLocalLoading] = useState(true);
  const [localStats, setLocalStats] = useState(null);
  const [localLancamentos, setLocalLancamentos] = useState([]);

  useEffect(() => {
    carregarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarDashboard = async () => {
    setLocalLoading(true);
    try {
      const [statsData, lancamentosData] = await Promise.all([
        carregarStats(false, 'mensal'),
        carregarLancamentos()
      ]);
      
      setLocalStats(statsData);
      
      // Últimos 7 dias (incluindo hoje)
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 6);
      seteDiasAtras.setHours(0, 0, 0, 0);
      
      const ultimos7Dias = (lancamentosData || []).filter(lanc => {
        const dataLanc = new Date(lanc.data + 'T12:00:00');
        return dataLanc >= seteDiasAtras && dataLanc <= hoje;
      });
      
      setLocalLancamentos(ultimos7Dias);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  const prepararDadosGrafico = () => {
    // Criar array com os últimos 7 dias
    const hoje = new Date();
    const dias = [];
    
    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(hoje.getDate() - i);
      const dataStr = data.toISOString().split('T')[0];
      const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      dias.push({
        dataOriginal: dataStr,
        data: dataFormatada,
        producao: 0,
        perdas: 0,
        percentualPerdas: 0
      });
    }
    
    // Preencher com dados dos lançamentos
    localLancamentos.forEach(lanc => {
      const diaIndex = dias.findIndex(d => d.dataOriginal === lanc.data);
      if (diaIndex !== -1) {
        dias[diaIndex].producao += parseFloat(lanc.producao_total) || 0;
        dias[diaIndex].perdas += parseFloat(lanc.perdas_total) || 0;
      }
    });
    
    // Calcular percentual de perdas para cada dia
    dias.forEach(dia => {
      dia.percentualPerdas = dia.producao > 0 ? parseFloat(((dia.perdas / dia.producao) * 100).toFixed(1)) : 0;
    });
    
    return dias;
  };

  // Tooltip customizado para mostrar as informações na ordem correta
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Ordenar para Produção, Perdas, % Perdas
      const producao = payload.find(p => p.dataKey === 'producao');
      const perdas = payload.find(p => p.dataKey === 'perdas');
      const percentual = payload.find(p => p.dataKey === 'percentualPerdas');
      
      return (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontWeight: '600', marginBottom: '8px', color: '#2d3748' }}>{label}</p>
          {producao && (
            <p style={{ color: '#1e40af', margin: '4px 0' }}>
              Produção: <strong>{formatarKg(producao.value)} kg</strong>
            </p>
          )}
          {perdas && (
            <p style={{ color: '#f56565', margin: '4px 0' }}>
              Perdas: <strong>{formatarKg(perdas.value)} kg</strong>
            </p>
          )}
          {percentual && (
            <p style={{ color: '#ed8936', margin: '4px 0' }}>
              % Perdas: <strong>{percentual.value}%</strong>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (localLoading) {
    return <div className="loading">Carregando...</div>;
  }

  const dadosGrafico = prepararDadosGrafico();

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral da produção mensal</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Produção Total</h3>
          <div className="value">{formatarKg(localStats?.producao_total || 0)} kg</div>
          <div className="subtitle" style={{fontSize: '15px', fontWeight: '600', color: '#4a5568'}}>
            <Package size={16} style={{display: 'inline', marginRight: '5px'}} />
            {localStats?.dias_produzidos || 0} dias produzidos
          </div>
        </div>

        <div className="stat-card">
          <h3>Média Diária</h3>
          <div className="value">{formatarKg(localStats?.media_diaria || 0)} kg</div>
          <div className="subtitle" style={{fontSize: '15px', fontWeight: '600', color: '#4a5568'}}>
            <TrendingUp size={16} style={{display: 'inline', marginRight: '5px'}} />
            Por dia produzido
          </div>
        </div>

        <div className="stat-card">
          <h3>Perdas Totais</h3>
          <div className="value">{formatarKg(localStats?.perdas_total || 0)} kg</div>
          <div className="subtitle" style={{fontSize: '15px', fontWeight: '600', color: '#4a5568'}}>
            <AlertCircle size={16} style={{display: 'inline', marginRight: '5px'}} />
            {localStats?.percentual_perdas || 0}% da produção
          </div>
        </div>

        <div className="stat-card">
          <h3>Período</h3>
          <div className="value" style={{fontSize: '24px'}}>Mensal</div>
          <div className="subtitle" style={{fontSize: '13px', fontWeight: '600', color: '#4a5568'}}>
            <Calendar size={14} style={{display: 'inline', marginRight: '5px'}} />
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{marginBottom: '20px'}}>Produção x Perdas (Últimos 7 Dias)</h2>
        
        {dadosGrafico.some(d => d.producao > 0 || d.perdas > 0) ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={dadosGrafico} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="data" 
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                yAxisId="left"
                label={{ value: 'kg', angle: -90, position: 'insideLeft', fontSize: 11 }}
                tick={{ fontSize: 11 }}
                width={50}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                label={{ value: '%', angle: 90, position: 'insideRight', fontSize: 11 }}
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(value) => {
                  if (value === 'producao') return 'Produção (kg)';
                  if (value === 'perdas') return 'Perdas (kg)';
                  if (value === 'percentualPerdas') return '% Perdas';
                  return value;
                }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="producao" 
                stroke="#1e40af" 
                strokeWidth={3}
                name="producao"
                dot={{ fill: '#1e40af', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="perdas" 
                stroke="#f56565" 
                strokeWidth={3}
                name="perdas"
                dot={{ fill: '#f56565', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="percentualPerdas" 
                stroke="#ed8936" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="percentualPerdas"
                dot={{ fill: '#ed8936', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">
            <p>Sem dados de produção nos últimos 7 dias</p>
            <p style={{fontSize: '14px', color: '#718096', marginTop: '10px'}}>
              Crie lançamentos para visualizar o gráfico
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{marginBottom: '20px'}}>Produção por Turno</h2>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
          <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px'}}>
            <h3 style={{color: '#667eea', marginBottom: '10px'}}>Turno A</h3>
            <div style={{fontSize: '24px', fontWeight: '700', marginBottom: '5px'}}>
              {formatarKg(localStats?.por_turno?.A?.producao || 0)} kg
            </div>
            <div style={{fontSize: '14px', color: '#718096'}}>
              Perdas: {formatarKg(localStats?.por_turno?.A?.perdas || 0)} kg
            </div>
          </div>

          <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px'}}>
            <h3 style={{color: '#667eea', marginBottom: '10px'}}>Turno B</h3>
            <div style={{fontSize: '24px', fontWeight: '700', marginBottom: '5px'}}>
              {formatarKg(localStats?.por_turno?.B?.producao || 0)} kg
            </div>
            <div style={{fontSize: '14px', color: '#718096'}}>
              Perdas: {formatarKg(localStats?.por_turno?.B?.perdas || 0)} kg
            </div>
          </div>

          <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px'}}>
            <h3 style={{color: '#667eea', marginBottom: '10px'}}>Administrativo</h3>
            <div style={{fontSize: '24px', fontWeight: '700', marginBottom: '5px'}}>
              {formatarKg(localStats?.por_turno?.Administrativo?.producao || 0)} kg
            </div>
            <div style={{fontSize: '14px', color: '#718096'}}>
              Perdas: {formatarKg(localStats?.por_turno?.Administrativo?.perdas || 0)} kg
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
