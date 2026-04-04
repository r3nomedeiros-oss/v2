import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit, Trash2, FileText, FileSpreadsheet, Filter, X } from 'lucide-react';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const formatarKg = (valor) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
};

function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros de data
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState(false);

  const carregarDados = useCallback(async (inicio = '', fim = '') => {
    setLoading(true);
    try {
      let url = `${API_URL}/lancamentos`;
      const params = new URLSearchParams();
      if (inicio) params.append('data_inicio', inicio);
      if (fim) params.append('data_fim', fim);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url);
      setLancamentos(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
      setLancamentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const aplicarFiltro = () => {
    if (dataInicio || dataFim) {
      carregarDados(dataInicio, dataFim);
      setFiltroAtivo(true);
    }
  };

  const limparFiltro = () => {
    setDataInicio('');
    setDataFim('');
    setFiltroAtivo(false);
    carregarDados();
  };

  const deletarLancamento = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      return;
    }

    // Remover imediatamente da lista local (feedback visual instantâneo)
    setLancamentos(prev => prev.filter(l => l.id !== id));

    try {
      await axios.delete(`${API_URL}/lancamentos/${id}`);
      // Sucesso - item já foi removido visualmente
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      alert('Erro ao excluir lançamento. Recarregando dados...');
      // Recarregar dados em caso de erro
      carregarDados(filtroAtivo ? dataInicio : '', filtroAtivo ? dataFim : '');
    }
  };

  const formatarData = (data) => {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const formatarHora = (hora) => {
    if (!hora) return '';
    return hora.substring(0, 5);
  };

  const exportarHistoricoPDF = () => {
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const periodoTexto = filtroAtivo ? `Período: ${dataInicio ? formatarData(dataInicio) : 'Início'} a ${dataFim ? formatarData(dataFim) : 'Fim'}` : 'Todos os lançamentos';
    const conteudo = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Histórico de Produção</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #2d3748; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    .periodo { color: #718096; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    th { background: #f7fafc; font-weight: 600; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #a0aec0; }
  </style>
</head>
<body>
  <h1>Histórico de Produção - PolyTrack</h1>
  <p>Gerado em: ${dataAtual}</p>
  <p class="periodo">${periodoTexto}</p>
  <table>
    <thead>
      <tr>
        <th>Data/Hora</th>
        <th>Turno</th>
        <th>Produção (kg)</th>
        <th>Perdas (kg)</th>
        <th>% Perdas</th>
      </tr>
    </thead>
    <tbody>
      ${lancamentos.map(lanc => `
        <tr>
          <td>${formatarData(lanc.data)} ${formatarHora(lanc.hora)}</td>
          <td>${lanc.turno}</td>
          <td>${formatarKg(lanc.producao_total || 0)}</td>
          <td>${formatarKg(lanc.perdas_total || 0)}</td>
          <td>${lanc.percentual_perdas || 0}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer">PolyTrack - Sistema de Controle de Produção</div>
  <script>
    window.onload = () => {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  </script>
</body>
</html>`;
    const blob = new Blob([conteudo], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const exportarHistoricoExcel = () => {
    let csv = `Data;Hora;Turno;Produção (kg);Perdas (kg);% Perdas\n`;
    lancamentos.forEach(lanc => {
      csv += `${formatarData(lanc.data)};${formatarHora(lanc.hora)};${lanc.turno};${formatarKg(lanc.producao_total || 0)};${formatarKg(lanc.perdas_total || 0)};${lanc.percentual_perdas || 0}%\n`;
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_producao_${new Date().getTime()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1>Lançamentos</h1>
          <p>Histórico de produção</p>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          <button onClick={exportarHistoricoPDF} className="btn btn-danger" style={{padding: '8px 15px', fontSize: '13px'}}>
            <FileText size={14} /> PDF
          </button>
          <button onClick={exportarHistoricoExcel} className="btn btn-success" style={{padding: '8px 15px', fontSize: '13px'}}>
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
      </div>

      {/* Filtros de Data */}
      <div className="card" style={{marginBottom: '20px'}}>
        <div className="filtros-container">
          <div className="filtros-icon">
            <Filter size={20} color="#667eea" />
          </div>
          <div className="filtros-campos">
            <div className="form-group" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}>
              <label style={{fontSize: '12px', marginBottom: '4px'}}>Data Início</label>
              <input
                type="date"
                className="form-control"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{padding: '8px', fontSize: '14px'}}
              />
            </div>
            <div className="form-group" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}>
              <label style={{fontSize: '12px', marginBottom: '4px'}}>Data Fim</label>
              <input
                type="date"
                className="form-control"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{padding: '8px', fontSize: '14px'}}
              />
            </div>
          </div>
          <div className="filtros-botoes">
            <button onClick={aplicarFiltro} className="btn btn-primary" style={{padding: '8px 15px', flex: 1}}>
              Filtrar
            </button>
            {filtroAtivo && (
              <button onClick={limparFiltro} className="btn btn-secondary" style={{padding: '8px 15px'}}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {filtroAtivo && (
          <div style={{marginTop: '10px', fontSize: '13px', color: '#667eea', fontWeight: '500'}}>
            Filtro ativo: {lancamentos.length} resultado(s)
          </div>
        )}
      </div>

      {lancamentos.length === 0 ? (
        <div className="card empty-state">
          <h3>Nenhum lançamento encontrado</h3>
          <p>{filtroAtivo ? 'Nenhum lançamento no período selecionado' : 'Comece criando um novo lançamento de produção'}</p>
          {!filtroAtivo && (
            <Link to="/novo-lancamento" className="btn btn-primary" style={{marginTop: '20px'}}>
              Novo Lançamento
            </Link>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Lançamento</th>
                  <th>Turno</th>
                  <th>Produção</th>
                  <th>Perdas</th>
                  <th>% Perdas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((lanc) => (
                  <tr key={lanc.id}>
                    <td>
                      <div style={{fontWeight: '600'}}>
                        {formatarData(lanc.data)} - {formatarHora(lanc.hora)}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">{lanc.turno}</span>
                    </td>
                    <td style={{fontWeight: '600', color: '#48bb78'}}>
                      {formatarKg(lanc.producao_total || 0)} kg
                    </td>
                    <td style={{fontWeight: '600', color: '#f56565'}}>
                      {formatarKg(lanc.perdas_total || 0)} kg
                    </td>
                    <td>
                      <span className={`badge ${(lanc.percentual_perdas || 0) > 10 ? 'badge-danger' : 'badge-warning'}`}>
                        {lanc.percentual_perdas || 0}%
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <Link to={`/lancamentos/${lanc.id}`} className="btn btn-secondary" style={{padding: '6px 12px'}}>
                          <Eye size={14} />
                        </Link>
                        <Link to={`/lancamentos/${lanc.id}/editar`} className="btn btn-primary" style={{padding: '6px 12px'}}>
                          <Edit size={14} />
                        </Link>
                        <button
                          onClick={() => deletarLancamento(lanc.id)}
                          className="btn btn-danger"
                          style={{padding: '6px 12px'}}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lancamentos;
