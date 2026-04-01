from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ.get('SUPABASE_URL', '')
supabase_key = os.environ.get('SUPABASE_KEY', '')
supabase: Client = create_client(supabase_url, supabase_key)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# User Models
class UserCreate(BaseModel):
    nome: str
    email: str
    senha: str
    tipo: str = "Operador"

class UserLogin(BaseModel):
    email: str
    senha: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    email: str
    tipo: str
    created_at: Optional[datetime] = None

# Item de Produção
class ItemProducao(BaseModel):
    formato: str
    cor: str
    pacote_kg: float
    producao_kg: float

# Lançamento Models
class LancamentoCreate(BaseModel):
    data: str
    turno: str
    hora: Optional[str] = None
    orelha_kg: float
    aparas_kg: float
    itens: List[ItemProducao]

class LancamentoResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    data: str
    turno: str
    hora: Optional[str] = None
    orelha_kg: float = 0
    aparas_kg: float = 0
    producao_total: Optional[float] = 0
    perdas_total: Optional[float] = 0
    percentual_perdas: Optional[float] = 0
    itens: List[dict] = []
    created_at: Optional[datetime] = None

# Variáveis Models
class VariavelCreate(BaseModel):
    nome: str
    ativo: bool = True
    ordem: int = 0

class VariavelResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    ativo: bool
    ordem: int = 0
    created_at: Optional[datetime] = None

class ReordenarRequest(BaseModel):
    itens: List[dict]  # Lista de {id: str, ordem: int}

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user: UserCreate):
    try:
        # Check if user exists
        existing = supabase.table("users").select("*").eq("email", user.email).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
        
        # Hash password
        hashed = bcrypt.hashpw(user.senha.encode('utf-8'), bcrypt.gensalt())
        
        user_id = str(uuid.uuid4())
        doc = {
            "id": user_id,
            "nome": user.nome,
            "email": user.email,
            "senha": hashed.decode('utf-8'),
            "tipo": user.tipo,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table("users").insert(doc).execute()
        return {"message": "Usuário cadastrado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/login")
async def login(user: UserLogin):
    try:
        result = supabase.table("users").select("*").eq("email", user.email).execute()
        
        if not result.data:
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        db_user = result.data[0]
        
        if not bcrypt.checkpw(user.senha.encode('utf-8'), db_user['senha'].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Email ou senha incorretos")
        
        # Simple token (in production use JWT)
        token = str(uuid.uuid4())
        
        return {
            "token": token,
            "user": {
                "id": db_user['id'],
                "nome": db_user['nome'],
                "email": db_user['email'],
                "tipo": db_user['tipo']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== USERS ROUTES ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users():
    try:
        response = supabase.table("users").select("id, nome, email, tipo, created_at").order("created_at", desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    try:
        supabase.table("users").delete().eq("id", user_id).execute()
        return {"message": "Usuário excluído com sucesso"}
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== LANCAMENTOS ROUTES ====================

@api_router.get("/lancamentos", response_model=List[LancamentoResponse])
async def get_lancamentos(data_inicio: Optional[str] = None, data_fim: Optional[str] = None):
    try:
        query = supabase.table("lancamentos").select("*")
        
        if data_inicio:
            query = query.gte("data", data_inicio)
        if data_fim:
            query = query.lte("data", data_fim)
            
        response = query.order("data", desc=True).order("hora", desc=True).execute()
        
        if not response.data:
            return []
        
        # Buscar TODOS os itens de uma vez (otimização N+1)
        lancamento_ids = [lanc['id'] for lanc in response.data]
        all_itens_response = supabase.table("itens_producao").select("*").in_("lancamento_id", lancamento_ids).execute()
        
        # Agrupar itens por lancamento_id
        itens_por_lancamento = {}
        for item in (all_itens_response.data or []):
            lanc_id = item['lancamento_id']
            if lanc_id not in itens_por_lancamento:
                itens_por_lancamento[lanc_id] = []
            itens_por_lancamento[lanc_id].append(item)
        
        lancamentos = []
        for lanc in response.data:
            # Usar itens já buscados
            lanc['itens'] = itens_por_lancamento.get(lanc['id'], [])
            
            # Calcular producao_total a partir dos itens
            lanc['producao_total'] = sum(item.get('producao_kg', 0) or 0 for item in lanc['itens'])
            lanc['perdas_total'] = (lanc.get('orelha_kg', 0) or 0) + (lanc.get('aparas_kg', 0) or 0)
            lanc['percentual_perdas'] = round((lanc['perdas_total'] / lanc['producao_total'] * 100), 2) if lanc['producao_total'] > 0 else 0
            
            lancamentos.append(lanc)
        
        return lancamentos
    except Exception as e:
        logger.error(f"Error fetching lancamentos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/lancamentos/{lancamento_id}", response_model=LancamentoResponse)
async def get_lancamento(lancamento_id: str):
    try:
        response = supabase.table("lancamentos").select("*").eq("id", lancamento_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Lançamento não encontrado")
        
        lanc = response.data[0]
        
        # Buscar itens
        itens_response = supabase.table("itens_producao").select("*").eq("lancamento_id", lancamento_id).execute()
        lanc['itens'] = itens_response.data if itens_response.data else []
        
        # Sempre calcular producao_total a partir dos itens (mais confiável)
        lanc['producao_total'] = sum(item.get('producao_kg', 0) or 0 for item in lanc['itens'])
        lanc['perdas_total'] = (lanc.get('orelha_kg', 0) or 0) + (lanc.get('aparas_kg', 0) or 0)
        lanc['percentual_perdas'] = round((lanc['perdas_total'] / lanc['producao_total'] * 100), 2) if lanc['producao_total'] > 0 else 0
        
        return lanc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lancamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/lancamentos", response_model=LancamentoResponse)
async def create_lancamento(lancamento: LancamentoCreate):
    try:
        lancamento_id = str(uuid.uuid4())
        
        # Calcular totais
        producao_total = sum(item.producao_kg for item in lancamento.itens)
        perdas_total = lancamento.orelha_kg + lancamento.aparas_kg
        percentual_perdas = round((perdas_total / producao_total * 100), 2) if producao_total > 0 else 0
        
        doc = {
            "id": lancamento_id,
            "data": lancamento.data,
            "turno": lancamento.turno,
            "hora": lancamento.hora or datetime.now().strftime("%H:%M"),
            "orelha_kg": lancamento.orelha_kg,
            "aparas_kg": lancamento.aparas_kg,
            "producao_total": producao_total,
            "perdas_total": perdas_total,
            "percentual_perdas": percentual_perdas,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        supabase.table("lancamentos").insert(doc).execute()
        
        # Inserir itens
        for item in lancamento.itens:
            item_doc = {
                "id": str(uuid.uuid4()),
                "lancamento_id": lancamento_id,
                "formato": item.formato,
                "cor": item.cor,
                "pacote_kg": item.pacote_kg,
                "producao_kg": item.producao_kg
            }
            supabase.table("itens_producao").insert(item_doc).execute()
        
        # Retornar o lançamento criado
        doc['itens'] = [{"formato": i.formato, "cor": i.cor, "pacote_kg": i.pacote_kg, "producao_kg": i.producao_kg} for i in lancamento.itens]
        return doc
    except Exception as e:
        logger.error(f"Error creating lancamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/lancamentos/{lancamento_id}", response_model=LancamentoResponse)
async def update_lancamento(lancamento_id: str, lancamento: LancamentoCreate):
    try:
        # Verificar se existe
        existing = supabase.table("lancamentos").select("*").eq("id", lancamento_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Lançamento não encontrado")
        
        # Calcular totais
        producao_total = sum(item.producao_kg for item in lancamento.itens)
        perdas_total = lancamento.orelha_kg + lancamento.aparas_kg
        percentual_perdas = round((perdas_total / producao_total * 100), 2) if producao_total > 0 else 0
        
        doc = {
            "data": lancamento.data,
            "turno": lancamento.turno,
            "hora": lancamento.hora,
            "orelha_kg": lancamento.orelha_kg,
            "aparas_kg": lancamento.aparas_kg,
            "producao_total": producao_total,
            "perdas_total": perdas_total,
            "percentual_perdas": percentual_perdas
        }
        
        supabase.table("lancamentos").update(doc).eq("id", lancamento_id).execute()
        
        # Deletar itens antigos e inserir novos
        supabase.table("itens_producao").delete().eq("lancamento_id", lancamento_id).execute()
        
        for item in lancamento.itens:
            item_doc = {
                "id": str(uuid.uuid4()),
                "lancamento_id": lancamento_id,
                "formato": item.formato,
                "cor": item.cor,
                "pacote_kg": item.pacote_kg,
                "producao_kg": item.producao_kg
            }
            supabase.table("itens_producao").insert(item_doc).execute()
        
        doc['id'] = lancamento_id
        doc['itens'] = [{"formato": i.formato, "cor": i.cor, "pacote_kg": i.pacote_kg, "producao_kg": i.producao_kg} for i in lancamento.itens]
        return doc
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lancamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/lancamentos/{lancamento_id}")
async def delete_lancamento(lancamento_id: str):
    try:
        # Verificar se o lançamento existe
        check = supabase.table("lancamentos").select("id").eq("id", lancamento_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Lançamento não encontrado")
        
        # Deletar itens primeiro
        supabase.table("itens_producao").delete().eq("lancamento_id", lancamento_id).execute()
        
        # Deletar lançamento
        supabase.table("lancamentos").delete().eq("id", lancamento_id).execute()
        
        # Verificar se foi deletado
        verify = supabase.table("lancamentos").select("id").eq("id", lancamento_id).execute()
        if verify.data:
            raise HTTPException(status_code=500, detail="Falha ao excluir lançamento")
        
        return {"message": "Lançamento excluído com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting lancamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RELATORIOS ROUTES ====================

@api_router.get("/relatorios")
async def get_relatorios(periodo: str = "mensal", data_inicio: Optional[str] = None, data_fim: Optional[str] = None):
    try:
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
            # Retornar dados vazios se não houver lançamentos
            return {
                "producao_total": 0,
                "perdas_total": 0,
                "percentual_perdas": 0,
                "media_diaria": 0,
                "dias_produzidos": 0,
                "por_turno": {
                    'A': {"producao": 0, "perdas": 0, "percentual_perdas": 0, "media_diaria": 0, "dias_produzidos": 0},
                    'B': {"producao": 0, "perdas": 0, "percentual_perdas": 0, "media_diaria": 0, "dias_produzidos": 0},
                    'Administrativo': {"producao": 0, "perdas": 0, "percentual_perdas": 0, "media_diaria": 0, "dias_produzidos": 0}
                },
                "itens_por_formato_cor": []
            }
        
        # Buscar TODOS os itens de uma vez (otimização N+1)
        lancamento_ids = [lanc['id'] for lanc in lancamentos]
        all_itens_response = supabase.table("itens_producao").select("*").in_("lancamento_id", lancamento_ids).execute()
        all_itens = all_itens_response.data or []
        
        # Agrupar itens por lancamento_id
        itens_por_lancamento = {}
        for item in all_itens:
            lanc_id = item['lancamento_id']
            if lanc_id not in itens_por_lancamento:
                itens_por_lancamento[lanc_id] = []
            itens_por_lancamento[lanc_id].append(item)
        
        # Calcular campos faltantes e agrupar itens
        itens_por_formato_cor = {}
        for lanc in lancamentos:
            itens = itens_por_lancamento.get(lanc['id'], [])
            
            # Calcular producao_total e perdas_total se não existirem
            if lanc.get('producao_total') is None or lanc.get('producao_total') == 0:
                lanc['producao_total'] = sum(item.get('producao_kg', 0) for item in itens)
            if lanc.get('perdas_total') is None or lanc.get('perdas_total') == 0:
                lanc['perdas_total'] = (lanc.get('orelha_kg', 0) or 0) + (lanc.get('aparas_kg', 0) or 0)
            
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
                itens_por_formato_cor[key]['producao_total'] += item['producao_kg']
                itens_por_formato_cor[key]['pacote_total'] += item['pacote_kg']
                itens_por_formato_cor[key]['quantidade_lancamentos'] += 1
        
        # Calcular totais
        producao_total = sum(l.get('producao_total', 0) for l in lancamentos)
        perdas_total = sum(l.get('perdas_total', 0) for l in lancamentos)
        
        # Dias únicos com produção
        dias_unicos = set(l['data'] for l in lancamentos)
        dias_produzidos = len(dias_unicos)
        
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
            por_turno[turno]['producao'] += lanc.get('producao_total', 0)
            por_turno[turno]['perdas'] += lanc.get('perdas_total', 0)
            por_turno[turno]['dias'].add(lanc['data'])
        
        # Formatar dados por turno
        por_turno_formatado = {}
        for turno, dados in por_turno.items():
            dias_turno = len(dados['dias'])
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
        
        return {
            "producao_total": round(producao_total, 2),
            "perdas_total": round(perdas_total, 2),
            "percentual_perdas": percentual_perdas,
            "media_diaria": media_diaria,
            "dias_produzidos": dias_produzidos,
            "por_turno": por_turno_formatado,
            "itens_por_formato_cor": itens_lista
        }
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== VARIAVEIS ROUTES ====================

# Turnos
@api_router.get("/variaveis/turnos", response_model=List[VariavelResponse])
async def get_turnos():
    try:
        response = supabase.table("turnos").select("*").order("ordem").order("nome").execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching turnos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/variaveis/turnos", response_model=VariavelResponse)
async def create_turno(variavel: VariavelCreate):
    try:
        # Pegar a maior ordem atual
        max_ordem = supabase.table("turnos").select("ordem").order("ordem", desc=True).limit(1).execute()
        nova_ordem = (max_ordem.data[0]['ordem'] + 1) if max_ordem.data and max_ordem.data[0].get('ordem') else 0
        
        doc = {
            "id": str(uuid.uuid4()),
            "nome": variavel.nome,
            "ativo": variavel.ativo,
            "ordem": nova_ordem,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("turnos").insert(doc).execute()
        return doc
    except Exception as e:
        logger.error(f"Error creating turno: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/variaveis/turnos/{turno_id}", response_model=VariavelResponse)
async def update_turno(turno_id: str, variavel: VariavelCreate):
    try:
        doc = {"nome": variavel.nome, "ativo": variavel.ativo, "ordem": variavel.ordem}
        supabase.table("turnos").update(doc).eq("id", turno_id).execute()
        response = supabase.table("turnos").select("*").eq("id", turno_id).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error updating turno: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/variaveis/turnos/reordenar")
async def reordenar_turnos(request: ReordenarRequest):
    try:
        for item in request.itens:
            supabase.table("turnos").update({"ordem": item['ordem']}).eq("id", item['id']).execute()
        return {"message": "Ordem atualizada com sucesso"}
    except Exception as e:
        logger.error(f"Error reordering turnos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/variaveis/turnos/{turno_id}")
async def delete_turno(turno_id: str):
    try:
        supabase.table("turnos").delete().eq("id", turno_id).execute()
        return {"message": "Turno excluído com sucesso"}
    except Exception as e:
        logger.error(f"Error deleting turno: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Formatos
@api_router.get("/variaveis/formatos", response_model=List[VariavelResponse])
async def get_formatos():
    try:
        response = supabase.table("formatos").select("*").order("ordem").order("nome").execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching formatos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/variaveis/formatos", response_model=VariavelResponse)
async def create_formato(variavel: VariavelCreate):
    try:
        max_ordem = supabase.table("formatos").select("ordem").order("ordem", desc=True).limit(1).execute()
        nova_ordem = (max_ordem.data[0]['ordem'] + 1) if max_ordem.data and max_ordem.data[0].get('ordem') else 0
        
        doc = {
            "id": str(uuid.uuid4()),
            "nome": variavel.nome,
            "ativo": variavel.ativo,
            "ordem": nova_ordem,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("formatos").insert(doc).execute()
        return doc
    except Exception as e:
        logger.error(f"Error creating formato: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/variaveis/formatos/{formato_id}", response_model=VariavelResponse)
async def update_formato(formato_id: str, variavel: VariavelCreate):
    try:
        doc = {"nome": variavel.nome, "ativo": variavel.ativo, "ordem": variavel.ordem}
        supabase.table("formatos").update(doc).eq("id", formato_id).execute()
        response = supabase.table("formatos").select("*").eq("id", formato_id).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error updating formato: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/variaveis/formatos/reordenar")
async def reordenar_formatos(request: ReordenarRequest):
    try:
        for item in request.itens:
            supabase.table("formatos").update({"ordem": item['ordem']}).eq("id", item['id']).execute()
        return {"message": "Ordem atualizada com sucesso"}
    except Exception as e:
        logger.error(f"Error reordering formatos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/variaveis/formatos/{formato_id}")
async def delete_formato(formato_id: str):
    try:
        supabase.table("formatos").delete().eq("id", formato_id).execute()
        return {"message": "Formato excluído com sucesso"}
    except Exception as e:
        logger.error(f"Error deleting formato: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Cores
@api_router.get("/variaveis/cores", response_model=List[VariavelResponse])
async def get_cores():
    try:
        response = supabase.table("cores").select("*").order("ordem").order("nome").execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching cores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/variaveis/cores", response_model=VariavelResponse)
async def create_cor(variavel: VariavelCreate):
    try:
        max_ordem = supabase.table("cores").select("ordem").order("ordem", desc=True).limit(1).execute()
        nova_ordem = (max_ordem.data[0]['ordem'] + 1) if max_ordem.data and max_ordem.data[0].get('ordem') else 0
        
        doc = {
            "id": str(uuid.uuid4()),
            "nome": variavel.nome,
            "ativo": variavel.ativo,
            "ordem": nova_ordem,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("cores").insert(doc).execute()
        return doc
    except Exception as e:
        logger.error(f"Error creating cor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/variaveis/cores/{cor_id}", response_model=VariavelResponse)
async def update_cor(cor_id: str, variavel: VariavelCreate):
    try:
        doc = {"nome": variavel.nome, "ativo": variavel.ativo, "ordem": variavel.ordem}
        supabase.table("cores").update(doc).eq("id", cor_id).execute()
        response = supabase.table("cores").select("*").eq("id", cor_id).execute()
        return response.data[0]
    except Exception as e:
        logger.error(f"Error updating cor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/variaveis/cores/reordenar")
async def reordenar_cores(request: ReordenarRequest):
    try:
        for item in request.itens:
            supabase.table("cores").update({"ordem": item['ordem']}).eq("id", item['id']).execute()
        return {"message": "Ordem atualizada com sucesso"}
    except Exception as e:
        logger.error(f"Error reordering cores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/variaveis/cores/{cor_id}")
async def delete_cor(cor_id: str):
    try:
        supabase.table("cores").delete().eq("id", cor_id).execute()
        return {"message": "Cor excluída com sucesso"}
    except Exception as e:
        logger.error(f"Error deleting cor: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== STATUS ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(
        id=str(uuid.uuid4()),
        client_name=input.client_name,
        timestamp=datetime.now(timezone.utc)
    )
    
    doc = {
        "id": status_obj.id,
        "client_name": status_obj.client_name,
        "timestamp": status_obj.timestamp.isoformat()
    }
    
    try:
        supabase.table("status_checks").insert(doc).execute()
        return status_obj
    except Exception as e:
        logger.error(f"Error inserting status check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    try:
        response = supabase.table("status_checks").select("*").execute()
        
        status_checks = []
        for check in response.data:
            if isinstance(check['timestamp'], str):
                check['timestamp'] = datetime.fromisoformat(check['timestamp'].replace('Z', '+00:00'))
            status_checks.append(StatusCheck(**check))
        
        return status_checks
    except Exception as e:
        logger.error(f"Error fetching status checks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
