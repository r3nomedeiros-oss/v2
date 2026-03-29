import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Save, ArrowLeft, Eye } from 'lucide-react';
import { useVariaveis } from '../contexts/VariaveisContext';
import { useDados } from '../contexts/DadosContext';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function EditarLancamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(true);
  
  // Usar cache de variáveis
  const { turnos, formatos, cores, carregarVariaveis } = useVariaveis();
  const { invalidarCache } = useDados();
  
  const [lancamento, setLancamento] = useState({
    data: '',
    turno: 'A',
    hora: '',
    orelha_kg: '',
    aparas_kg: '',
    itens: []
  });

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const carregarDados = async () => {
    try {
      // Carregar variáveis do cache e lançamento em paralelo
      const [_, lancamentoRes] = await Promise.all([
        carregarVariaveis(),
        axios.get(`${API_URL}/lancamentos/${id}`)
      ]);
      
      setLancamento(lancamentoRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar lançamento');
      navigate('/lancamentos');
    } finally {
      setCarregando(false);
    }
  };

  const adicionarItem = () => {
    setLancamento({
      ...lancamento,
      itens: [...lancamento.itens, { formato: '', cor: '', pacote_kg: '', producao_kg: '' }]
    });
  };

  const removerItem = (index) => {
    const novosItens = lancamento.itens.filter((_, i) => i !== index);
    setLancamento({ ...lancamento, itens: novosItens });
  };

  const atualizarItem = (index, field, value) => {
    const novosItens = [...lancamento.itens];
    novosItens[index][field] = value;
    setLancamento({ ...lancamento, itens: novosItens });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.put(`${API_URL}/lancamentos/${id}`, lancamento);
      invalidarCache(); // Invalidar cache após editar
      alert('Lançamento atualizado com sucesso!');
      navigate('/lancamentos');
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      alert('Erro ao atualizar lançamento');
    } finally {
      setLoading(false);
    }
  };

  // Cálculos para pré-visualização
  const previewData = useMemo(() => {
    const producaoTotal = lancamento.itens.reduce((acc, item) => 
      acc + (parseFloat(item.producao_kg) || 0), 0);
    const pacoteTotal = lancamento.itens.reduce((acc, item) => 
      acc + (parseFloat(item.pacote_kg) || 0), 0);
    const orelha = parseFloat(lancamento.orelha_kg) || 0;
    const aparas = parseFloat(lancamento.aparas_kg) || 0;
    const perdasTotal = orelha + aparas;
    const totalGeral = producaoTotal + perdasTotal;
    const percentualPerdas = totalGeral > 0 ? ((perdasTotal / totalGeral) * 100).toFixed(2) : 0;
    
    return {
      producaoTotal: producaoTotal.toFixed(2),
      pacoteTotal: pacoteTotal.toFixed(2),
      perdasTotal: perdasTotal.toFixed(2),
      percentualPerdas,
      itensPreenchidos: lancamento.itens.filter(i => i.formato && i.cor && i.producao_kg).length,
      totalItens: lancamento.itens.length
    };
  }, [lancamento]);

  const formatarData = (dataStr) => {
    if (!dataStr) return '';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  if (carregando) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div>
      <button onClick={() => navigate('/lancamentos')} className="btn btn-secondary" style={{marginBottom: '20px'}}>
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="page-header">
        <h1>Editar Lançamento</h1>
        <p>Atualizar informações da produção</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2 style={{marginBottom: '20px'}}>Informações Gerais</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px'}}>
            <div className="form-group">
              <label>Data</label>
              <input
                type="date"
                className="form-control"
                value={lancamento.data}
                onChange={(e) => setLancamento({...lancamento, data: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Turno</label>
              <select
                className="form-control"
                value={lancamento.turno}
                onChange={(e) => setLancamento({...lancamento, turno: e.target.value})}
                required
              >
                {turnos.length > 0 ? (
                  turnos.map(turno => (
                    <option key={turno.id} value={turno.nome}>{turno.nome}</option>
                  ))
                ) : (
                  <>
                    <option value="A">Turno A</option>
                    <option value="B">Turno B</option>
                    <option value="Administrativo">Administrativo</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>Hora</label>
              <input
                type="time"
                className="form-control"
                value={lancamento.hora}
                onChange={(e) => setLancamento({...lancamento, hora: e.target.value})}
                required
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
            <div className="form-group">
              <label>Orelha (kg)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={lancamento.orelha_kg}
                onChange={(e) => setLancamento({...lancamento, orelha_kg: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Aparas (kg)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={lancamento.aparas_kg}
                onChange={(e) => setLancamento({...lancamento, aparas_kg: e.target.value})}
                required
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2>Itens de Produção</h2>
            <button type="button" className="btn btn-secondary" onClick={adicionarItem}>
              <Plus size={16} /> Adicionar Item
            </button>
          </div>

          {lancamento.itens.map((item, index) => (
            <div key={index} style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 36px', gap: '10px', alignItems: 'end', background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e2e8f0'}}>
              <div className="form-group" style={{marginBottom: '0'}}>
                <label style={{fontSize: '12px', marginBottom: '4px'}}>Formato</label>
                {formatos.length > 0 ? (
                  <select
                    className="form-control"
                    value={item.formato}
                    onChange={(e) => atualizarItem(index, 'formato', e.target.value)}
                    required
                    style={{fontSize: '12px', padding: '8px'}}
                  >
                    <option value="">Selecione...</option>
                    {formatos.map(formato => (
                      <option key={formato.id} value={formato.nome}>{formato.nome}</option>
                    ))}
                    {/* Mostrar o valor atual se não estiver na lista */}
                    {item.formato && !formatos.find(f => f.nome === item.formato) && (
                      <option value={item.formato}>{item.formato}</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    value={item.formato}
                    onChange={(e) => atualizarItem(index, 'formato', e.target.value)}
                    required
                    style={{fontSize: '12px', padding: '8px'}}
                  />
                )}
              </div>

              <div className="form-group" style={{marginBottom: '0'}}>
                <label style={{fontSize: '12px', marginBottom: '4px'}}>Cor</label>
                {cores.length > 0 ? (
                  <select
                    className="form-control"
                    value={item.cor}
                    onChange={(e) => atualizarItem(index, 'cor', e.target.value)}
                    required
                    style={{fontSize: '12px', padding: '8px'}}
                  >
                    <option value="">Selecione...</option>
                    {cores.map(cor => (
                      <option key={cor.id} value={cor.nome}>{cor.nome}</option>
                    ))}
                    {/* Mostrar o valor atual se não estiver na lista */}
                    {item.cor && !cores.find(c => c.nome === item.cor) && (
                      <option value={item.cor}>{item.cor}</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    value={item.cor}
                    onChange={(e) => atualizarItem(index, 'cor', e.target.value)}
                    required
                    style={{fontSize: '12px', padding: '8px'}}
                  />
                )}
              </div>

              <div className="form-group" style={{marginBottom: '0'}}>
                <label style={{fontSize: '12px', marginBottom: '4px'}}>Pacote (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={item.pacote_kg}
                  onChange={(e) => atualizarItem(index, 'pacote_kg', e.target.value)}
                  required
                  style={{fontSize: '12px', padding: '8px'}}
                />
              </div>

              <div className="form-group" style={{marginBottom: '0'}}>
                <label style={{fontSize: '12px', marginBottom: '4px'}}>Produção (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={item.producao_kg}
                  onChange={(e) => atualizarItem(index, 'producao_kg', e.target.value)}
                  required
                  style={{fontSize: '12px', padding: '8px'}}
                />
              </div>

              {lancamento.itens.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removerItem(index)}
                  style={{padding: '8px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '36px'}}
                  title="Remover item"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Pré-visualização */}
        <div style={{background: '#dcfce7', borderRadius: '12px', padding: '20px', border: '1px solid #86efac'}}>
          {/* Header */}
          <div className="preview-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <Eye size={22} style={{color: '#16a34a'}} />
              <span style={{fontSize: '20px', fontWeight: '600', color: '#16a34a'}}>Pré-visualização do Lançamento</span>
            </div>
          </div>

          <>
            {/* Informações Gerais - Card Branco */}
            <div style={{background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px'}}>
              <div className="preview-info-grid">
                <div>
                  <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '4px'}}>Data</div>
                  <div style={{fontSize: '18px', fontWeight: '600', color: '#111827'}}>{formatarData(lancamento.data)}</div>
                </div>
                <div>
                  <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '4px'}}>Hora</div>
                  <div style={{fontSize: '18px', fontWeight: '600', color: '#111827'}}>{lancamento.hora || '-'}</div>
                </div>
                <div>
                  <div style={{fontSize: '13px', color: '#6b7280', marginBottom: '4px'}}>Turno</div>
                  <div style={{fontSize: '18px', fontWeight: '600', color: '#111827'}}>{lancamento.turno || '-'}</div>
                </div>
              </div>
            </div>

            {/* Itens de Produção - Card Branco */}
            <div style={{background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px'}}>
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '15px'}}>Itens de Produção</div>
              
              {/* Tabela para Desktop */}
              <div className="preview-table-desktop">
                <table style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{borderBottom: '1px solid #e5e7eb'}}>
                      <th style={{padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Formato</th>
                      <th style={{padding: '12px 8px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Cor</th>
                      <th style={{padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Pacote (kg)</th>
                      <th style={{padding: '12px 8px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', textTransform: 'uppercase'}}>Produção (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamento.itens.map((item, idx) => (
                      <tr key={idx} style={{borderBottom: idx < lancamento.itens.length - 1 ? '1px solid #f3f4f6' : 'none'}}>
                        <td style={{padding: '12px 8px', fontSize: '14px', color: '#111827'}}>{item.formato || '-'}</td>
                        <td style={{padding: '12px 8px', fontSize: '14px', color: '#111827'}}>{item.cor || '-'}</td>
                        <td style={{padding: '12px 8px', fontSize: '14px', color: '#111827', textAlign: 'center'}}>{parseFloat(item.pacote_kg || 0).toFixed(0)}</td>
                        <td style={{padding: '12px 8px', fontSize: '14px', color: '#16a34a', textAlign: 'right', fontWeight: '500'}}>{parseFloat(item.producao_kg || 0).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards para Mobile */}
              <div className="preview-items-mobile">
                {lancamento.itens.map((item, idx) => (
                  <div key={idx} style={{
                    background: '#f9fafb',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: idx < lancamento.itens.length - 1 ? '10px' : '0',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                      <span style={{fontWeight: '600', color: '#111827', fontSize: '15px'}}>{item.formato || '-'}</span>
                      <span style={{background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: '500'}}>{item.cor || '-'}</span>
                    </div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '14px'}}>
                      <div>
                        <span style={{color: '#6b7280'}}>Pacote: </span>
                        <span style={{color: '#111827', fontWeight: '500'}}>{parseFloat(item.pacote_kg || 0).toFixed(0)} kg</span>
                      </div>
                      <div>
                        <span style={{color: '#6b7280'}}>Produção: </span>
                        <span style={{color: '#16a34a', fontWeight: '700'}}>{parseFloat(item.producao_kg || 0).toFixed(0)} kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cards de Totais */}
            <div className="preview-totais-grid">
              {/* Produção Total - Rosa Claro */}
              <div style={{background: '#fce7f3', borderRadius: '8px', padding: '15px', textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: '#be185d', marginBottom: '6px'}}>Produção Total</div>
                <div style={{fontSize: '20px', fontWeight: '700', color: '#9d174d'}}>{previewData.producaoTotal} kg</div>
              </div>
              
              {/* Orelha - Vermelho */}
              <div style={{background: '#fecaca', borderRadius: '8px', padding: '15px', textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: '#dc2626', marginBottom: '6px'}}>Orelha</div>
                <div style={{fontSize: '20px', fontWeight: '700', color: '#b91c1c'}}>{parseFloat(lancamento.orelha_kg || 0).toFixed(0)} kg</div>
              </div>
              
              {/* Aparas - Vermelho */}
              <div style={{background: '#fecaca', borderRadius: '8px', padding: '15px', textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: '#dc2626', marginBottom: '6px'}}>Aparas</div>
                <div style={{fontSize: '20px', fontWeight: '700', color: '#b91c1c'}}>{parseFloat(lancamento.aparas_kg || 0).toFixed(0)} kg</div>
              </div>
              
              {/* Perdas Total - Amarelo */}
              <div style={{background: '#fef3c7', borderRadius: '8px', padding: '15px', textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: '#d97706', marginBottom: '6px'}}>Perdas Total</div>
                <div style={{fontSize: '20px', fontWeight: '700', color: '#b45309'}}>{previewData.perdasTotal} kg</div>
              </div>
              
              {/* % Perdas - Lilás */}
              <div style={{background: '#e9d5ff', borderRadius: '8px', padding: '15px', textAlign: 'center'}}>
                <div style={{fontSize: '12px', color: '#7c3aed', marginBottom: '6px'}}>% Perdas</div>
                <div style={{fontSize: '20px', fontWeight: '700', color: '#6d28d9'}}>{previewData.percentualPerdas}%</div>
              </div>
            </div>
          </>
        </div>

        <div style={{display: 'flex', gap: '10px'}}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/lancamentos')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditarLancamento;
