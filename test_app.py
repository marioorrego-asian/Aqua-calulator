import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import app

client = app.test_client()

print("Testing /api/swimmer/316250 (default year 2026)")
response = client.get('/api/swimmer/316250')
print("Status Code:", response.status_code)
if response.status_code == 200:
    data = response.get_json()
    print("Name:", data.get('swimmer_name'))
    print("Target Year:", data.get('target_year'))
    print("Total Score:", data.get('total_score'))

print("\nTesting /api/swimmer/316250?year=2024")
response_2024 = client.get('/api/swimmer/316250?year=2024')
print("Status Code:", response_2024.status_code)
if response_2024.status_code == 200:
    data_2024 = response_2024.get_json()
    print("Name:", data_2024.get('swimmer_name'))
    print("Target Year:", data_2024.get('target_year'))
    print("Total Score 2024:", data_2024.get('total_score'))
