import json
import re
import sys

import requests
from bs4 import BeautifulSoup

TARGET_YEAR = 2026

CATEGORIES = {
    "Freestyle": "Freestyle",
    "Backstroke": "Backstroke",
    "Breaststroke": "Breaststroke",
    "Butterfly": "Butterfly",
    "Medley": "Individual Medley",
}

SHORT_NAMES = {
    "Freestyle": "Free",
    "Backstroke": "Back",
    "Breaststroke": "Breast",
    "Butterfly": "Fly",
    "Medley": "IM",
}


def format_event_name(distance, stroke):
    return f"{distance} {SHORT_NAMES[stroke]}"


def parse_data_page(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    app_div = soup.find("div", id="app")
    if not app_div:
        raise RuntimeError("Could not find the data container on the page.")

    data_page = app_div.get("data-page")
    if not data_page:
        raise RuntimeError("Could not find data-page attribute.")

    try:
        return json.loads(data_page)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Failed to decode JSON data.") from exc


def build_stroke_profile(data, swimmer_id):
    props = data.get("props", {})
    swimmer_info = props.get("swimmer", {})
    swimmer_name = swimmer_info.get("name", "Unknown")
    actual_id = swimmer_info.get("id", swimmer_id)

    results_short = props.get("results_short", {}).get("data", [])
    results_long = props.get("results_long", {}).get("data", [])
    all_swims = results_short + results_long

    best_swims = {
        cat: {
            "points": 0,
            "formatted_name": "",
            "course": "",
            "swim_time": "",
            "result_date": "",
        }
        for cat in CATEGORIES.values()
    }

    event_regex = re.compile(r"^(\d+)m\s+(Freestyle|Backstroke|Breaststroke|Butterfly|Medley)$")

    for swim in all_swims:
        result_date = swim.get("result_date", "")
        if not result_date.startswith(str(TARGET_YEAR)):
            continue

        event_name = swim.get("event_name", "")
        match = event_regex.match(event_name)
        if not match:
            continue

        distance, stroke = match.groups()
        category = CATEGORIES[stroke]
        points = swim.get("aqua_points", 0)

        if points > best_swims[category]["points"]:
            pool_type = swim.get("pool_type_name", "")
            if pool_type == "50 M":
                course = "LCM"
            elif pool_type == "25 M":
                course = "SCM"
            else:
                course = pool_type

            best_swims[category] = {
                "points": points,
                "formatted_name": format_event_name(distance, stroke),
                "course": course,
                "swim_time": swim.get("swim_time", ""),
                "result_date": result_date,
            }

    display_order = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"]
    strokes = []
    total_score = 0

    for cat in display_order:
        cat_data = best_swims[cat]
        points = cat_data["points"]
        total_score += points

        event = None
        if cat_data["formatted_name"]:
            event = f"{cat_data['formatted_name']} {cat_data['course']}".strip()

        strokes.append(
            {
                "stroke_type": cat,
                "event": event,
                "time": cat_data["swim_time"] or None,
                "date": cat_data["result_date"] or None,
                "aqua_points": points,
            }
        )

    return {
        "swimmer_name": swimmer_name,
        "swimmer_id": actual_id,
        "target_year": TARGET_YEAR,
        "strokes": strokes,
        "combined_score": total_score,
    }


def get_stroke_profile_data(swimmer_id):
    if swimmer_id is None or str(swimmer_id).strip() == "":
        raise ValueError("Swimmer ID is required.")

    normalized_id = str(swimmer_id).strip()
    url = (
        f"https://www.tempusopen.se/swimmers/{normalized_id}/swimming"
        f"?from_date={TARGET_YEAR}-01-01&to_date={TARGET_YEAR}-12-31"
    )
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        response = requests.get(url, headers=headers, timeout=20)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"Error fetching data for swimmer {normalized_id}: {exc}") from exc

    data = parse_data_page(response.text)
    return build_stroke_profile(data, normalized_id)


def print_stroke_profile(profile):
    print(f"Swimmer: {profile['swimmer_name']} ({profile['swimmer_id']})\n")
    print(f"{profile['target_year']} Stroke Profile\n")

    for stroke in profile["strokes"]:
        label = f"{stroke['stroke_type']}:"
        if not stroke["event"]:
            print(f"{label:<20} {'None':<15} {stroke['aqua_points']}")
            continue

        date_str = f"({stroke['date']})" if stroke["date"] else ""
        print(
            f"{label:<20} {stroke['event']:<15} {stroke['time'] or '':<12} "
            f"{date_str:<15} {stroke['aqua_points']}"
        )

    print(f"\nCombined Score: {profile['combined_score']}")


def get_stroke_profile(swimmer_id):
    try:
        profile = get_stroke_profile_data(swimmer_id)
    except (ValueError, RuntimeError) as exc:
        print(str(exc))
        return None

    print_stroke_profile(profile)
    return profile


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py <swimmer_id>")
        sys.exit(1)

    get_stroke_profile(sys.argv[1])
