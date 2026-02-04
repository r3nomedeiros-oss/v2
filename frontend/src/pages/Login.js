import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, UserPlus, Factory } from 'lucide-react';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo: 'Operador'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const response = await axios.post(`${API_URL}${endpoint}`, form);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin(response.data.user);
        navigate('/');
      } else if (isRegister) {
        alert('Usuário cadastrado! Faça login.');
        setIsRegister(false);
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao processar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '90%',
        maxWidth: '450px',
        textAlign: 'center'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            borderRadius: '50%',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Factory size={40} color="white" />
          </div>
          <h1 style={{ fontSize: '28px', color: '#2d3748', marginBottom: '10px', fontWeight: '700' }}>
            {isRegister ? 'Criar Conta' : 'Bem-vindo'}
          </h1>
          <p style={{ color: '#718096', marginBottom: '0' }}>
            Sistema de Controle de Produção - PolyTrack
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          {isRegister && (
            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                className="form-control"
                value={form.nome}
                onChange={(e) => setForm({...form, nome: e.target.value})}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              className="form-control"
              value={form.senha}
              onChange={(e) => setForm({...form, senha: e.target.value})}
              required
            />
          </div>
          {isRegister && (
            <div className="form-group">
              <label>Tipo de Usuário</label>
              <select
                className="form-control"
                value={form.tipo}
                onChange={(e) => setForm({...form, tipo: e.target.value})}
              >
                <option value="Operador">Operador</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{width: '100%', marginBottom: '10px', justifyContent: 'center'}} disabled={loading}>
            {isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            {loading ? 'Processando...' : (isRegister ? 'Cadastrar' : 'Entrar')}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{width: '100%', justifyContent: 'center'}}
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
