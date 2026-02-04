import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Eye, Edit, Trash2 } from 'lucide-react';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const formatarKg = (valor) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
};

function Lancamentos() {
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarLancamentos();
  }, []);

  const carregarLancamentos = async () => {
    try {
      const response = await axios.get(`${API_URL}/lancamentos`);
      setLancamentos(response.data);
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletarLancamento = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/lancamentos/${id}`);
      alert('Lançamento excluído com sucesso!');
      carregarLancamentos();
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      alert('Erro ao excluir lançamento');
    }
  };

  const formatarData = (data) => {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Lançamentos</h1>
        <p>Histórico de produção</p>
      </div>

      {lancamentos.length === 0 ? (
        <div className="card empty-state">
          <h3>Nenhum lançamento encontrado</h3>
          <p>Comece criando um novo lançamento de produção</p>
          <Link to="/novo-lancamento" className="btn btn-primary" style={{marginTop: '20px'}}>
            Novo Lançamento
          </Link>
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
                        {formatarData(lanc.data)} - {lanc.hora}
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
                      <span className={`badge ${lanc.percentual_perdas > 10 ? 'badge-danger' : 'badge-warning'}`}>
                        {lanc.percentual_perdas}%
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
