import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function Relatorios() {
  const [periodo, setPeriodo] = useState('mensal');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    gerarRelatorio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/relatorios?periodo=${periodo}`;
      
      if (periodo === 'customizado' && dataInicio && dataFim) {
        url += `&data_inicio=${dataInicio}&data_fim=${dataFim}`;
      }
      
      const response = await axios.get(url);
      setRelatorio(response.data);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    alert('Função de exportar PDF em desenvolvimento');
  };

  const exportarExcel = () => {
    if (!relatorio) return;
    
    // Criar CSV simples
    let csv = 'Métrica,Valor\n';
    csv += `Produção Total,${relatorio.producao_total} kg\n`;
    csv += `Perdas Totais,${relatorio.perdas_total} kg\n`;
    csv += `Percentual de Perdas,${relatorio.percentual_perdas}%\n`;
    csv += `Dias Produzidos,${relatorio.dias_produzidos}\n`;
    csv += `Média Diária,${relatorio.media_diaria} kg\n`;
    csv += '\n';
    csv += 'Turno,Produção,Perdas\n';
    csv += `Turno A,${relatorio.por_turno.A.producao} kg,${relatorio.por_turno.A.perdas} kg\n`;
    csv += `Turno B,${relatorio.por_turno.B.producao} kg,${relatorio.por_turno.B.perdas} kg\n`;
    csv += `Administrativo,${relatorio.por_turno.Administrativo.producao} kg,${relatorio.por_turno.Administrativo.perdas} kg\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${periodo}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Relatórios</h1>
        <p>Análise consolidada da produção</p>
      </div>

      <div className="card">
        <h2 style={{marginBottom: '20px'}}>Filtros</h2>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px'}}>
          <div className="form-group">
            <label>Período</label>
            <select
              className="form-control"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            >
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
              <option value="customizado">Customizado</option>
            </select>
          </div>

          {periodo === 'customizado' && (
            <>
              <div className="form-group">
                <label>Data Início</label>
                <input
                  type="date"
                  className="form-control"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Data Fim</label>
                <input
                  type="date"
                  className="form-control"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div style={{display: 'flex', gap: '10px'}}>
          <button onClick={gerarRelatorio} className="btn btn-primary" disabled={loading}>
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
          
          {relatorio && (
            <>
              <button onClick={exportarExcel} className="btn btn-success">
                <FileSpreadsheet size={16} /> Exportar Excel
              </button>
            </>
          )}
        </div>
      </div>

      {loading && <div className="loading">Gerando relatório...</div>}

      {relatorio && !loading && (
        <>
          <div className="card">
            <h2 style={{marginBottom: '20px'}}>Informações Consolidadas</h2>
            
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Produção Total</h3>
                <div className="value">{relatorio.producao_total} kg</div>
              </div>

              <div className="stat-card">
                <h3>Perdas Totais</h3>
                <div className="value">{relatorio.perdas_total} kg</div>
              </div>

              <div className="stat-card">
                <h3>Percentual de Perdas</h3>
                <div className="value">{relatorio.percentual_perdas}%</div>
              </div>

              <div className="stat-card">
                <h3>Média Diária</h3>
                <div className="value">{relatorio.media_diaria} kg</div>
                <div className="subtitle">{relatorio.dias_produzidos} dias</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{marginBottom: '20px'}}>Detalhes por Turno</h2>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px'}}>
              <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px', borderLeft: '4px solid #667eea'}}>
                <h3 style={{color: '#667eea', marginBottom: '15px', fontSize: '18px'}}>Turno A</h3>
                <div style={{marginBottom: '10px'}}>
                  <div style={{fontSize: '12px', color: '#718096', marginBottom: '5px'}}>Produção</div>
                  <div style={{fontSize: '24px', fontWeight: '700', color: '#2d3748'}}>
                    {relatorio.por_turno.A.producao} kg
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '12px', color: '#718096', marginBottom: '5px'}}>Perdas</div>
                  <div style={{fontSize: '20px', fontWeight: '600', color: '#f56565'}}>
                    {relatorio.por_turno.A.perdas} kg
                  </div>
                </div>
              </div>

              <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px', borderLeft: '4px solid #48bb78'}}>
                <h3 style={{color: '#48bb78', marginBottom: '15px', fontSize: '18px'}}>Turno B</h3>
                <div style={{marginBottom: '10px'}}>
                  <div style={{fontSize: '12px', color: '#718096', marginBottom: '5px'}}>Produção</div>
                  <div style={{fontSize: '24px', fontWeight: '700', color: '#2d3748'}}>
                    {relatorio.por_turno.B.producao} kg
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '12px', color: '#718096', marginBottom: '5px'}}>Perdas</div>
                  <div style={{fontSize: '20px', fontWeight: '600', color: '#f56565'}}>
                    {relatorio.por_turno.B.perdas} kg
                  </div>
                </div>
              </div>

              <div style={{padding: '20px', background: '#f7fafc', borderRadius: '8px', borderLeft: '4px solid #ed8936'}}>
                <h3 style={{color: '#ed8936', marginBottom: '15px', fontSize: '18px'}}>Administrativo</h3>
                <div style={{marginBottom: '10px'}}>
                  <div style={{fontSize: '12px', color: '#718096', marginBottom: '5px'}}>Produção</div>
                  <div style={{fontSize: '24px', fontWeight: '700', color: '#2d3748'}}>
                    {relatorio.por_turno.Administrativo.producao} kg
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '12px', color: '#718096', marginBottom: '5px'}}>Perdas</div>
                  <div style={{fontSize: '20px', fontWeight: '600', color: '#f56565'}}>
                    {relatorio.por_turno.Administrativo.perdas} kg
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Relatorios;
