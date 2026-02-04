import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Calendar, Clock, Package } from 'lucide-react';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const formatarKg = (valor) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
};

function DetalhesLancamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lancamento, setLancamento] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarLancamento();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const carregarLancamento = async () => {
    try {
      const response = await axios.get(`${API_URL}/lancamentos/${id}`);
      setLancamento(response.data);
    } catch (error) {
      console.error('Erro ao carregar lançamento:', error);
      alert('Erro ao carregar lançamento');
      navigate('/lancamentos');
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data) => {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const calcularTotais = () => {
    if (!lancamento || !lancamento.itens) return { producao: 0, perdas: 0, percentual: 0 };
    
    const producao = lancamento.itens.reduce((sum, item) => sum + parseFloat(item.producao_kg), 0);
    const perdas = parseFloat(lancamento.orelha_kg) + parseFloat(lancamento.aparas_kg);
    const percentual = producao > 0 ? (perdas / producao * 100) : 0;
    
    return { producao, perdas, percentual: percentual.toFixed(2) };
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (!lancamento) {
    return <div className="loading">Lançamento não encontrado</div>;
  }

  const totais = calcularTotais();

  return (
    <div>
      <button onClick={() => navigate('/lancamentos')} className="btn btn-secondary" style={{marginBottom: '20px'}}>
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="page-header">
        <h1>Detalhes do Lançamento</h1>
        <p>{formatarData(lancamento.data)} - Turno {lancamento.turno} - {lancamento.hora}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Produção Total</h3>
          <div className="value">{formatarKg(totais.producao)} kg</div>
          <div className="subtitle">
            <Package size={14} style={{display: 'inline', marginRight: '5px'}} />
            {lancamento.itens?.length || 0} itens
          </div>
        </div>

        <div className="stat-card">
          <h3>Orelha</h3>
          <div className="value">{formatarKg(parseFloat(lancamento.orelha_kg))} kg</div>
        </div>

        <div className="stat-card">
          <h3>Aparas</h3>
          <div className="value">{formatarKg(parseFloat(lancamento.aparas_kg))} kg</div>
        </div>

        <div className="stat-card">
          <h3>Perdas Totais</h3>
          <div className="value">{formatarKg(totais.perdas)} kg</div>
          <div className="subtitle">{totais.percentual}% da produção</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{marginBottom: '20px'}}>Itens de Produção</h2>
        
        {lancamento.itens && lancamento.itens.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Formato</th>
                  <th>Cor</th>
                  <th>Pacote (kg)</th>
                  <th>Produção (kg)</th>
                </tr>
              </thead>
              <tbody>
                {lancamento.itens.map((item, index) => (
                  <tr key={index}>
                    <td>{item.formato}</td>
                    <td>{item.cor}</td>
                    <td>{parseFloat(item.pacote_kg).toFixed(2)}</td>
                    <td style={{fontWeight: '600', color: '#48bb78'}}>
                      {parseFloat(item.producao_kg).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>Nenhum item de produção registrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DetalhesLancamento;
