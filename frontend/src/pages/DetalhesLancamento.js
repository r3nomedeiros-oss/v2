import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Calendar, Clock, Package, MessageCircle, Edit } from 'lucide-react';
import html2canvas from 'html2canvas';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const formatarKg = (valor) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
};

function DetalhesLancamento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lancamento, setLancamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const detalhesRef = useRef(null);

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

  const compartilharImagemWhatsApp = async () => {
    if (!detalhesRef.current) return;

    try {
      // Capturar a imagem do elemento
      const canvas = await html2canvas(detalhesRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      });

      // Converter para blob
      canvas.toBlob((blob) => {
        // Criar URL temporária
        const url = URL.createObjectURL(blob);
        
        // Criar link para download
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_producao_${lancamento.data}.png`;
        
        // Abrir WhatsApp Web com a imagem
        // Nota: WhatsApp Web não suporta envio direto de imagens via URL
        // Então vamos abrir o WhatsApp e o usuário pode colar a imagem manualmente
        // Alternativa: usar a API do WhatsApp Business (requer configuração)
        
        // Por enquanto, vamos fazer download e abrir WhatsApp
        link.click();
        URL.revokeObjectURL(url);
        
        // Abrir WhatsApp Web
        setTimeout(() => {
          window.open('https://web.whatsapp.com/', '_blank');
        }, 500);
      });
    } catch (error) {
      console.error('Erro ao gerar imagem:', error);
      alert('Erro ao gerar imagem para compartilhamento');
    }
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
      <div style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
        <button onClick={() => navigate('/lancamentos')} className="btn btn-secondary">
          <ArrowLeft size={16} /> Voltar
        </button>
        <button onClick={() => navigate(`/lancamentos/${id}/editar`)} className="btn btn-primary">
          <Edit size={16} /> Editar
        </button>
        <button onClick={compartilharImagemWhatsApp} className="btn" style={{background: '#25D366', color: 'white'}}>
          <MessageCircle size={16} /> Compartilhar WhatsApp
        </button>
      </div>

      <div ref={detalhesRef} style={{background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px'}}>
        <div className="page-header" style={{marginBottom: '20px'}}>
          <h1 style={{fontSize: '24px', marginBottom: '8px'}}>Detalhes do Lançamento</h1>
          <p style={{fontSize: '14px'}}>{formatarData(lancamento.data)} - Turno {lancamento.turno} - {lancamento.hora}</p>
        </div>

        <div className="stats-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px'}}>
          <div className="stat-card" style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #1e40af', padding: '15px', borderRadius: '10px'}}>
            <h3 style={{fontSize: '11px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700'}}>Produção Total</h3>
            <div style={{fontSize: '22px', fontWeight: '800', color: '#1a202c', marginBottom: '5px'}}>{formatarKg(totais.producao)} kg</div>
            <div style={{fontSize: '12px', color: '#4a5568', fontWeight: '600'}}>
              <Package size={12} style={{display: 'inline', marginRight: '4px'}} />
              {lancamento.itens?.length || 0} itens
            </div>
          </div>

          <div className="stat-card" style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #1e40af', padding: '15px', borderRadius: '10px'}}>
            <h3 style={{fontSize: '11px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700'}}>Orelha</h3>
            <div style={{fontSize: '22px', fontWeight: '800', color: '#1a202c'}}>{formatarKg(parseFloat(lancamento.orelha_kg))} kg</div>
          </div>

          <div className="stat-card" style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #1e40af', padding: '15px', borderRadius: '10px'}}>
            <h3 style={{fontSize: '11px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700'}}>Aparas</h3>
            <div style={{fontSize: '22px', fontWeight: '800', color: '#1a202c'}}>{formatarKg(parseFloat(lancamento.aparas_kg))} kg</div>
          </div>

          <div className="stat-card" style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #1e40af', padding: '15px', borderRadius: '10px'}}>
            <h3 style={{fontSize: '11px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700'}}>Perdas Totais</h3>
            <div style={{fontSize: '22px', fontWeight: '800', color: '#1a202c'}}>{formatarKg(totais.perdas)} kg</div>
            <div style={{fontSize: '12px', color: '#4a5568', fontWeight: '600'}}>{totais.percentual}% da produção</div>
          </div>
        </div>

        <div style={{background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '15px'}}>
          <h2 style={{fontSize: '16px', fontWeight: '800', color: '#1a202c', marginBottom: '12px'}}>Itens de Produção</h2>
          
          {lancamento.itens && lancamento.itens.length > 0 ? (
            <div style={{overflowX: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{background: '#f8fafc'}}>
                    <th style={{padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#1a202c', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0'}}>Formato</th>
                    <th style={{padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#1a202c', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0'}}>Cor</th>
                    <th style={{padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#1a202c', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0'}}>Pacote (kg)</th>
                    <th style={{padding: '10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#1a202c', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0'}}>Produção (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamento.itens.map((item, index) => (
                    <tr key={index} style={{borderBottom: '1px solid #e2e8f0'}}>
                      <td style={{padding: '10px', fontSize: '13px', color: '#1a202c'}}>{item.formato}</td>
                      <td style={{padding: '10px', fontSize: '13px', color: '#1a202c'}}>{item.cor}</td>
                      <td style={{padding: '10px', fontSize: '13px', color: '#1a202c'}}>{parseFloat(item.pacote_kg).toFixed(2)}</td>
                      <td style={{padding: '10px', fontSize: '13px', color: '#48bb78', fontWeight: '600'}}>
                        {parseFloat(item.producao_kg).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{textAlign: 'center', padding: '30px', color: '#4a5568'}}>
              <p>Nenhum item de produção registrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetalhesLancamento;
