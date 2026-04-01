import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const DadosContext = createContext();

// Tempo de cache: 10 segundos (reduzido para melhor responsividade)
const CACHE_DURATION = 10 * 1000;

export function DadosProvider({ children }) {
  const [lancamentos, setLancamentos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  const lastFetchLancamentos = useRef(null);
  const lastFetchStats = useRef(null);
  const fetchPromiseLancamentos = useRef(null);
  const fetchPromiseStats = useRef(null);

  // Carregar lançamentos com cache
  const carregarLancamentos = useCallback(async (forceRefresh = false, dataInicio = '', dataFim = '') => {
    // Se tem filtros, sempre busca do servidor
    if (dataInicio || dataFim) {
      setLoading(true);
      try {
        let url = `${API_URL}/lancamentos`;
        const params = new URLSearchParams();
        if (dataInicio) params.append('data_inicio', dataInicio);
        if (dataFim) params.append('data_fim', dataFim);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await axios.get(url);
        return response.data;
      } catch (error) {
        console.error('Erro ao carregar lançamentos:', error);
        return [];
      } finally {
        setLoading(false);
      }
    }

    // Se já tem uma requisição em andamento, aguarda ela
    if (fetchPromiseLancamentos.current) {
      return fetchPromiseLancamentos.current;
    }

    // Verifica se o cache ainda é válido
    const now = Date.now();
    if (!forceRefresh && loaded && lastFetchLancamentos.current && (now - lastFetchLancamentos.current) < CACHE_DURATION) {
      return lancamentos;
    }

    setLoading(true);
    
    fetchPromiseLancamentos.current = (async () => {
      try {
        const response = await axios.get(`${API_URL}/lancamentos`);
        setLancamentos(response.data);
        lastFetchLancamentos.current = Date.now();
        setLoaded(true);
        return response.data;
      } catch (error) {
        console.error('Erro ao carregar lançamentos:', error);
        return [];
      } finally {
        setLoading(false);
        fetchPromiseLancamentos.current = null;
      }
    })();

    return fetchPromiseLancamentos.current;
  }, [loaded, lancamentos]);

  // Carregar estatísticas com cache
  const carregarStats = useCallback(async (forceRefresh = false, periodo = 'mensal', dataInicio = '', dataFim = '') => {
    // Se é customizado ou tem filtros específicos, sempre busca do servidor
    if (periodo === 'customizado' || (periodo !== 'mensal' && periodo !== 'semanal' && periodo !== 'anual')) {
      setLoading(true);
      try {
        let url = `${API_URL}/relatorios?periodo=${periodo}`;
        if (dataInicio) url += `&data_inicio=${dataInicio}`;
        if (dataFim) url += `&data_fim=${dataFim}`;
        
        const response = await axios.get(url);
        return response.data;
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        return null;
      } finally {
        setLoading(false);
      }
    }

    // Se período não é mensal, busca do servidor (sem cache)
    if (periodo !== 'mensal') {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/relatorios?periodo=${periodo}`);
        return response.data;
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        return null;
      } finally {
        setLoading(false);
      }
    }

    // Se já tem uma requisição em andamento para stats mensal, aguarda ela
    if (fetchPromiseStats.current) {
      return fetchPromiseStats.current;
    }

    // Verifica se o cache ainda é válido (apenas para mensal)
    const now = Date.now();
    if (!forceRefresh && stats && lastFetchStats.current && (now - lastFetchStats.current) < CACHE_DURATION) {
      return stats;
    }

    setLoading(true);
    
    fetchPromiseStats.current = (async () => {
      try {
        const response = await axios.get(`${API_URL}/relatorios?periodo=mensal`);
        setStats(response.data);
        lastFetchStats.current = Date.now();
        return response.data;
      } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        return null;
      } finally {
        setLoading(false);
        fetchPromiseStats.current = null;
      }
    })();

    return fetchPromiseStats.current;
  }, [stats]);

  // Pré-carregar dados ao iniciar (Dashboard e Lançamentos)
  const preCarregarDados = useCallback(async () => {
    await Promise.all([
      carregarLancamentos(),
      carregarStats()
    ]);
  }, [carregarLancamentos, carregarStats]);

  // Força atualização do cache (usado após criar/editar/deletar lançamento)
  const invalidarCache = useCallback(() => {
    lastFetchLancamentos.current = null;
    lastFetchStats.current = null;
    setLoaded(false);
  }, []);

  const value = {
    lancamentos,
    stats,
    loading,
    loaded,
    carregarLancamentos,
    carregarStats,
    preCarregarDados,
    invalidarCache
  };

  return (
    <DadosContext.Provider value={value}>
      {children}
    </DadosContext.Provider>
  );
}

export function useDados() {
  const context = useContext(DadosContext);
  if (!context) {
    throw new Error('useDados deve ser usado dentro de um DadosProvider');
  }
  return context;
}
