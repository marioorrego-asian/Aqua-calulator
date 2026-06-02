# Tempus Open Stroke Profile Calculator

Ett verktyg för att räkna ut poäng för vandringspriset i Eskilstuna Simklubb. (A tool to calculate the points for the perpetual trophy in Eskilstuna Simklubb).

This Python application takes a Tempus Open swimmer ID and calculates a swimmer's stroke profile based on their best AQUA-point swim in each of the five stroke categories during the 2026 season.

## Features
- Scrapes the swimmer's public results from Tempus Open.
- Automatically selects the single highest-AQUA point swim from Freestyle, Backstroke, Breaststroke, Butterfly, and Individual Medley.
- Outputs a neatly formatted scorecard with pool type (LCM/SCM), swim time, date, and points.

## Prerequisites
- **Python 3.11** or higher.
- Mac or Linux terminal.

## Installation & Setup (Mac / Linux)

1. **Navigate** into the project folder:
   ```bash
   cd Aqua-calulator
   ```

2. **Create a virtual environment** to keep dependencies isolated:
   ```bash
   python3 -m venv venv
   ```

3. **Activate the virtual environment**:
   ```bash
   source venv/bin/activate
   ```

4. **Install the required libraries**:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

Ensure your virtual environment is active (`source venv/bin/activate`), then run the script with a valid Tempus Open swimmer ID:

```bash
python3 main.py <swimmer_id>
```

**Example:**
```bash
python3 main.py 316250
```

**Example Output:**
```text
Swimmer: Mario Orrego (316250)

2026 Stroke Profile

Freestyle:           100 Free LCM    00:54.80     (2026-05-24 | DM-UDM-ParaDM50m2026)           607
Backstroke:          100 Back SCM    00:59.77     (2026-01-11 | Duvedoppet 2026)                528
Breaststroke:        100 Breast SCM  01:07.74     (2026-01-11 | Duvedoppet 2026)                543
Butterfly:           100 Fly LCM     00:57.09     (2026-04-10 | Malmsten Swim Open Stockholm 2026) 649
Individual Medley:   100 IM SCM      00:59.38     (2026-01-11 | Duvedoppet 2026)                571

Combined Score: 2898
```

## Creating a Terminal Shortcut (Optional)

If you want to be able to run this tool from anywhere on your computer without having to navigate to the folder and activate the virtual environment manually, you can add an alias to your shell profile.

1. Open your terminal configuration file (usually `.zshrc` on Mac, or `.bashrc` on Linux):
   ```bash
   nano ~/.zshrc
   # OR
   nano ~/.bashrc
   ```

2. Add the following line to the bottom of the file (make sure to replace `/path/to/` with the actual absolute path to where you saved the `Aqua-calulator` folder):
   ```bash
   alias aqua='/path/to/Aqua-calulator/venv/bin/python /path/to/Aqua-calulator/main.py'
   ```

3. Save the file and reload your terminal settings:
   ```bash
   source ~/.zshrc
   ```

4. Now you can calculate a score from any directory simply by typing:
   ```bash
   aqua 316250
   ```
