from flask import Flask, request, jsonify, send_from_directory
import os
from main import fetch_swimmer_data, fetch_swimmer_evolution

app = Flask(__name__, static_url_path='', static_folder='static')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/swimmer/<swimmer_id>', methods=['GET'])
def get_swimmer_data(swimmer_id):
    if not swimmer_id.isdigit():
        return jsonify({"error": "Invalid Swimmer ID. Must be numeric."}), 400
        
    year = request.args.get('year', default=2026, type=int)
    if year < 2020 or year > 2026:
        year = 2026

    data = fetch_swimmer_data(swimmer_id, year=year)
    if "error" in data:
        return jsonify(data), 500
        
    return jsonify(data)

@app.route('/api/swimmer/<swimmer_id>/evolution', methods=['GET'])
def get_swimmer_evolution(swimmer_id):
    if not swimmer_id.isdigit():
        return jsonify({"error": "Invalid Swimmer ID. Must be numeric."}), 400
        
    start_year = request.args.get('start_year', default=2020, type=int)
    end_year = request.args.get('end_year', default=2026, type=int)
    
    data = fetch_swimmer_evolution(swimmer_id, start_year=start_year, end_year=end_year)
    if "error" in data:
        return jsonify(data), 500
        
    return jsonify(data)

if __name__ == '__main__':
    # Use port 5001 for local development (avoids macOS AirPlay on port 5000)
    port = int(os.environ.get("PORT", 5001))
    app.run(host='127.0.0.1', port=port, debug=True)
