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

@app.route('/')
@app.route('/api')
@app.route('/api/')
def root():
    return jsonify({"message": "API de Controle de Produção - Sacolas", "status": "online"})

@app.route('/api/lancamentos', methods=['POST'])
def criar_lancamento():
    try:
        data = request.get_json()
        lancamento_id = str(uuid.uuid4())
        
        lancamento = {
            "id": lancamento_id,
            "data": data['data'],
            "turno": data['turno'],
            "hora": data['hora'],
            "orelha_kg": float(data['orelha_kg']),
            "aparas_kg": float(data['aparas_kg'])
        }
        
        supabase.table("lancamentos").insert(lancamento).execute()
        
        itens = []
        for item in data['itens']:
            itens.append({
                "id": str(uuid.uuid4()),
                "lancamento_id": lancamento_id,
                "formato": item['formato'],
                "cor": item['cor'],
                "pacote_kg": float(item['pacote_kg']),
                "producao_kg": float(item['producao_kg'])
            })
        
        if itens:
            supabase.table("itens_producao").insert(itens).execute()
        
        return jsonify({"success": True, "id": lancamento_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos', methods=['GET'])
def listar_lancamentos():
    try:
        resp_lanc = supabase.table("lancamentos").select("*").order("data", desc=True).order("hora", desc=True).limit(100).execute()
        lancamentos = resp_lanc.data
        
        if not lancamentos:
            return jsonify([])
            
        ids = [l['id'] for l in lancamentos]
        resp_itens = supabase.table("itens_producao").select("*").in_("lancamento_id", ids).execute()
        
        itens_map = {}
        for item in resp_itens.data:
            lid = item['lancamento_id']
            if lid not in itens_map: itens_map[lid] = []
            itens_map[lid].append(item)
            
        result = []
        for lanc in lancamentos:
            itens = itens_map.get(lanc['id'], [])
            prod_total = sum(float(i['producao_kg']) for i in itens)
            perd_total = float(lanc['orelha_kg']) + float(lanc['aparas_kg'])
            result.append({
                **lanc,
                'producao_total': round(prod_total, 2),
                'perdas_total': round(perd_total, 2),
                'percentual_perdas': round((perd_total / prod_total * 100), 2) if prod_total > 0 else 0
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos/<id>', methods=['GET'])
def obter_lancamento(id):
    try:
        resp_lanc = supabase.table("lancamentos").select("*").eq("id", id).execute()
        if not resp_lanc.data:
            return jsonify({"error": "Lançamento não encontrado"}), 404
        
        lancamento = resp_lanc.data[0]
        resp_itens = supabase.table("itens_producao").select("*").eq("lancamento_id", id).execute()
        lancamento['itens'] = resp_itens.data
        
        return jsonify(lancamento)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos/<id>', methods=['DELETE'])
def deletar_lancamento(id):
    try:
        # Primeiro deletar os itens vinculados (integridade referencial)
        supabase.table("itens_producao").delete().eq("lancamento_id", id).execute()
        # Depois deletar o lançamento
        supabase.table("lancamentos").delete().eq("id", id).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/relatorios', methods=['GET'])
def gerar_relatorio():
    try:
        periodo = request.args.get('periodo', 'mensal')
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        
        hoje = datetime.now().date()
        
        if periodo == 'semanal':
            dias_desde_domingo = (hoje.weekday() + 1) % 7
            data_inicio = (hoje - timedelta(days=dias_desde_domingo)).isoformat()
            data_fim = (hoje + timedelta(days=(6 - dias_desde_domingo))).isoformat()
        elif periodo == 'mensal':
            data_inicio = hoje.replace(day=1).isoformat()
            if hoje.month == 12: data_fim = hoje.replace(day=31).isoformat()
            else: data_fim = (hoje.replace(month=hoje.month + 1, day=1) - timedelta(days=1)).isoformat()
        elif periodo == 'anual':
            data_inicio = hoje.replace(month=1, day=1).isoformat()
            data_fim = hoje.replace(month=12, day=31).isoformat()
        
        query = supabase.table("lancamentos").select("*")
        if data_inicio: query = query.gte("data", data_inicio)
        if data_fim: query = query.lte("data", data_fim)
        
        resp_lanc = query.execute()
        lancamentos = resp_lanc.data
        
        if not lancamentos:
            return jsonify({"producao_total": 0, "perdas_total": 0, "percentual_perdas": 0, "dias_produzidos": 0, "media_diaria": 0, "por_turno": {"A": {"producao": 0, "perdas": 0, "media_diaria": 0, "percentual_perdas": 0, "dias_produzidos": 0}, "B": {"producao": 0, "perdas": 0, "media_diaria": 0, "percentual_perdas": 0, "dias_produzidos": 0}, "Administrativo": {"producao": 0, "perdas": 0, "media_diaria": 0, "percentual_perdas": 0, "dias_produzidos": 0}}})

        ids = [l['id'] for l in lancamentos]
        resp_itens = supabase.table("itens_producao").select("lancamento_id, producao_kg").in_("lancamento_id", ids).execute()
        
        itens_prod = {}
        for i in resp_itens.data:
            lid = i['lancamento_id']
            itens_prod[lid] = itens_prod.get(lid, 0) + float(i['producao_kg'])
            
        stats = {"producao_total": 0, "perdas_total": 0, "dias": set(), "turnos": {"A": {"p": 0, "l": 0, "d": set()}, "B": {"p": 0, "l": 0, "d": set()}, "Administrativo": {"p": 0, "l": 0, "d": set()}}}
        
        for l in lancamentos:
            p = itens_prod.get(l['id'], 0)
            loss = float(l['orelha_kg']) + float(l['aparas_kg'])
            t = l['turno']
            if t not in stats['turnos']: stats['turnos'][t] = {"p": 0, "l": 0, "d": set()}
            
            stats["producao_total"] += p
            stats["perdas_total"] += loss
            stats["dias"].add(l['data'])
            stats["turnos"][t]["p"] += p
            stats["turnos"][t]["l"] += loss
            stats["turnos"][t]["d"].add(l['data'])
            
        dias_total = len(stats["dias"])
        res = {
            "producao_total": round(stats["producao_total"], 2),
            "perdas_total": round(stats["perdas_total"], 2),
            "percentual_perdas": round((stats["perdas_total"] / stats["producao_total"] * 100), 2) if stats["producao_total"] > 0 else 0,
            "dias_produzidos": dias_total,
            "media_diaria": round(stats["producao_total"] / dias_total, 2) if dias_total > 0 else 0,
            "por_turno": {}
        }
        
        for t, data in stats["turnos"].items():
            d_turno = len(data["d"])
            res["por_turno"][t] = {
                "producao": round(data["p"], 2),
                "perdas": round(data["l"], 2),
                "media_diaria": round(data["p"] / d_turno, 2) if d_turno > 0 else 0,
                "percentual_perdas": round((data["l"] / data["p"] * 100), 2) if data["p"] > 0 else 0,
                "dias_produzidos": d_turno
            }
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        resp = supabase.table("users").select("*").eq("email", data['email']).execute()
        if not resp.data: return jsonify({"error": "Email ou senha incorretos"}), 401
        user = resp.data[0]
        if not bcrypt.checkpw(data['senha'].encode('utf-8'), user['senha'].encode('utf-8')):
            return jsonify({"error": "Email ou senha incorretos"}), 401
        token = jwt.encode({'user_id': user['id'], 'email': user['email'], 'tipo': user['tipo']}, app.config['SECRET_KEY'], algorithm='HS256')
        del user['senha']
        return jsonify({"success": True, "token": token, "user": user})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
