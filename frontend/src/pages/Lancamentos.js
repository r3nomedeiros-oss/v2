import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDados } from '../contexts/DadosContext';
import { Eye, Edit, Trash2, FileText, FileSpreadsheet, Filter, X, Layers, List } from 'lucide-react';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const formatarKg = (valor) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor || 0));
};

function Lancamentos() {
  const { carregarLancamentos, invalidarCache, loadingLancamentos } = useDados();
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [consolidado, setConsolidado] = useState(false);

  // Agrupa lançamentos por data quando consolidado=true
  const lancamentosExibidos = React.useMemo(() => {
    if (!consolidado) return lancamentos;

    const agrupados = {};
    lancamentos.forEach((lanc) => {
      const chave = lanc.data;
      if (!agrupados[chave]) {
        agrupados[chave] = {
          id: chave,
          data: lanc.data,
          producao_total: 0,
          perdas_total: 0,
          turnos: new Set(),
          quantidade_lancamentos: 0,
        };
      }
      agrupados[chave].producao_total += Number(lanc.producao_total) || 0;
      agrupados[chave].perdas_total += Number(lanc.perdas_total) || 0;
      if (lanc.turno) agrupados[chave].turnos.add(lanc.turno);
      agrupados[chave].quantidade_lancamentos += 1;
    });

    return Object.values(agrupados)
      .map((item) => ({
        ...item,
        turnos: Array.from(item.turnos).join(', '),
        percentual_perdas:
          item.producao_total > 0
            ? Number(((item.perdas_total / item.producao_total) * 100).toFixed(2))
            : 0,
      }))
      .sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [lancamentos, consolidado]);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarDados = async (filtros = {}) => {
    setLoading(true);
    try {
      const data = await carregarLancamentos(false, {
        dataInicio: filtros.dataInicio ?? filtroDataInicio,
        dataFim: filtros.dataFim ?? filtroDataFim
      });
      setLancamentos(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    carregarDados({ dataInicio: filtroDataInicio, dataFim: filtroDataFim });
  };

  const handleLimparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    carregarDados({ dataInicio: '', dataFim: '' });
  };

  const deletarLancamento = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/lancamentos/${id}`);
      invalidarCache(); // Invalida o cache após deletar
      alert('Lançamento excluído com sucesso!');
      carregarDados(); // Recarrega os dados
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      alert('Erro ao excluir lançamento');
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
    const periodoTexto = filtroDataInicio && filtroDataFim 
      ? `Período: ${formatarData(filtroDataInicio)} até ${formatarData(filtroDataFim)}`
      : 'Histórico Completo';
    const tipoVisualizacao = consolidado ? ' (Consolidado por Dia)' : '';
    const cabecalhos = consolidado
      ? `<th>Data</th><th>Turnos</th><th>Lançamentos</th><th>Produção (kg)</th><th>Perdas (kg)</th><th>% Perdas</th>`
      : `<th>Data/Hora</th><th>Turno</th><th>Produção (kg)</th><th>Perdas (kg)</th><th>% Perdas</th>`;
    const linhas = consolidado
      ? lancamentosExibidos.map(lanc => `
        <tr>
          <td>${formatarData(lanc.data)}</td>
          <td>${lanc.turnos || '-'}</td>
          <td>${lanc.quantidade_lancamentos}</td>
          <td>${formatarKg(lanc.producao_total)}</td>
          <td>${formatarKg(lanc.perdas_total)}</td>
          <td>${lanc.percentual_perdas || 0}%</td>
        </tr>
      `).join('')
      : lancamentosExibidos.map(lanc => `
        <tr>
          <td>${formatarData(lanc.data)} ${formatarHora(lanc.hora)}</td>
          <td>${lanc.turno}</td>
          <td>${formatarKg(lanc.producao_total)}</td>
          <td>${formatarKg(lanc.perdas_total)}</td>
          <td>${lanc.percentual_perdas || 0}%</td>
        </tr>
      `).join('');
    const conteudo = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Histórico de Produção${tipoVisualizacao} - ${periodoTexto}</title>
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
  <h1>Histórico de Produção${tipoVisualizacao} - PolyTrack</h1>
  <p><strong>${periodoTexto}</strong></p>
  <p>Gerado em: ${dataAtual}</p>
  <table>
    <thead>
      <tr>${cabecalhos}</tr>
    </thead>
    <tbody>
      ${linhas}
    </tbody>
  </table>
  <div class="footer">PolyTrack - Sistema de Controle de Produção</div>
  <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }</script>
</body>
</html>`;
    const blob = new Blob([conteudo], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const exportarHistoricoExcel = () => {
    let csv = consolidado
      ? `Data;Turnos;Lançamentos;Produção (kg);Perdas (kg);% Perdas\n`
      : `Data;Hora;Turno;Produção (kg);Perdas (kg);% Perdas\n`;
    lancamentosExibidos.forEach(lanc => {
      if (consolidado) {
        csv += `${formatarData(lanc.data)};${lanc.turnos || '-'};${lanc.quantidade_lancamentos};${formatarKg(lanc.producao_total)};${formatarKg(lanc.perdas_total)};${lanc.percentual_perdas || 0}%\n`;
      } else {
        csv += `${formatarData(lanc.data)};${formatarHora(lanc.hora)};${lanc.turno};${formatarKg(lanc.producao_total)};${formatarKg(lanc.perdas_total)};${lanc.percentual_perdas || 0}%\n`;
      }
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico_producao${consolidado ? '_consolidado' : ''}_${new Date().getTime()}.csv`;
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
          <button
            onClick={() => setConsolidado(!consolidado)}
            style={{
              padding: '8px 15px',
              fontSize: '13px',
              fontWeight: 700,
              background: '#ffffff',
              color: '#1e40af',
              border: '2px solid #1e40af',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s'
            }}
            title={consolidado ? 'Mostrar lançamentos individuais por turno' : 'Unificar lançamentos do mesmo dia'}
          >
            {consolidado ? (
              <>
                <List size={14} /> Ver por Turno
              </>
            ) : (
              <>
                <Layers size={14} /> Consolidar por Dia
              </>
            )}
          </button>
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
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                style={{padding: '8px', fontSize: '14px'}}
              />
            </div>
            <div className="form-group" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}>
              <label style={{fontSize: '12px', marginBottom: '4px'}}>Data Fim</label>
              <input
                type="date"
                className="form-control"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                style={{padding: '8px', fontSize: '14px'}}
              />
            </div>
          </div>
          <div className="filtros-botoes">
            <button onClick={handleFiltrar} className="btn btn-primary" style={{padding: '8px 15px', flex: 1}}>
              Filtrar
            </button>
            {(filtroDataInicio || filtroDataFim) && (
              <button onClick={handleLimparFiltros} className="btn btn-secondary" style={{padding: '8px 15px'}}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        {(filtroDataInicio || filtroDataFim) && (
          <div style={{marginTop: '10px', fontSize: '13px', color: '#667eea', fontWeight: '500'}}>
            Filtro ativo: {lancamentosExibidos.length} resultado(s)
          </div>
        )}
      </div>

      {lancamentosExibidos.length === 0 ? (
        <div className="card empty-state">
          <h3>Nenhum lançamento encontrado</h3>
          <p>{(filtroDataInicio || filtroDataFim) ? 'Nenhum lançamento no período selecionado' : 'Comece criando um novo lançamento de produção'}</p>
          {!(filtroDataInicio || filtroDataFim) && (
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
                  {consolidado ? (
                    <>
                      <th>Data</th>
                      <th>Turnos</th>
                      <th>Lançamentos</th>
                      <th>Produção</th>
                      <th>Perdas</th>
                      <th>% Perdas</th>
                    </>
                  ) : (
                    <>
                      <th>Lançamento</th>
                      <th>Turno</th>
                      <th>Produção</th>
                      <th>Perdas</th>
                      <th>% Perdas</th>
                      <th>Ações</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {lancamentosExibidos.map((lanc) => (
                  <tr key={lanc.id}>
                    {consolidado ? (
                      <>
                        <td>
                          <div style={{fontWeight: '600'}}>
                            {formatarData(lanc.data)}
                          </div>
                        </td>
                        <td>
                          {(lanc.turnos || '').split(',').map((t, idx) => (
                            t.trim() ? (
                              <span key={idx} className="badge badge-success" style={{marginRight: '4px'}}>{t.trim()}</span>
                            ) : null
                          ))}
                        </td>
                        <td style={{fontWeight: '600', color: '#667eea'}}>
                          {lanc.quantidade_lancamentos}
                        </td>
                        <td style={{fontWeight: '600', color: '#48bb78'}}>
                          {formatarKg(lanc.producao_total)} kg
                        </td>
                        <td style={{fontWeight: '600', color: '#f56565'}}>
                          {formatarKg(lanc.perdas_total)} kg
                        </td>
                        <td>
                          <span className={`badge ${(lanc.percentual_perdas || 0) > 10 ? 'badge-danger' : 'badge-warning'}`}>
                            {lanc.percentual_perdas || 0}%
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div style={{fontWeight: '600'}}>
                            {formatarData(lanc.data)} - {formatarHora(lanc.hora)}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-success">{lanc.turno}</span>
                        </td>
                        <td style={{fontWeight: '600', color: '#48bb78'}}>
                          {formatarKg(lanc.producao_total)} kg
                        </td>
                        <td style={{fontWeight: '600', color: '#f56565'}}>
                          {formatarKg(lanc.perdas_total)} kg
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
                      </>
                    )}
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
