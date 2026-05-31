from flask import Flask, jsonify, request, send_file

from main import get_stroke_profile_data

app = Flask(__name__)


@app.get("/")
def index():
    return send_file("index.html")


@app.post("/api/calculate")
def calculate():
    payload = request.get_json(silent=True) or {}
    swimmer_id = payload.get("swimmer_id") or request.form.get("swimmer_id")

    try:
        result = get_stroke_profile_data(swimmer_id)
    except ValueError:
        return jsonify({"error": "Swimmer ID is required."}), 400
    except RuntimeError:
        return jsonify({"error": "Unable to fetch swimmer data right now. Please try again later."}), 502

    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
