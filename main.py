import sys
import requests
from bs4 import BeautifulSoup
import json
import re

TARGET_YEAR = 2026

CATEGORIES = {
    "Freestyle": "Freestyle",
    "Backstroke": "Backstroke",
    "Breaststroke": "Breaststroke",
    "Butterfly": "Butterfly",
    "Medley": "Individual Medley"
}

SHORT_NAMES = {
    "Freestyle": "Free",
    "Backstroke": "Back",
    "Breaststroke": "Breast",
    "Butterfly": "Fly",
    "Medley": "IM"
}

def format_event_name(distance, stroke):
    return f"{distance} {SHORT_NAMES[stroke]}"

def fetch_swimmer_data(swimmer_id):
    """
    Fetches and parses the swimmer data from Tempus Open.
    Returns a dictionary with the swimmer's profile or an error dict.
    """
    url = f"https://www.tempusopen.se/swimmers/{swimmer_id}/swimming?from_date={TARGET_YEAR}-01-01&to_date={TARGET_YEAR}-12-31"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    
    try:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
    except Exception as e:
        return {"error": f"Error fetching data for swimmer {swimmer_id}: {e}"}

    soup = BeautifulSoup(resp.text, 'html.parser')
    app_div = soup.find('div', id='app')
    if not app_div:
        return {"error": "Could not find the data container on the page."}

    data_page = app_div.get('data-page')
    if not data_page:
        return {"error": "Could not find data-page attribute."}

    try:
        data = json.loads(data_page)
    except json.JSONDecodeError:
        return {"error": "Failed to decode JSON data."}

    props = data.get('props', {})
    swimmer_info = props.get('swimmer', {})
    swimmer_name = swimmer_info.get('name', 'Unknown')
    actual_id = swimmer_info.get('id', swimmer_id)
    club_name = swimmer_info.get('club_name', '')

    results_short = props.get('results_short', {}).get('data', [])
    results_long = props.get('results_long', {}).get('data', [])
    
    all_swims = results_short + results_long

    # Track best swim per category
    best_swims = {cat: {
        "points": 0, 
        "formatted_name": "None", 
        "course": "", 
        "swim_time": "", 
        "result_date": "",
        "competition": ""
    } for cat in CATEGORIES.values()}

    event_regex = re.compile(r'^(\d+)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Medley)$')

    for swim in all_swims:
        result_date = swim.get('result_date', '')
        if not result_date.startswith(str(TARGET_YEAR)):
            continue
        
        event_name = swim.get('event_name', '')
        match = event_regex.match(event_name)
        if not match:
            continue
        
        distance = match.group(1)
        stroke = match.group(2)
        
        category = CATEGORIES[stroke]
        points = swim.get('aqua_points', 0)
        
        if points > best_swims[category]["points"]:
            best_swims[category]["points"] = points
            best_swims[category]["formatted_name"] = format_event_name(distance, stroke)
            
            pool_type = swim.get('pool_type_name', '')
            if pool_type == '50 M':
                course = 'LCM'
            elif pool_type == '25 M':
                course = 'SCM'
            else:
                course = pool_type
                
            best_swims[category]["course"] = course
            best_swims[category]["swim_time"] = swim.get('swim_time', '')
            best_swims[category]["result_date"] = result_date
            best_swims[category]["competition"] = swim.get('competition_name', '')

    display_order = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"]
    
    strokes_list = []
    total_score = 0
    
    for cat in display_order:
        data = best_swims[cat]
        strokes_list.append({
            "category": cat,
            "data": data
        })
        total_score += data["points"]
        
    return {
        "swimmer_name": swimmer_name,
        "club_name": club_name,
        "swimmer_id": actual_id,
        "target_year": TARGET_YEAR,
        "strokes": strokes_list,
        "total_score": total_score
    }

def print_stroke_profile(swimmer_id):
    """Fallback CLI print output."""
    data = fetch_swimmer_data(swimmer_id)
    if "error" in data:
        print(data["error"])
        return
        
    print(f"Swimmer: {data['swimmer_name']} ({data['swimmer_id']})\n")
    print(f"{data['target_year']} Stroke Profile\n")
    
    for stroke in data["strokes"]:
        cat = stroke["category"]
        s_data = stroke["data"]
        points = s_data["points"]
        
        if points == 0:
            print(f"{cat + ':':<20} {'None':<15} {points}")
            continue

        name_with_course = f"{s_data['formatted_name']} {s_data['course']}"
        date_and_comp = f"({s_data['result_date']} | {s_data['competition']})"
        
        print(f"{cat + ':':<20} {name_with_course:<15} {s_data['swim_time']:<12} {date_and_comp:<55} {points}")
        
    print(f"\nCombined Score: {data['total_score']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py <swimmer_id>")
        sys.exit(1)
    
    swimmer_id = sys.argv[1]
    print_stroke_profile(swimmer_id)
