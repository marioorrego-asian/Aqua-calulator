from flask import Flask, request, jsonify, send_from_directory
import os
from main import fetch_swimmer_data

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

if __name__ == '__main__':
    # Use port 5000 for local development
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
