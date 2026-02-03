import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn, UserPlus } from 'lucide-react';

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
      alert(error.response?.data?.error || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'}}>
      <div className="card" style={{maxWidth: '400px', width: '100%', margin: '20px'}}>
        <h1 style={{marginBottom: '10px', textAlign: 'center'}}>
          {isRegister ? 'Cadastro' : 'Login'}
        </h1>
        <p style={{textAlign: 'center', color: '#718096', marginBottom: '30px'}}>
          Sistema de Controle de Produção
        </p>

        <form onSubmit={handleSubmit}>
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

          <button type="submit" className="btn btn-primary" style={{width: '100%', marginBottom: '10px'}} disabled={loading}>
            {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            {loading ? 'Processando...' : (isRegister ? 'Cadastrar' : 'Entrar')}
          </button>

          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{width: '100%'}}
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