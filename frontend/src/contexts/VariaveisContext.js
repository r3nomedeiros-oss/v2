import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

const VariaveisContext = createContext();

// Tempo de cache: 5 minutos
const CACHE_DURATION = 5 * 60 * 1000;

export function VariaveisProvider({ children }) {
  const [turnos, setTurnos] = useState([]);
  const [formatos, setFormatos] = useState([]);
  const [cores, setCores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  const lastFetch = useRef(null);
  const fetchPromise = useRef(null);

  const carregarVariaveis = useCallback(async (forceRefresh = false) => {
    // Se já tem uma requisição em andamento, aguarda ela
    if (fetchPromise.current) {
      return fetchPromise.current;
    }

    // Verifica se o cache ainda é válido
    const now = Date.now();
    if (!forceRefresh && loaded && lastFetch.current && (now - lastFetch.current) < CACHE_DURATION) {
      return { turnos, formatos, cores };
    }

    setLoading(true);
    
    fetchPromise.current = (async () => {
      try {
        const [turnosRes, formatosRes, coresRes] = await Promise.all([
          axios.get(`${API_URL}/variaveis/turnos`),
          axios.get(`${API_URL}/variaveis/formatos`),
          axios.get(`${API_URL}/variaveis/cores`)
        ]);
        
        const turnosAtivos = (turnosRes.data || []).filter(t => t.ativo);
        const formatosAtivos = (formatosRes.data || []).filter(f => f.ativo);
        const coresAtivas = (coresRes.data || []).filter(c => c.ativo);
        
        setTurnos(turnosAtivos);
        setFormatos(formatosAtivos);
        setCores(coresAtivas);
        setLoaded(true);
        lastFetch.current = Date.now();
        
        return { turnos: turnosAtivos, formatos: formatosAtivos, cores: coresAtivas };
      } catch (error) {
        console.error('Erro ao carregar variáveis:', error);
        // Usar valores padrão se não conseguir carregar
        const defaultTurnos = [{id: '1', nome: 'A'}, {id: '2', nome: 'B'}, {id: '3', nome: 'Administrativo'}];
        setTurnos(defaultTurnos);
        return { turnos: defaultTurnos, formatos: [], cores: [] };
      } finally {
        setLoading(false);
        fetchPromise.current = null;
      }
    })();

    return fetchPromise.current;
  }, [loaded, turnos, formatos, cores]);

  // Força atualização do cache (usado após criar/editar/deletar variável)
  const invalidarCache = useCallback(() => {
    lastFetch.current = null;
    setLoaded(false);
  }, []);

  const value = {
    turnos,
    formatos,
    cores,
    loading,
    loaded,
    carregarVariaveis,
    invalidarCache
  };

  return (
    <VariaveisContext.Provider value={value}>
      {children}
    </VariaveisContext.Provider>
  );
}

export function useVariaveis() {
  const context = useContext(VariaveisContext);
  if (!context) {
    throw new Error('useVariaveis deve ser usado dentro de um VariaveisProvider');
  }
  return context;
}
