#!/usr/bin/env python3
"""
PolyTrack Backend API Testing Suite
Tests all CRUD operations for Variáveis, Lançamentos, and Relatórios APIs
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any

class PolyTrackTester:
    def __init__(self, base_url: str = "https://delete-icon-missing.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = {
            'variaveis': {'passed': 0, 'failed': 0, 'details': []},
            'lancamentos': {'passed': 0, 'failed': 0, 'details': []},
            'relatorios': {'passed': 0, 'failed': 0, 'details': []}
        }
        self.created_ids = {
            'turnos': [],
            'formatos': [], 
            'cores': [],
            'lancamentos': []
        }

    def log_test_result(self, category: str, test_name: str, success: bool, details: str):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        
        if success:
            self.test_results[category]['passed'] += 1
            print(f"✅ {test_name}: {details}")
        else:
            self.test_results[category]['failed'] += 1
            print(f"❌ {test_name}: {details}")
        
        self.test_results[category]['details'].append(result)

    def test_api_variavel(self, endpoint: str, nome_tipo: str) -> bool:
        """Test complete CRUD operations for a variável type"""
        success_count = 0
        total_tests = 6  # GET, POST, PUT, REORDER, DELETE, GET again
        
        try:
            # 1. GET - List initial items
            response = self.session.get(f"{self.base_url}/variaveis/{endpoint}")
            if response.status_code == 200:
                initial_items = response.json()
                success_count += 1
                self.log_test_result('variaveis', f"GET /variaveis/{endpoint}", True, 
                    f"Retrieved {len(initial_items)} {nome_tipo}(s)")
            else:
                self.log_test_result('variaveis', f"GET /variaveis/{endpoint}", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 2. POST - Create new item
            test_item = {
                "nome": f"Teste {nome_tipo} {uuid.uuid4().hex[:8]}",
                "ativo": True,
                "ordem": 0
            }
            
            response = self.session.post(f"{self.base_url}/variaveis/{endpoint}", 
                                       json=test_item)
            if response.status_code == 200:
                created_item = response.json()
                item_id = created_item['id']
                self.created_ids[endpoint].append(item_id)
                success_count += 1
                self.log_test_result('variaveis', f"POST /variaveis/{endpoint}", True,
                    f"Created {nome_tipo}: {created_item['nome']}")
            else:
                self.log_test_result('variaveis', f"POST /variaveis/{endpoint}", False,
                    f"Status: {response.status_code}, Response: {response.text}")
                return False
            
            # 3. PUT - Update item
            updated_item = {
                "nome": f"Teste {nome_tipo} Atualizado",
                "ativo": True,
                "ordem": 1
            }
            
            response = self.session.put(f"{self.base_url}/variaveis/{endpoint}/{item_id}",
                                      json=updated_item)
            if response.status_code == 200:
                success_count += 1
                self.log_test_result('variaveis', f"PUT /variaveis/{endpoint}/{{{endpoint[:-1]}_id}}", True,
                    f"Updated {nome_tipo} successfully")
            else:
                self.log_test_result('variaveis', f"PUT /variaveis/{endpoint}/{{{endpoint[:-1]}_id}}", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 4. PUT - Reorder items
            reorder_data = {
                "itens": [{"id": item_id, "ordem": 0}]
            }
            
            response = self.session.put(f"{self.base_url}/variaveis/{endpoint}/reordenar",
                                      json=reorder_data)
            if response.status_code == 200:
                success_count += 1
                self.log_test_result('variaveis', f"PUT /variaveis/{endpoint}/reordenar", True,
                    f"Reordered {nome_tipo}s successfully")
            else:
                self.log_test_result('variaveis', f"PUT /variaveis/{endpoint}/reordenar", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 5. DELETE - Delete item
            response = self.session.delete(f"{self.base_url}/variaveis/{endpoint}/{item_id}")
            if response.status_code == 200:
                success_count += 1
                self.log_test_result('variaveis', f"DELETE /variaveis/{endpoint}/{{{endpoint[:-1]}_id}}", True,
                    f"Deleted {nome_tipo} successfully")
                self.created_ids[endpoint].remove(item_id)
            else:
                self.log_test_result('variaveis', f"DELETE /variaveis/{endpoint}/{{{endpoint[:-1]}_id}}", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 6. GET - Verify deletion
            response = self.session.get(f"{self.base_url}/variaveis/{endpoint}")
            if response.status_code == 200:
                final_items = response.json()
                success_count += 1
                self.log_test_result('variaveis', f"GET /variaveis/{endpoint} (verification)", True,
                    f"Verified deletion - {len(final_items)} {nome_tipo}(s) remain")
            else:
                self.log_test_result('variaveis', f"GET /variaveis/{endpoint} (verification)", False,
                    f"Status: {response.status_code}, Response: {response.text}")
                    
        except Exception as e:
            self.log_test_result('variaveis', f"Exception in {endpoint} tests", False, str(e))
        
        return success_count == total_tests

    def test_variaveis_apis(self):
        """Test all Variáveis APIs (Turnos, Formatos, Cores)"""
        print("\n🔧 Testing Variáveis APIs...")
        
        # Test each variável type
        endpoints = [
            ('turnos', 'Turno'),
            ('formatos', 'Formato'),
            ('cores', 'Cor')
        ]
        
        for endpoint, nome_tipo in endpoints:
            print(f"\n--- Testing {nome_tipo} ---")
            self.test_api_variavel(endpoint, nome_tipo)

    def test_lancamentos_api(self):
        """Test Lançamentos API with filters"""
        print("\n📊 Testing Lançamentos API...")
        
        try:
            # 1. GET - List all lançamentos
            response = self.session.get(f"{self.base_url}/lancamentos")
            if response.status_code == 200:
                all_lancamentos = response.json()
                self.log_test_result('lancamentos', "GET /api/lancamentos", True,
                    f"Retrieved {len(all_lancamentos)} lançamentos")
            else:
                self.log_test_result('lancamentos', "GET /api/lancamentos", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 2. GET - Test date filters
            data_inicio = "2026-03-01"
            data_fim = "2026-03-15"
            response = self.session.get(f"{self.base_url}/lancamentos", 
                                      params={"data_inicio": data_inicio, "data_fim": data_fim})
            if response.status_code == 200:
                filtered_lancamentos = response.json()
                self.log_test_result('lancamentos', "GET /api/lancamentos with filters", True,
                    f"Retrieved {len(filtered_lancamentos)} filtered lançamentos (2026-03-01 to 2026-03-15)")
            else:
                self.log_test_result('lancamentos', "GET /api/lancamentos with filters", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 3. POST - Create new lançamento
            test_lancamento = {
                "data": "2026-03-10",
                "turno": "A",
                "hora": "08:00",
                "orelha_kg": 5.5,
                "aparas_kg": 3.2,
                "itens": [
                    {
                        "formato": "Sacola Grande",
                        "cor": "Branca",
                        "pacote_kg": 25.0,
                        "producao_kg": 100.0
                    },
                    {
                        "formato": "Sacola Média",
                        "cor": "Azul",
                        "pacote_kg": 20.0,
                        "producao_kg": 80.0
                    }
                ]
            }
            
            response = self.session.post(f"{self.base_url}/lancamentos", json=test_lancamento)
            if response.status_code == 200:
                created_lancamento = response.json()
                lancamento_id = created_lancamento['id']
                self.created_ids['lancamentos'].append(lancamento_id)
                
                # Verify calculations
                expected_producao = 180.0  # 100 + 80
                expected_perdas = 8.7  # 5.5 + 3.2
                
                self.log_test_result('lancamentos', "POST /api/lancamentos", True,
                    f"Created lançamento with produção: {created_lancamento.get('producao_total')}kg, "
                    f"perdas: {created_lancamento.get('perdas_total')}kg")
            else:
                self.log_test_result('lancamentos', "POST /api/lancamentos", False,
                    f"Status: {response.status_code}, Response: {response.text}")
                return
            
            # 4. GET - Retrieve specific lançamento
            response = self.session.get(f"{self.base_url}/lancamentos/{lancamento_id}")
            if response.status_code == 200:
                retrieved_lancamento = response.json()
                self.log_test_result('lancamentos', f"GET /api/lancamentos/{lancamento_id}", True,
                    f"Retrieved lançamento with {len(retrieved_lancamento.get('itens', []))} items")
            else:
                self.log_test_result('lancamentos', f"GET /api/lancamentos/{lancamento_id}", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 5. PUT - Update lançamento
            updated_lancamento = {
                "data": "2026-03-11",
                "turno": "B", 
                "hora": "16:00",
                "orelha_kg": 6.0,
                "aparas_kg": 4.0,
                "itens": [
                    {
                        "formato": "Sacola Grande",
                        "cor": "Vermelha",
                        "pacote_kg": 30.0,
                        "producao_kg": 120.0
                    }
                ]
            }
            
            response = self.session.put(f"{self.base_url}/lancamentos/{lancamento_id}",
                                      json=updated_lancamento)
            if response.status_code == 200:
                self.log_test_result('lancamentos', "PUT /api/lancamentos/{id}", True,
                    "Updated lançamento successfully")
            else:
                self.log_test_result('lancamentos', "PUT /api/lancamentos/{id}", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 6. DELETE - Delete lançamento
            response = self.session.delete(f"{self.base_url}/lancamentos/{lancamento_id}")
            if response.status_code == 200:
                self.log_test_result('lancamentos', "DELETE /api/lancamentos/{id}", True,
                    "Deleted lançamento successfully")
                self.created_ids['lancamentos'].remove(lancamento_id)
            else:
                self.log_test_result('lancamentos', "DELETE /api/lancamentos/{id}", False,
                    f"Status: {response.status_code}, Response: {response.text}")
                    
        except Exception as e:
            self.log_test_result('lancamentos', "Exception in lancamentos tests", False, str(e))

    def test_relatorios_api(self):
        """Test Relatórios API"""
        print("\n📈 Testing Relatórios API...")
        
        try:
            # 1. GET - Monthly report
            response = self.session.get(f"{self.base_url}/relatorios", 
                                      params={"periodo": "mensal"})
            if response.status_code == 200:
                monthly_report = response.json()
                required_fields = ['producao_total', 'perdas_total', 'percentual_perdas', 
                                 'por_turno', 'itens_por_formato_cor']
                
                missing_fields = [field for field in required_fields if field not in monthly_report]
                
                if not missing_fields:
                    self.log_test_result('relatorios', "GET /api/relatorios?periodo=mensal", True,
                        f"Monthly report: {monthly_report['producao_total']}kg produção, "
                        f"{monthly_report['perdas_total']}kg perdas, "
                        f"{len(monthly_report['itens_por_formato_cor'])} tipos de itens")
                else:
                    self.log_test_result('relatorios', "GET /api/relatorios?periodo=mensal", False,
                        f"Missing fields: {missing_fields}")
            else:
                self.log_test_result('relatorios', "GET /api/relatorios?periodo=mensal", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 2. GET - Weekly report
            response = self.session.get(f"{self.base_url}/relatorios",
                                      params={"periodo": "semanal"})
            if response.status_code == 200:
                weekly_report = response.json()
                self.log_test_result('relatorios', "GET /api/relatorios?periodo=semanal", True,
                    f"Weekly report: {weekly_report['producao_total']}kg produção, "
                    f"{weekly_report['percentual_perdas']}% perdas")
            else:
                self.log_test_result('relatorios', "GET /api/relatorios?periodo=semanal", False,
                    f"Status: {response.status_code}, Response: {response.text}")
            
            # 3. GET - Custom period report
            response = self.session.get(f"{self.base_url}/relatorios",
                                      params={
                                          "periodo": "customizado",
                                          "data_inicio": "2026-01-01",
                                          "data_fim": "2026-03-31"
                                      })
            if response.status_code == 200:
                custom_report = response.json()
                self.log_test_result('relatorios', "GET /api/relatorios with custom period", True,
                    f"Custom report (Q1 2026): {custom_report['producao_total']}kg produção")
            else:
                self.log_test_result('relatorios', "GET /api/relatorios with custom period", False,
                    f"Status: {response.status_code}, Response: {response.text}")
                    
        except Exception as e:
            self.log_test_result('relatorios', "Exception in relatorios tests", False, str(e))

    def test_basic_connectivity(self):
        """Test basic API connectivity"""
        print("🔗 Testing basic connectivity...")
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                print("✅ Backend connectivity successful")
                return True
            else:
                print(f"❌ Backend connectivity failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Backend connectivity error: {str(e)}")
            return False

    def cleanup_test_data(self):
        """Clean up test data created during testing"""
        print("\n🧹 Cleaning up test data...")
        
        # Clean up created items
        cleanup_count = 0
        
        for endpoint, ids in self.created_ids.items():
            for item_id in ids[:]:  # Copy list to avoid modification during iteration
                try:
                    if endpoint == 'lancamentos':
                        response = self.session.delete(f"{self.base_url}/lancamentos/{item_id}")
                    else:
                        response = self.session.delete(f"{self.base_url}/variaveis/{endpoint}/{item_id}")
                    
                    if response.status_code == 200:
                        cleanup_count += 1
                        ids.remove(item_id)
                except Exception as e:
                    print(f"Warning: Could not clean up {endpoint} {item_id}: {str(e)}")
        
        print(f"✅ Cleaned up {cleanup_count} test items")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 POLYTRACK BACKEND TEST SUMMARY")
        print("="*60)
        
        total_passed = 0
        total_failed = 0
        
        for category, results in self.test_results.items():
            passed = results['passed']
            failed = results['failed']
            total_passed += passed
            total_failed += failed
            
            status_icon = "✅" if failed == 0 else "❌"
            print(f"{status_icon} {category.upper()}: {passed} passed, {failed} failed")
        
        print("-" * 60)
        success_rate = (total_passed / (total_passed + total_failed) * 100) if (total_passed + total_failed) > 0 else 0
        print(f"OVERALL: {total_passed} passed, {total_failed} failed ({success_rate:.1f}% success)")
        
        if total_failed > 0:
            print("\n❌ FAILED TESTS:")
            for category, results in self.test_results.items():
                for detail in results['details']:
                    if not detail['success']:
                        print(f"  - {detail['test']}: {detail['details']}")
        
        print("="*60)

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting PolyTrack Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        
        # Test connectivity first
        if not self.test_basic_connectivity():
            print("❌ Cannot proceed - backend not accessible")
            return
        
        try:
            # Run all test suites
            self.test_variaveis_apis()
            self.test_lancamentos_api()
            self.test_relatorios_api()
            
        finally:
            # Always try to cleanup
            self.cleanup_test_data()
            
        # Print summary
        self.print_summary()

if __name__ == "__main__":
    tester = PolyTrackTester()
    tester.run_all_tests()