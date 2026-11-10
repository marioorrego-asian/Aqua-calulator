import sys
import requests
from requests.adapters import HTTPAdapter
import html
import json
import re
from urllib.parse import unquote
from concurrent.futures import ThreadPoolExecutor

DEFAULT_YEAR = 2026

CATEGORIES = {
    "Freestyle": "Freestyle",
    "Backstroke": "Backstroke",
    "Breaststroke": "Breaststroke",
    "Butterfly": "Butterfly",
    "Medley": "Individual Medley"
}

_swimmer_data_cache = {}
_evolution_cache = {}

_evolution_session = requests.Session()
_adapter = HTTPAdapter(pool_connections=12, pool_maxsize=12)
_evolution_session.mount('https://', _adapter)
_evolution_session.mount('http://', _adapter)

SHORT_NAMES = {
    "Freestyle": "Free",
    "Backstroke": "Back",
    "Breaststroke": "Breast",
    "Butterfly": "Fly",
    "Medley": "IM"
}

def format_event_name(distance, stroke):
    return f"{distance} {SHORT_NAMES[stroke]}"

def fetch_swimmer_data(swimmer_id, year=DEFAULT_YEAR):
    target_year = int(year) if year else DEFAULT_YEAR
    cache_key = f"{swimmer_id}:{target_year}"
    if cache_key in _swimmer_data_cache:
        return _swimmer_data_cache[cache_key]

    url = f"https://www.tempusopen.se/swimmers/{swimmer_id}/swimming?from_date={target_year}-01-01&to_date={target_year}-12-31"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    
    try:
        resp = _evolution_session.get(url, headers=headers, timeout=9)
        resp.raise_for_status()
    except Exception as e:
        return {"error": f"Error fetching data for swimmer {swimmer_id}: {e}"}

    match = re.search(r'data-page="([^"]+)"', resp.text)
    if not match:
        return {"error": "Could not find the data container on the page."}

    data_page = html.unescape(match.group(1))

    try:
        data = json.loads(data_page)
    except json.JSONDecodeError:
        return {"error": "Failed to decode JSON data."}

    props = data.get('props', {})
    swimmer_info = props.get('swimmer', {})
    swimmer_name = swimmer_info.get('name', 'Unknown')
    actual_id = swimmer_info.get('id', swimmer_id)
    club_name = swimmer_info.get('club_name', '')
    birth_year_str = swimmer_info.get('birth_year')
    try:
        birth_year = int(birth_year_str) if birth_year_str else None
        age = target_year - birth_year if birth_year else None
    except ValueError:
        age = None


    results_short = props.get('results_short', {}).get('data', [])
    results_long = props.get('results_long', {}).get('data', [])
    
    all_swims = results_short + results_long

    cat_events = {cat: {} for cat in CATEGORIES.values()}
    event_regex = re.compile(r'^(\d+)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Medley)$')

    for swim in all_swims:
        result_date = swim.get('result_date', '')
        if not result_date.startswith(str(target_year)):
            continue
        
        event_name = swim.get('event_name', '')
        match = event_regex.match(event_name)
        if not match:
            continue
        
        distance = match.group(1)
        stroke = match.group(2)
        
        category = CATEGORIES[stroke]
        points = swim.get('aqua_points', 0)
        
        pool_type = swim.get('pool_type_name', '')
        if pool_type == '50 M':
            course = 'LCM'
        elif pool_type == '25 M':
            course = 'SCM'
        else:
            course = pool_type
            
        event_key = (distance, course)
        swim_data = {
            "points": points,
            "formatted_name": format_event_name(distance, stroke),
            "course": course,
            "swim_time": swim.get('swim_time', ''),
            "result_date": result_date,
            "competition": swim.get('competition_name', '')
        }
        
        if event_key not in cat_events[category] or points > cat_events[category][event_key]["points"]:
            cat_events[category][event_key] = swim_data

    best_swims = {}
    for cat in CATEGORIES.values():
        events_for_cat = list(cat_events[cat].values())
        events_for_cat.sort(key=lambda x: x["points"], reverse=True)
        
        if events_for_cat:
            best_swims[cat] = {
                **events_for_cat[0],
                "all_runs": events_for_cat
            }
        else:
            best_swims[cat] = {
                "points": 0,
                "formatted_name": "None",
                "course": "",
                "swim_time": "",
                "result_date": "",
                "competition": "",
                "all_runs": []
            }

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
        
    res = {
        "swimmer_name": swimmer_name,
        "club_name": club_name,
        "swimmer_id": actual_id,
        "target_year": target_year,
        "age": age,
        "strokes": strokes_list,
        "total_score": total_score
    }
    if len(_swimmer_data_cache) > 250:
        _swimmer_data_cache.clear()
    _swimmer_data_cache[cache_key] = res
    return res

def fetch_swimmer_evolution(swimmer_id, start_year=2020, end_year=2026):
    cache_key = f"{swimmer_id}:{start_year}:{end_year}"
    if cache_key in _evolution_cache:
        return _evolution_cache[cache_key]

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    years_range = list(range(start_year, end_year + 1))

    def fetch_single_year(target_year):
        url = f"https://www.tempusopen.se/swimmers/{swimmer_id}/swimming?from_date={target_year}-01-01&to_date={target_year}-12-31"
        try:
            resp = _evolution_session.get(url, headers=headers, timeout=8)
            if not resp.ok:
                return target_year, None, []
            match = re.search(r'data-page="([^"]+)"', resp.text)
            if not match:
                return target_year, None, []
            data = json.loads(html.unescape(match.group(1)))
            props = data.get('props', {})
            swimmer_info = props.get('swimmer', {})
            swims = props.get('results_short', {}).get('data', []) + props.get('results_long', {}).get('data', [])
            return target_year, swimmer_info, swims
        except Exception:
            return target_year, None, []

    with ThreadPoolExecutor(max_workers=min(len(years_range), 8)) as executor:
        yearly_results = list(executor.map(fetch_single_year, years_range))

    event_regex = re.compile(r'^(\d+)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Medley)$')
    display_order = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"]
    
    history = []
    swimmer_name = "Unknown"
    actual_id = swimmer_id
    club_name = ""

    for yr, swimmer_info, all_swims in sorted(yearly_results, key=lambda x: x[0]):
        if swimmer_info and swimmer_name == "Unknown":
            swimmer_name = swimmer_info.get('name', 'Unknown')
            actual_id = swimmer_info.get('id', swimmer_id)
            club_name = swimmer_info.get('club_name', '')

        cat_events = {cat: {} for cat in CATEGORIES.values()}
        for swim in all_swims:
            result_date = swim.get('result_date', '')
            if not result_date.startswith(str(yr)):
                continue

            event_name = swim.get('event_name', '')
            match = event_regex.match(event_name)
            if not match:
                continue

            distance = match.group(1)
            stroke = match.group(2)
            category = CATEGORIES[stroke]
            points = swim.get('aqua_points', 0)

            pool_type = swim.get('pool_type_name', '')
            if pool_type == '50 M':
                course = 'LCM'
            elif pool_type == '25 M':
                course = 'SCM'
            else:
                course = pool_type

            event_key = (distance, course)
            swim_data = {
                "points": points,
                "formatted_name": format_event_name(distance, stroke),
                "course": course,
                "swim_time": swim.get('swim_time', ''),
                "result_date": result_date,
                "competition": swim.get('competition_name', '')
            }

            if event_key not in cat_events[category] or points > cat_events[category][event_key]["points"]:
                cat_events[category][event_key] = swim_data

        yr_strokes = {}
        yr_total = 0
        for cat in display_order:
            events_for_cat = list(cat_events[cat].values())
            events_for_cat.sort(key=lambda x: x["points"], reverse=True)
            if events_for_cat:
                best = events_for_cat[0]
                yr_strokes[cat] = {
                    "points": best["points"],
                    "event": f"{best['formatted_name']} {best['course']}",
                    "time": best["swim_time"],
                    "date": best["result_date"],
                    "competition": best["competition"]
                }
                yr_total += best["points"]
            else:
                yr_strokes[cat] = {
                    "points": 0,
                    "event": "None",
                    "time": "",
                    "date": "",
                    "competition": ""
                }

        history.append({
            "year": yr,
            "total_score": yr_total,
            "strokes": yr_strokes
        })

    res = {
        "swimmer_name": swimmer_name,
        "swimmer_id": actual_id,
        "club_name": club_name,
        "years": years_range,
        "history": history
    }
    if len(_evolution_cache) > 200:
        _evolution_cache.clear()
    _evolution_cache[cache_key] = res
    return res

class SwimmerSearchEngine:
    def __init__(self):
        self.session = requests.Session()
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'X-Inertia': 'true',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        self.cache = {}
        self._init_session()

    def _init_session(self):
        try:
            r0 = self.session.get('https://www.tempusopen.se/swimmers', headers={'User-Agent': self.headers['User-Agent']}, timeout=5)
            match = re.search(r'data-page="([^"]+)"', r0.text)
            if match:
                data = json.loads(html.unescape(match.group(1)))
                self.headers['X-Inertia-Version'] = data.get('version', '')
            csrf = self.session.cookies.get('XSRF-TOKEN')
            if csrf:
                self.headers['X-XSRF-TOKEN'] = unquote(csrf)
        except Exception:
            pass

    def _query_tempus(self, first_name='', last_name=''):
        payload = {
            'first_name': first_name,
            'last_name': last_name,
            'club': '',
            'category': '',
            'class': '',
            'status': ''
        }
        try:
            r = self.session.post('https://www.tempusopen.se/swimmers', headers=self.headers, json=payload, timeout=6)
            if r.status_code == 409:
                self._init_session()
                r = self.session.post('https://www.tempusopen.se/swimmers', headers=self.headers, json=payload, timeout=6)
            if r.status_code == 200:
                data = r.json()
                swimmers = data.get('props', {}).get('swimmers', {}).get('data', [])
                return [{
                    'id': str(s.get('id')),
                    'name': f"{s.get('first_name', '')} {s.get('last_name', '')}".strip(),
                    'birth_year': s.get('birth_year') or '',
                    'club': s.get('swim_clubs_label') or '',
                    'gender': s.get('class_name') or ''
                } for s in swimmers]
        except Exception:
            pass
        return []

    def search(self, query):
        q = query.strip()
        if not q or len(q) < 2:
            return []
        if q.lower() in self.cache:
            return self.cache[q.lower()]

        parts = q.split()
        if len(parts) >= 2:
            results = self._query_tempus(first_name=parts[0], last_name=' '.join(parts[1:]))
        else:
            with ThreadPoolExecutor(max_workers=2) as ex:
                f1 = ex.submit(self._query_tempus, first_name=parts[0], last_name='')
                f2 = ex.submit(self._query_tempus, first_name='', last_name=parts[0])
                r1 = f1.result()
                r2 = f2.result()
            seen = set()
            results = []
            for s in r1 + r2:
                if s['id'] not in seen:
                    seen.add(s['id'])
                    results.append(s)

        res = results[:8]
        if len(self.cache) > 200:
            self.cache.clear()
        self.cache[q.lower()] = res
        return res

_search_engine = SwimmerSearchEngine()

def search_swimmers(query):
    return _search_engine.search(query)

def print_stroke_profile(swimmer_id, year=DEFAULT_YEAR):
    data = fetch_swimmer_data(swimmer_id, year=year)
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
        print("Usage: python main.py <swimmer_id> [year]")
        sys.exit(1)
    
    swimmer_id = sys.argv[1]
    year = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_YEAR
    print_stroke_profile(swimmer_id, year=year)
