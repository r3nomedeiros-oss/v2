from fastapi import FastAPI, HTTPException
from mangum import Mangum
import os
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client

# Supabase connection
supabase_url = os.environ.get('SUPABASE_URL', 'https://qmhldxyagakxeywkszkq.supabase.co')
supabase_key = os.environ.get('SUPABASE_KEY', 'sbp_39477759ac6132b9b6604a530e2862071b09ef43')
supabase: Client = create_client(supabase_url, supabase_key)

# Create the main app
app = FastAPI()

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Routes
@app.get("/")
@app.get("/api")
@app.get("/api/")
async def root():
    return {"message": "Hello World"}

@app.post("/api/status", response_model=StatusCheck)
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
        result = supabase.table("status_checks").insert(doc).execute()
        return status_obj
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status", response_model=List[StatusCheck])
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
        raise HTTPException(status_code=500, detail=str(e))

# Handler para Vercel
handler = Mangum(app)
