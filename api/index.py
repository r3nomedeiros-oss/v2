from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime, date, time, timedelta
import uuid
from supabase import create_client
import bcrypt
import jwt
from functools import wraps

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'chave-secreta-producao-sacolas-2026')

# Supabase
supabase_url = os.environ.get('SUPABASE_URL', 'https://qmhldxyagakxeywkszkq.supabase.co')
supabase_key = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtaGxkeHlhZ2FreGV5d2tzemtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzY4NzYsImV4cCI6MjA4NTY1Mjg3Nn0.BZCpzK6eAR-AnorwIWvHbU_OHVBtwLnENYglwRJkJio')
supabase = create_client(supabase_url, supabase_key)

# ==================== ROOT ====================

@app.route('/')
@app.route('/api')
@app.route('/api/')
def root():
    return jsonify({"message": "API de Controle de Produção - Sacolas", "status": "online"})

# ==================== AUTENTICAÇÃO ====================

@app.route('/api/auth/register', methods=['POST'])
def registrar_usuario():
    try:
        data = request.get_json()
        existing = supabase.table("users").select("*").eq("email", data['email']).execute()
        if existing.data:
            return jsonify({"error": "Email já cadastrado"}), 400
        
        hashed = bcrypt.hashpw(data['senha'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = {
            "id": str(uuid.uuid4()),
            "nome": data['nome'],
            "email": data['email'],
            "senha": hashed,
            "tipo": data.get('tipo', 'Operador'),
            "created_at": datetime.now().isoformat()
        }
        supabase.table("users").insert(user).execute()
        return jsonify({"success": True, "message": "Usuário cadastrado com sucesso"}), 201
    except Exception as e:
        print(f"Erro ao registrar usuário: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        response = supabase.table("users").select("*").eq("email", data['email']).execute()
        if not response.data:
            return jsonify({"error": "Usuário não encontrado"}), 404
        
        user = response.data[0]
        if bcrypt.checkpw(data['senha'].encode('utf-8'), user['senha'].encode('utf-8')):
            token = jwt.encode({
                'user_id': user['id'],
                'exp': datetime.utcnow() + timedelta(days=7)
            }, app.config['SECRET_KEY'])
            
            user_data = {k: v for k, v in user.items() if k != 'senha'}
            return jsonify({"token": token, "user": user_data})
        
        return jsonify({"error": "Senha incorreta"}), 401
    except Exception as e:
        print(f"Erro ao fazer login: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ==================== USUÁRIOS ====================

@app.route('/api/users', methods=['GET'])
def listar_usuarios():
    try:
        response = supabase.table("users").select("*").order("created_at", desc=True).execute()
        users = [{k: v for k, v in u.items() if k != 'senha'} for u in response.data]
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/<user_id>', methods=['DELETE'])
def deletar_usuario(user_id):
    try:
        supabase.table("users").delete().eq("id", user_id).execute()
        return jsonify({"success": True, "message": "Usuário excluído com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== LANÇAMENTOS ====================

@app.route('/api/lancamentos', methods=['POST'])
def criar_lancamento():
    try:
        data = request.get_json()
        
        lancamento_id = str(uuid.uuid4())
        
        # Calcular totais
        itens = data.get('itens', [])
        producao_total = sum(float(item.get('producao_kg', 0) or 0) for item in itens)
        perdas_total = float(data.get('orelha_kg', 0) or 0) + float(data.get('aparas_kg', 0) or 0)
        # Fórmula correta: Perdas / Produção * 100
        percentual_perdas = round((perdas_total / producao_total * 100), 2) if producao_total > 0 else 0
        
        lancamento = {
            "id": lancamento_id,
            "data": data['data'],
            "turno": data['turno'],
            "hora": data.get('hora') or datetime.now().strftime("%H:%M"),
            "orelha_kg": float(data.get('orelha_kg', 0) or 0),
            "aparas_kg": float(data.get('aparas_kg', 0) or 0),
            "producao_total": producao_total,
            "perdas_total": perdas_total,
            "percentual_perdas": percentual_perdas,
            "created_at": datetime.now().isoformat()
        }
        
        supabase.table("lancamentos").insert(lancamento).execute()
        
        # Inserir itens
        for item in itens:
            item_obj = {
                "id": str(uuid.uuid4()),
                "lancamento_id": lancamento_id,
                "formato": item['formato'],
                "cor": item['cor'],
                "pacote_kg": float(item.get('pacote_kg', 0) or 0),
                "producao_kg": float(item.get('producao_kg', 0) or 0)
            }
            supabase.table("itens_producao").insert(item_obj).execute()
        
        return jsonify({"success": True, "id": lancamento_id}), 201
    
    except Exception as e:
        print(f"Erro ao criar lançamento: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos', methods=['GET'])
def listar_lancamentos():
    try:
        # Obter filtros de data
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        
        query = supabase.table("lancamentos").select("*")
        
        if data_inicio:
            query = query.gte("data", data_inicio)
        if data_fim:
            query = query.lte("data", data_fim)
        
        response = query.order("data", desc=True).order("hora", desc=True).execute()
        lancamentos = response.data
        
        if not lancamentos:
            return jsonify([])

        # Buscar todos os itens dos lançamentos listados
        lanc_ids = [l['id'] for l in lancamentos]
        itens_response = supabase.table("itens_producao").select("*").in_("lancamento_id", lanc_ids).execute()
        
        # Agrupar itens por lancamento_id
        itens_por_lanc = {}
        for item in itens_response.data:
            lid = item['lancamento_id']
            if lid not in itens_por_lanc:
                itens_por_lanc[lid] = []
            itens_por_lanc[lid].append(item)
            
        result = []
        for lanc in lancamentos:
            itens = itens_por_lanc.get(lanc['id'], [])
            
            # Sempre calcular producao_total a partir dos itens (mais confiável)
            producao_total = sum(float(item.get('producao_kg', 0) or 0) for item in itens)
            
            # Calcular perdas
            perdas_total = float(lanc.get('orelha_kg', 0) or 0) + float(lanc.get('aparas_kg', 0) or 0)
            
            # Calcular percentual - Fórmula correta: Perdas / Produção * 100
            percentual_perdas = round((perdas_total / producao_total * 100), 2) if producao_total > 0 else 0
            
            result.append({
                **lanc,
                'itens': itens,
                'producao_total': round(producao_total, 2),
                'perdas_total': round(perdas_total, 2),
                'percentual_perdas': round(percentual_perdas, 2)
            })
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Erro ao listar lançamentos: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos/<lancamento_id>', methods=['GET'])
def obter_lancamento(lancamento_id):
    try:
        response = supabase.table("lancamentos").select("*").eq("id", lancamento_id).execute()
        if not response.data:
            return jsonify({"error": "Lançamento não encontrado"}), 404
        
        lancamento = response.data[0]
        itens_response = supabase.table("itens_producao").select("*").eq("lancamento_id", lancamento_id).execute()
        lancamento['itens'] = itens_response.data or []
        
        # Sempre calcular producao_total a partir dos itens (mais confiável)
        lancamento['producao_total'] = sum(float(item.get('producao_kg', 0) or 0) for item in lancamento['itens'])
        lancamento['perdas_total'] = float(lancamento.get('orelha_kg', 0) or 0) + float(lancamento.get('aparas_kg', 0) or 0)
        # Fórmula correta: Perdas / Produção * 100
        lancamento['percentual_perdas'] = round((lancamento['perdas_total'] / lancamento['producao_total'] * 100), 2) if lancamento['producao_total'] > 0 else 0
        
        return jsonify(lancamento)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos/<lancamento_id>', methods=['PUT'])
def atualizar_lancamento(lancamento_id):
    try:
        data = request.get_json()
        
        # Calcular totais
        itens = data.get('itens', [])
        producao_total = sum(float(item.get('producao_kg', 0) or 0) for item in itens)
        perdas_total = float(data.get('orelha_kg', 0) or 0) + float(data.get('aparas_kg', 0) or 0)
        # Fórmula correta: Perdas / Produção * 100
        percentual_perdas = round((perdas_total / producao_total * 100), 2) if producao_total > 0 else 0
        
        lancamento_update = {
            "data": data['data'],
            "turno": data['turno'],
            "hora": data.get('hora'),
            "orelha_kg": float(data.get('orelha_kg', 0) or 0),
            "aparas_kg": float(data.get('aparas_kg', 0) or 0),
            "producao_total": producao_total,
            "perdas_total": perdas_total,
            "percentual_perdas": percentual_perdas
        }
        
        # Atualizar dados básicos
        supabase.table("lancamentos").update(lancamento_update).eq("id", lancamento_id).execute()
        
        # Deletar itens antigos e inserir novos
        supabase.table("itens_producao").delete().eq("lancamento_id", lancamento_id).execute()
        
        for item in itens:
            item_obj = {
                "id": str(uuid.uuid4()),
                "lancamento_id": lancamento_id,
                "formato": item['formato'],
                "cor": item['cor'],
                "pacote_kg": float(item.get('pacote_kg', 0) or 0),
                "producao_kg": float(item.get('producao_kg', 0) or 0)
            }
            supabase.table("itens_producao").insert(item_obj).execute()
        
        return jsonify({"success": True})
    
    except Exception as e:
        print(f"Erro ao atualizar lançamento: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos/<lancamento_id>', methods=['DELETE'])
def deletar_lancamento(lancamento_id):
    try:
        # Deletar itens primeiro
        supabase.table("itens_producao").delete().eq("lancamento_id", lancamento_id).execute()
        # Deletar lançamento
        supabase.table("lancamentos").delete().eq("id", lancamento_id).execute()
        return jsonify({"success": True, "message": "Lançamento excluído com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== RELATÓRIOS ====================

@app.route('/api/relatorios', methods=['GET'])
def gerar_relatorio():
    try:
        periodo = request.args.get('periodo', 'mensal')
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        
        hoje = datetime.now().date()
        
        # Definir período
        if periodo == "semanal":
            inicio = hoje - timedelta(days=7)
            fim = hoje
        elif periodo == "mensal":
            inicio = hoje.replace(day=1)
            fim = hoje
        elif periodo == "anual":
            inicio = hoje.replace(month=1, day=1)
            fim = hoje
        elif periodo == "customizado" and data_inicio and data_fim:
            inicio = datetime.strptime(data_inicio, "%Y-%m-%d").date()
            fim = datetime.strptime(data_fim, "%Y-%m-%d").date()
        else:
            inicio = hoje.replace(day=1)
            fim = hoje
        
        # Buscar lançamentos no período
        response = supabase.table("lancamentos").select("*").gte("data", str(inicio)).lte("data", str(fim)).execute()
        lancamentos = response.data
        
        if not lancamentos:
            return jsonify({
                "producao_total": 0, 
                "perdas_total": 0, 
                "percentual_perdas": 0,
                "dias_produzidos": 0, 
                "media_diaria": 0, 
                "data_inicio": str(inicio), 
                "data_fim": str(fim),
                "por_turno": {
                    "A": {"producao": 0, "perdas": 0, "media_diaria": 0, "percentual_perdas": 0, "dias_produzidos": 0},
                    "B": {"producao": 0, "perdas": 0, "media_diaria": 0, "percentual_perdas": 0, "dias_produzidos": 0},
                    "Administrativo": {"producao": 0, "perdas": 0, "media_diaria": 0, "percentual_perdas": 0, "dias_produzidos": 0}
                },
                "itens_por_formato_cor": []
            })
        
        # Buscar itens e calcular totais
        itens_por_formato_cor = {}
        
        for lanc in lancamentos:
            itens_response = supabase.table("itens_producao").select("*").eq("lancamento_id", lanc['id']).execute()
            itens = itens_response.data if itens_response.data else []
            
            # Calcular producao_total e perdas_total se não existirem
            if lanc.get('producao_total') is None or lanc.get('producao_total') == 0:
                lanc['producao_total'] = sum(float(item.get('producao_kg', 0) or 0) for item in itens)
            if lanc.get('perdas_total') is None or lanc.get('perdas_total') == 0:
                lanc['perdas_total'] = float(lanc.get('orelha_kg', 0) or 0) + float(lanc.get('aparas_kg', 0) or 0)
            
            for item in itens:
                key = f"{item['formato']}|{item['cor']}"
                if key not in itens_por_formato_cor:
                    itens_por_formato_cor[key] = {
                        "formato": item['formato'],
                        "cor": item['cor'],
                        "producao_total": 0,
                        "pacote_total": 0,
                        "quantidade_lancamentos": 0
                    }
                itens_por_formato_cor[key]['producao_total'] += float(item.get('producao_kg', 0) or 0)
                itens_por_formato_cor[key]['pacote_total'] += float(item.get('pacote_kg', 0) or 0)
                itens_por_formato_cor[key]['quantidade_lancamentos'] += 1
        
        # Calcular totais
        producao_total = sum(float(l.get('producao_total', 0) or 0) for l in lancamentos)
        perdas_total = sum(float(l.get('perdas_total', 0) or 0) for l in lancamentos)
        
        # Dias únicos com produção
        dias_unicos = set(l['data'] for l in lancamentos)
        dias_produzidos = len(dias_unicos)
        
        # Fórmula correta: Perdas / Produção * 100
        percentual_perdas = round((perdas_total / producao_total * 100), 2) if producao_total > 0 else 0
        media_diaria = round(producao_total / dias_produzidos, 2) if dias_produzidos > 0 else 0
        
        # Por turno
        por_turno = {}
        for lanc in lancamentos:
            turno = lanc.get('turno', 'A')
            if turno not in por_turno:
                por_turno[turno] = {
                    "producao": 0,
                    "perdas": 0,
                    "dias": set()
                }
            por_turno[turno]['producao'] += float(lanc.get('producao_total', 0) or 0)
            por_turno[turno]['perdas'] += float(lanc.get('perdas_total', 0) or 0)
            por_turno[turno]['dias'].add(lanc['data'])
        
        # Formatar dados por turno
        por_turno_formatado = {}
        for turno, dados in por_turno.items():
            dias_turno = len(dados['dias'])
            # Fórmula correta: Perdas / Produção * 100
            por_turno_formatado[turno] = {
                "producao": round(dados['producao'], 2),
                "perdas": round(dados['perdas'], 2),
                "percentual_perdas": round((dados['perdas'] / dados['producao'] * 100), 2) if dados['producao'] > 0 else 0,
                "media_diaria": round(dados['producao'] / dias_turno, 2) if dias_turno > 0 else 0,
                "dias_produzidos": dias_turno
            }
        
        # Garantir que todos os turnos existam
        for turno in ['A', 'B', 'Administrativo']:
            if turno not in por_turno_formatado:
                por_turno_formatado[turno] = {
                    "producao": 0,
                    "perdas": 0,
                    "percentual_perdas": 0,
                    "media_diaria": 0,
                    "dias_produzidos": 0
                }
        
        # Formatar itens por formato e cor
        itens_lista = sorted(itens_por_formato_cor.values(), key=lambda x: x['producao_total'], reverse=True)
        
        return jsonify({
            "producao_total": round(producao_total, 2),
            "perdas_total": round(perdas_total, 2),
            "percentual_perdas": percentual_perdas,
            "media_diaria": media_diaria,
            "dias_produzidos": dias_produzidos,
            "data_inicio": str(inicio),
            "data_fim": str(fim),
            "por_turno": por_turno_formatado,
            "itens_por_formato_cor": itens_lista
        })
        
    except Exception as e:
        print(f"Erro ao gerar relatório: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ==================== VARIÁVEIS - TURNOS ====================

@app.route('/api/variaveis/turnos', methods=['GET'])
def listar_turnos():
    try:
        response = supabase.table("turnos").select("*").order("ordem").order("nome").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/turnos', methods=['POST'])
def criar_turno():
    try:
        data = request.get_json()
        
        # Pegar a maior ordem atual
        max_ordem = supabase.table("turnos").select("ordem").order("ordem", desc=True).limit(1).execute()
        nova_ordem = (max_ordem.data[0]['ordem'] + 1) if max_ordem.data and max_ordem.data[0].get('ordem') is not None else 0
        
        doc = {
            "id": str(uuid.uuid4()),
            "nome": data['nome'],
            "ativo": data.get('ativo', True),
            "ordem": nova_ordem,
            "created_at": datetime.now().isoformat()
        }
        supabase.table("turnos").insert(doc).execute()
        return jsonify(doc), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/turnos/<turno_id>', methods=['PUT'])
def atualizar_turno(turno_id):
    try:
        data = request.get_json()
        doc = {
            "nome": data['nome'], 
            "ativo": data.get('ativo', True), 
            "ordem": data.get('ordem', 0)
        }
        supabase.table("turnos").update(doc).eq("id", turno_id).execute()
        response = supabase.table("turnos").select("*").eq("id", turno_id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/turnos/reordenar', methods=['POST'])
def reordenar_turnos():
    try:
        data = request.get_json()
        for item in data.get('itens', []):
            supabase.table("turnos").update({"ordem": item['ordem']}).eq("id", item['id']).execute()
        return jsonify({"message": "Ordem atualizada com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/turnos/<turno_id>', methods=['DELETE'])
def deletar_turno(turno_id):
    try:
        supabase.table("turnos").delete().eq("id", turno_id).execute()
        return jsonify({"message": "Turno excluído com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== VARIÁVEIS - FORMATOS ====================

@app.route('/api/variaveis/formatos', methods=['GET'])
def listar_formatos():
    try:
        response = supabase.table("formatos").select("*").order("ordem").order("nome").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/formatos', methods=['POST'])
def criar_formato():
    try:
        data = request.get_json()
        
        max_ordem = supabase.table("formatos").select("ordem").order("ordem", desc=True).limit(1).execute()
        nova_ordem = (max_ordem.data[0]['ordem'] + 1) if max_ordem.data and max_ordem.data[0].get('ordem') is not None else 0
        
        doc = {
            "id": str(uuid.uuid4()),
            "nome": data['nome'],
            "ativo": data.get('ativo', True),
            "ordem": nova_ordem,
            "created_at": datetime.now().isoformat()
        }
        supabase.table("formatos").insert(doc).execute()
        return jsonify(doc), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/formatos/<formato_id>', methods=['PUT'])
def atualizar_formato(formato_id):
    try:
        data = request.get_json()
        doc = {
            "nome": data['nome'], 
            "ativo": data.get('ativo', True), 
            "ordem": data.get('ordem', 0)
        }
        supabase.table("formatos").update(doc).eq("id", formato_id).execute()
        response = supabase.table("formatos").select("*").eq("id", formato_id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/formatos/reordenar', methods=['POST'])
def reordenar_formatos():
    try:
        data = request.get_json()
        for item in data.get('itens', []):
            supabase.table("formatos").update({"ordem": item['ordem']}).eq("id", item['id']).execute()
        return jsonify({"message": "Ordem atualizada com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/formatos/<formato_id>', methods=['DELETE'])
def deletar_formato(formato_id):
    try:
        supabase.table("formatos").delete().eq("id", formato_id).execute()
        return jsonify({"message": "Formato excluído com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== VARIÁVEIS - CORES ====================

@app.route('/api/variaveis/cores', methods=['GET'])
def listar_cores():
    try:
        response = supabase.table("cores").select("*").order("ordem").order("nome").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/cores', methods=['POST'])
def criar_cor():
    try:
        data = request.get_json()
        
        max_ordem = supabase.table("cores").select("ordem").order("ordem", desc=True).limit(1).execute()
        nova_ordem = (max_ordem.data[0]['ordem'] + 1) if max_ordem.data and max_ordem.data[0].get('ordem') is not None else 0
        
        doc = {
            "id": str(uuid.uuid4()),
            "nome": data['nome'],
            "ativo": data.get('ativo', True),
            "ordem": nova_ordem,
            "created_at": datetime.now().isoformat()
        }
        supabase.table("cores").insert(doc).execute()
        return jsonify(doc), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/cores/<cor_id>', methods=['PUT'])
def atualizar_cor(cor_id):
    try:
        data = request.get_json()
        doc = {
            "nome": data['nome'], 
            "ativo": data.get('ativo', True), 
            "ordem": data.get('ordem', 0)
        }
        supabase.table("cores").update(doc).eq("id", cor_id).execute()
        response = supabase.table("cores").select("*").eq("id", cor_id).execute()
        return jsonify(response.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/cores/reordenar', methods=['POST'])
def reordenar_cores():
    try:
        data = request.get_json()
        for item in data.get('itens', []):
            supabase.table("cores").update({"ordem": item['ordem']}).eq("id", item['id']).execute()
        return jsonify({"message": "Ordem atualizada com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/variaveis/cores/<cor_id>', methods=['DELETE'])
def deletar_cor(cor_id):
    try:
        supabase.table("cores").delete().eq("id", cor_id).execute()
        return jsonify({"message": "Cor excluída com sucesso"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== STATUS CHECK ====================

@app.route('/api/status', methods=['POST'])
def criar_status():
    try:
        data = request.get_json()
        doc = {
            "id": str(uuid.uuid4()),
            "client_name": data['client_name'],
            "timestamp": datetime.now().isoformat()
        }
        supabase.table("status_checks").insert(doc).execute()
        return jsonify(doc), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/status', methods=['GET'])
def listar_status():
    try:
        response = supabase.table("status_checks").select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==================== CACHE HEADERS ====================

@app.after_request
def add_cache_headers(response):
    if request.path.startswith('/api/lancamentos') or request.path.startswith('/api/relatorios'):
        response.headers['Cache-Control'] = 'public, max-age=60'
    return response

if __name__ == '__main__':
    app.run(debug=False, threaded=True)
