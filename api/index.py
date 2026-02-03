from flask import Flask, jsonify, request
import os
from datetime import datetime, timezone
import uuid
from supabase import create_client

app = Flask(__name__)

# Supabase
supabase_url = os.environ.get('SUPABASE_URL', 'https://qmhldxyagakxeywkszkq.supabase.co')
supabase_key = os.environ.get('SUPABASE_KEY', 'sbp_39477759ac6132b9b6604a530e2862071b09ef43')
supabase = create_client(supabase_url, supabase_key)

@app.route('/')
@app.route('/api')
@app.route('/api/')
def root():
    return jsonify({"message": "Hello World"})

@app.route('/api/status', methods=['GET'])
def get_status():
    try:
        response = supabase.table("status_checks").select("*").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/status', methods=['POST'])
def create_status():
    try:
        data = request.get_json()
        doc = {
            "id": str(uuid.uuid4()),
            "client_name": data.get("client_name"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        result = supabase.table("status_checks").insert(doc).execute()
        return jsonify(doc)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Vercel handler
if __name__ == '__main__':
    app.run()
