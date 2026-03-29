import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Check, X, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { useVariaveis } from '../contexts/VariaveisContext';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function Variaveis() {
  const [turnos, setTurnos] = useState([]);
  const [formatos, setFormatos] = useState([]);
  const [cores, setCores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('turnos');
  
  // Usar o cache de variáveis
  const { invalidarCache } = useVariaveis();
  
  // Estados para edição
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  
  // Estados para novo item
  const [novoTurno, setNovoTurno] = useState('');
  const [novoFormato, setNovoFormato] = useState('');
  const [novaCor, setNovaCor] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [turnosRes, formatosRes, coresRes] = await Promise.all([
        axios.get(`${API_URL}/variaveis/turnos`),
        axios.get(`${API_URL}/variaveis/formatos`),
        axios.get(`${API_URL}/variaveis/cores`)
      ]);
      setTurnos(turnosRes.data || []);
      setFormatos(formatosRes.data || []);
      setCores(coresRes.data || []);
      invalidarCache(); // Invalidar cache global quando carregar dados frescos
    } catch (error) {
      console.error('Erro ao carregar variáveis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função genérica para mover item
  const moverItem = async (items, setItems, tipo, index, direcao) => {
    if ((direcao === -1 && index === 0) || (direcao === 1 && index === items.length - 1)) {
      return; // Não pode mover além dos limites
    }

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + direcao];
    newItems[index + direcao] = temp;

    // Atualizar ordem de todos os itens
    const itensComOrdem = newItems.map((item, idx) => ({
      ...item,
      ordem: idx
    }));

    setItems(itensComOrdem);

    // Salvar no backend
    try {
      await axios.post(`${API_URL}/variaveis/${tipo}/reordenar`, {
        itens: itensComOrdem.map(item => ({ id: item.id, ordem: item.ordem }))
      });
    } catch (error) {
      console.error('Erro ao reordenar:', error);
      carregarDados(); // Recarregar em caso de erro
    }
  };

  // Funções para Turnos
  const adicionarTurno = async () => {
    if (!novoTurno.trim()) return;
    try {
      await axios.post(`${API_URL}/variaveis/turnos`, { nome: novoTurno, ativo: true });
      setNovoTurno('');
      carregarDados();
    } catch (error) {
      alert('Erro ao adicionar turno');
    }
  };

  const deletarTurno = async (id) => {
    if (!window.confirm('Excluir este turno?')) return;
    try {
      await axios.delete(`${API_URL}/variaveis/turnos/${id}`);
      carregarDados();
    } catch (error) {
      alert('Erro ao excluir turno');
    }
  };

  const atualizarTurno = async (id, ordem) => {
    if (!editingValue.trim()) return;
    try {
      await axios.put(`${API_URL}/variaveis/turnos/${id}`, { nome: editingValue, ativo: true, ordem: ordem || 0 });
      setEditingId(null);
      setEditingValue('');
      carregarDados();
    } catch (error) {
      alert('Erro ao atualizar turno');
    }
  };

  // Funções para Formatos
  const adicionarFormato = async () => {
    if (!novoFormato.trim()) return;
    try {
      await axios.post(`${API_URL}/variaveis/formatos`, { nome: novoFormato, ativo: true });
      setNovoFormato('');
      carregarDados();
    } catch (error) {
      alert('Erro ao adicionar formato');
    }
  };

  const deletarFormato = async (id) => {
    if (!window.confirm('Excluir este formato?')) return;
    try {
      await axios.delete(`${API_URL}/variaveis/formatos/${id}`);
      carregarDados();
    } catch (error) {
      alert('Erro ao excluir formato');
    }
  };

  const atualizarFormato = async (id, ordem) => {
    if (!editingValue.trim()) return;
    try {
      await axios.put(`${API_URL}/variaveis/formatos/${id}`, { nome: editingValue, ativo: true, ordem: ordem || 0 });
      setEditingId(null);
      setEditingValue('');
      carregarDados();
    } catch (error) {
      alert('Erro ao atualizar formato');
    }
  };

  // Funções para Cores
  const adicionarCor = async () => {
    if (!novaCor.trim()) return;
    try {
      await axios.post(`${API_URL}/variaveis/cores`, { nome: novaCor, ativo: true });
      setNovaCor('');
      carregarDados();
    } catch (error) {
      alert('Erro ao adicionar cor');
    }
  };

  const deletarCor = async (id) => {
    if (!window.confirm('Excluir esta cor?')) return;
    try {
      await axios.delete(`${API_URL}/variaveis/cores/${id}`);
      carregarDados();
    } catch (error) {
      alert('Erro ao excluir cor');
    }
  };

  const atualizarCor = async (id, ordem) => {
    if (!editingValue.trim()) return;
    try {
      await axios.put(`${API_URL}/variaveis/cores/${id}`, { nome: editingValue, ativo: true, ordem: ordem || 0 });
      setEditingId(null);
      setEditingValue('');
      carregarDados();
    } catch (error) {
      alert('Erro ao atualizar cor');
    }
  };

  const startEditing = (id, currentValue) => {
    setEditingId(id);
    setEditingValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  // Mapear tipo para endpoint correto
  const tipoParaEndpoint = {
    'turno': 'turnos',
    'formato': 'formatos', 
    'cor': 'cores'
  };

  const renderList = (items, setItems, tipo, novoValor, setNovoValor, adicionar, deletar, atualizar) => (
    <div>
      {/* Formulário de adicionar */}
      <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
        <input
          type="text"
          className="form-control"
          placeholder={`Novo ${tipo}...`}
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && adicionar()}
          style={{flex: 1}}
        />
        <button onClick={adicionar} className="btn btn-primary">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {/* Dica de ordenação */}
      <div style={{fontSize: '13px', color: '#718096', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px'}}>
        <ChevronUp size={14} /><ChevronDown size={14} /> Use as setas para ordenar os itens
      </div>

      {/* Lista de itens */}
      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
        {items.length === 0 ? (
          <div className="empty-state" style={{padding: '30px', textAlign: 'center'}}>
            <p>Nenhum {tipo} cadastrado</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              {/* Botões de ordenação */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '12px'}}>
                <button
                  onClick={() => moverItem(items, setItems, tipoParaEndpoint[tipo], index, -1)}
                  disabled={index === 0}
                  style={{
                    background: index === 0 ? '#e2e8f0' : '#667eea',
                    color: index === 0 ? '#a0aec0' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Mover para cima"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moverItem(items, setItems, tipoParaEndpoint[tipo], index, 1)}
                  disabled={index === items.length - 1}
                  style={{
                    background: index === items.length - 1 ? '#e2e8f0' : '#667eea',
                    color: index === items.length - 1 ? '#a0aec0' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Mover para baixo"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {editingId === item.id ? (
                <div style={{display: 'flex', gap: '10px', flex: 1}}>
                  <input
                    type="text"
                    className="form-control"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && atualizar(item.id, item.ordem)}
                    style={{flex: 1}}
                    autoFocus
                  />
                  <button onClick={() => atualizar(item.id, item.ordem)} className="btn btn-success" style={{padding: '8px 12px'}}>
                    <Check size={16} />
                  </button>
                  <button onClick={cancelEditing} className="btn btn-secondary" style={{padding: '8px 12px'}}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <span style={{fontWeight: '500', fontSize: '15px', flex: 1}}>{item.nome}</span>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <button
                      onClick={() => startEditing(item.id, item.nome)}
                      className="btn btn-secondary"
                      style={{padding: '6px 10px'}}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deletar(item.id)}
                      className="btn btn-danger"
                      style={{padding: '6px 10px'}}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1><Settings size={28} style={{display: 'inline', marginRight: '10px'}} />Variáveis</h1>
        <p>Gerenciar turnos, formatos e cores para o formulário de lançamento</p>
      </div>

      {/* Tabs */}
      <div className="card" style={{marginBottom: '20px'}}>
        <div style={{display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px'}}>
          <button
            onClick={() => setActiveTab('turnos')}
            className={`btn ${activeTab === 'turnos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{flex: 1}}
          >
            Turnos ({turnos.length})
          </button>
          <button
            onClick={() => setActiveTab('formatos')}
            className={`btn ${activeTab === 'formatos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{flex: 1}}
          >
            Formatos ({formatos.length})
          </button>
          <button
            onClick={() => setActiveTab('cores')}
            className={`btn ${activeTab === 'cores' ? 'btn-primary' : 'btn-secondary'}`}
            style={{flex: 1}}
          >
            Cores ({cores.length})
          </button>
        </div>

        {/* Conteúdo das Tabs */}
        {activeTab === 'turnos' && renderList(turnos, setTurnos, 'turno', novoTurno, setNovoTurno, adicionarTurno, deletarTurno, atualizarTurno)}
        {activeTab === 'formatos' && renderList(formatos, setFormatos, 'formato', novoFormato, setNovoFormato, adicionarFormato, deletarFormato, atualizarFormato)}
        {activeTab === 'cores' && renderList(cores, setCores, 'cor', novaCor, setNovaCor, adicionarCor, deletarCor, atualizarCor)}
      </div>
    </div>
  );
}

export default Variaveis;
