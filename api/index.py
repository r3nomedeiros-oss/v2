from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from datetime import datetime, date, time
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
        
        lancamento = {
            "id": str(uuid.uuid4()),
            "data": data['data'],
            "turno": data['turno'],
            "hora": data['hora'],
            "orelha_kg": float(data['orelha_kg']),
            "aparas_kg": float(data['aparas_kg'])
        }
        
        result_lanc = supabase.table("lancamentos").insert(lancamento).execute()
        lancamento_id = lancamento['id']
        
        itens = []
        for item in data['itens']:
            item_obj = {
                "id": str(uuid.uuid4()),
                "lancamento_id": lancamento_id,
                "formato": item['formato'],
                "cor": item['cor'],
                "pacote_kg": float(item['pacote_kg']),
                "producao_kg": float(item['producao_kg'])
            }
            itens.append(item_obj)
        
        if itens:
            supabase.table("itens_producao").insert(itens).execute()
        
        return jsonify({"success": True, "id": lancamento_id}), 201
    
    except Exception as e:
        print(f"Erro ao criar lançamento: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos', methods=['GET'])
def listar_lancamentos():
    try:
        response = supabase.table("lancamentos").select("*").order("data", desc=True).order("hora", desc=True).execute()
        lancamentos = response.data
        
        result = []
        for lanc in lancamentos:
            itens_response = supabase.table("itens_producao").select("*").eq("lancamento_id", lanc['id']).execute()
            itens = itens_response.data
            
            producao_total = sum(float(item['producao_kg']) for item in itens)
            perdas_total = float(lanc['orelha_kg']) + float(lanc['aparas_kg'])
            percentual_perdas = (perdas_total / producao_total * 100) if producao_total > 0 else 0
            
            result.append({
                **lanc,
                'itens': itens,
                'producao_total': producao_total,
                'perdas_total': perdas_total,
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
        lancamento['itens'] = itens_response.data
        return jsonify(lancamento)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos/<lancamento_id>', methods=['PUT'])
def atualizar_lancamento(lancamento_id):
    try:
        data = request.get_json()
        
        lancamento_update = {
            "data": data['data'],
            "turno": data['turno'],
            "hora": data['hora'],
            "orelha_kg": float(data['orelha_kg']),
            "aparas_kg": float(data['aparas_kg'])
        }
        
        supabase.table("lancamentos").update(lancamento_update).eq("id", lancamento_id).execute()
        supabase.table("itens_producao").delete().eq("lancamento_id", lancamento_id).execute()
        
        itens = []
        for item in data['itens']:
            item_obj = {
                "id": str(uuid.uuid4()),
                "lancamento_id": lancamento_id,
                "formato": item['formato'],
                "cor": item['cor'],
                "pacote_kg": float(item['pacote_kg']),
                "producao_kg": float(item['producao_kg'])
            }
            itens.append(item_obj)
        
        if itens:
            supabase.table("itens_producao").insert(itens).execute()
        
        return jsonify({"success": True})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lancamentos/<lancamento_id>', methods=['DELETE'])
def deletar_lancamento(lancamento_id):
    try:
        supabase.table("lancamentos").delete().eq("id", lancamento_id).execute()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/relatorios', methods=['GET'])
def gerar_relatorio():
    try:
        periodo = request.args.get('periodo', 'mensal')
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        
        query = supabase.table("lancamentos").select("*")
        
        if periodo == 'customizado' and data_inicio and data_fim:
            query = query.gte("data", data_inicio).lte("data", data_fim)
        
        response = query.execute()
        lancamentos = response.data
        
        itens_ids = [lanc['id'] for lanc in lancamentos]
        if not itens_ids:
            return jsonify({
                "producao_total": 0,
                "perdas_total": 0,
                "percentual_perdas": 0,
                "dias_produzidos": 0,
                "media_diaria": 0,
                "por_turno": {
                    "A": {"producao": 0, "perdas": 0},
                    "B": {"producao": 0, "perdas": 0},
                    "Administrativo": {"producao": 0, "perdas": 0}
                }
            })
        
        itens_response = supabase.table("itens_producao").select("*").in_("lancamento_id", itens_ids).execute()
        itens_dict = {}
        for item in itens_response.data:
            if item['lancamento_id'] not in itens_dict:
                itens_dict[item['lancamento_id']] = []
            itens_dict[item['lancamento_id']].append(item)
        
        producao_total = 0
        perdas_total = 0
        dias_unicos = set()
        producao_por_turno = {"A": 0, "B": 0, "Administrativo": 0}
        perdas_por_turno = {"A": 0, "B": 0, "Administrativo": 0}
        
        for lanc in lancamentos:
            itens = itens_dict.get(lanc['id'], [])
            prod_lanc = sum(float(item['producao_kg']) for item in itens)
            perd_lanc = float(lanc['orelha_kg']) + float(lanc['aparas_kg'])
            
            producao_total += prod_lanc
            perdas_total += perd_lanc
            dias_unicos.add(lanc['data'])
            
            turno = lanc['turno']
            producao_por_turno[turno] = producao_por_turno.get(turno, 0) + prod_lanc
            perdas_por_turno[turno] = perdas_por_turno.get(turno, 0) + perd_lanc
        
        dias_produzidos = len(dias_unicos)
        media_diaria = producao_total / dias_produzidos if dias_produzidos > 0 else 0
        percentual_perdas = (perdas_total / producao_total * 100) if producao_total > 0 else 0
        
        relatorio = {
            "producao_total": round(producao_total, 2),
            "perdas_total": round(perdas_total, 2),
            "percentual_perdas": round(percentual_perdas, 2),
            "dias_produzidos": dias_produzidos,
            "media_diaria": round(media_diaria, 2),
            "por_turno": {
                "A": {
                    "producao": round(producao_por_turno.get("A", 0), 2),
                    "perdas": round(perdas_por_turno.get("A", 0), 2)
                },
                "B": {
                    "producao": round(producao_por_turno.get("B", 0), 2),
                    "perdas": round(perdas_por_turno.get("B", 0), 2)
                },
                "Administrativo": {
                    "producao": round(producao_por_turno.get("Administrativo", 0), 2),
                    "perdas": round(perdas_por_turno.get("Administrativo", 0), 2)
                }
            }
        }
        
        return jsonify(relatorio)
    
    except Exception as e:
        print(f"Erro ao gerar relatório: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Handler para Vercel
if __name__ == '__main__':
    app.run(debug=True)
