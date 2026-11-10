document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const input = document.getElementById('swimmer-id');
    const searchDropdown = document.getElementById('search-dropdown');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const errorMsg = document.getElementById('error-message');
    const resultsContainer = document.getElementById('results-container');
    const template = document.getElementById('stroke-card-template');

    const yearSelect = document.getElementById('year-select');
    const pentagonToggleBtn = document.getElementById('pentagon-toggle-btn');
    const pentagonCard = document.getElementById('pentagon-card');
    const closePentagonBtn = document.getElementById('close-pentagon-btn');
    const pentagonSvg = document.getElementById('pentagon-svg');

    const evolutionToggleBtn = document.getElementById('evolution-toggle-btn');
    const evolutionCard = document.getElementById('evolution-card');
    const closeEvolutionBtn = document.getElementById('close-evolution-btn');
    const evolutionSvg = document.getElementById('evolution-svg');
    const evolutionLoading = document.getElementById('evolution-loading');
    const evolutionTooltip = document.getElementById('evolution-tooltip');
    const evolutionLegend = document.getElementById('evolution-legend');

    const compareBtn = document.getElementById('compare-btn');
    const compareWorkspace = document.getElementById('compare-workspace');
    const panel2 = document.getElementById('panel-2');
    const compareForm = document.getElementById('compare-search-form');
    const compareInput = document.getElementById('compare-swimmer-id');
    const compareSearchDropdown = document.getElementById('compare-search-dropdown');
    const compareSubmitBtn = document.getElementById('compare-submit-btn');
    const compareBtnText = document.getElementById('compare-btn-text');
    const compareSpinner = document.getElementById('compare-spinner');
    const comparePlaceholder = document.getElementById('compare-placeholder');

    const compareHero = document.getElementById('compare-hero');
    const compareDivider = document.getElementById('compare-divider');
    const compareGrid = document.getElementById('compare-grid');

    const compareSummaryCard = document.getElementById('compare-summary-card');
    const exitCompareGlobalBtn = document.getElementById('exit-compare-global-btn');

    const STROKE_COLORS = {
        'Total': '#ffffff',
        'Butterfly': '#3b82f6',
        'Breaststroke': '#ec4899',
        'Freestyle': '#ef4444',
        'Backstroke': '#8b4513',
        'Individual Medley': '#10b981'
    };

    const activeLines = {
        'Total': true,
        'Freestyle': true,
        'Backstroke': true,
        'Breaststroke': true,
        'Butterfly': true,
        'Individual Medley': true
    };

    const swimmerEvolutionCache = {};
    let currentEvolutionData = null;

    let swimmer1Data = null;
    let swimmer2Data = null;
    let compareModeActive = false;

    const handleVisibility = () => {
        document.body.classList.toggle('tab-hidden', document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetchAndRenderSwimmer1();
    });

    yearSelect.addEventListener('change', async () => {
        if (input.value.trim()) {
            await fetchAndRenderSwimmer1();
            if (compareModeActive && compareInput.value.trim()) {
                await fetchAndRenderSwimmer2();
            }
        }
    });

    async function fetchAndRenderSwimmer1() {
        searchDropdown.classList.add('hidden');
        let swimmerId = input.value.trim();
        if (!swimmerId) return;

        setLoading(true);
        hideError();
        if (!compareModeActive) {
            exitCompareMode();
        }
        resultsContainer.classList.add('hidden');

        // If user submitted a name directly instead of numeric ID
        if (!/^\d+$/.test(swimmerId)) {
            try {
                const searchResp = await fetch(`/api/search?q=${encodeURIComponent(swimmerId)}`);
                const results = await searchResp.json();
                if (results && results.length > 0) {
                    swimmerId = results[0].id;
                    input.value = swimmerId;
                } else {
                    throw new Error(`Ingen simmare hittades med namnet "${input.value.trim()}". Ange ett giltigt namn eller ID.`);
                }
            } catch (err) {
                setLoading(false);
                showError(err.message);
                return;
            }
        }

        const selectedYear = yearSelect.value || '2026';

        try {
            const response = await fetch(`/api/swimmer/${swimmerId}?year=${selectedYear}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch data. Please try again.');
            }

            swimmer1Data = data;
            renderSwimmerPanel('panel-1', data);

            if (!pentagonCard.classList.contains('hidden')) {
                renderPentagonChart(swimmer1Data);
            }

            if (!evolutionCard.classList.contains('hidden')) {
                loadAndRenderEvolution(swimmer1Data.swimmer_id);
            }

            document.getElementById('compare-btn').classList.remove('hidden');
            resultsContainer.classList.remove('hidden');
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchAndRenderSwimmer2() {
        compareSearchDropdown.classList.add('hidden');
        let swimmerId = compareInput.value.trim();
        if (!swimmerId) return;

        setCompareLoading(true);

        // If user submitted a name directly instead of numeric ID
        if (!/^\d+$/.test(swimmerId)) {
            try {
                const searchResp = await fetch(`/api/search?q=${encodeURIComponent(swimmerId)}`);
                const results = await searchResp.json();
                if (results && results.length > 0) {
                    swimmerId = results[0].id;
                    compareInput.value = swimmerId;
                } else {
                    throw new Error(`Ingen simmare hittades med namnet "${compareInput.value.trim()}".`);
                }
            } catch (err) {
                setCompareLoading(false);
                alert(err.message);
                return;
            }
        }

        const selectedYear = yearSelect.value || '2026';

        try {
            const response = await fetch(`/api/swimmer/${swimmerId}?year=${selectedYear}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch comparison swimmer.');
            }

            swimmer2Data = data;
            renderSwimmerPanel('panel-2', data);

            comparePlaceholder.classList.add('hidden');
            compareHero.classList.remove('hidden');
            compareDivider.classList.remove('hidden');
            compareGrid.classList.remove('hidden');
            renderComparisonSummary();
        } catch (err) {
            alert(err.message);
        } finally {
            setCompareLoading(false);
        }
    }

    pentagonToggleBtn.addEventListener('click', () => {
        const isHidden = pentagonCard.classList.contains('hidden');
        if (isHidden) {
            if (swimmer1Data) renderPentagonChart(swimmer1Data);
            pentagonCard.classList.remove('hidden');
            pentagonCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            pentagonCard.classList.add('hidden');
        }
    });

    closePentagonBtn.addEventListener('click', () => {
        pentagonCard.classList.add('hidden');
    });

    evolutionToggleBtn.addEventListener('click', async () => {
        const isHidden = evolutionCard.classList.contains('hidden');
        if (isHidden) {
            evolutionCard.classList.remove('hidden');
            evolutionCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            if (swimmer1Data) {
                await loadAndRenderEvolution(swimmer1Data.swimmer_id);
            }
        } else {
            evolutionCard.classList.add('hidden');
        }
    });

    closeEvolutionBtn.addEventListener('click', () => {
        evolutionCard.classList.add('hidden');
    });

    if (evolutionLegend) {
        evolutionLegend.querySelectorAll('.legend-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const stroke = pill.getAttribute('data-stroke');
                activeLines[stroke] = !activeLines[stroke];
                pill.classList.toggle('active', activeLines[stroke]);
                if (currentEvolutionData) {
                    renderEvolutionChart(currentEvolutionData);
                }
            });
        });
    }

    async function loadAndRenderEvolution(swimmerId) {
        if (!swimmerId) return;
        if (swimmerEvolutionCache[swimmerId]) {
            currentEvolutionData = swimmerEvolutionCache[swimmerId];
            renderEvolutionChart(currentEvolutionData);
            return;
        }

        evolutionLoading.classList.remove('hidden');
        try {
            const resp = await fetch(`/api/swimmer/${swimmerId}/evolution`);
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.error || 'Failed to fetch progression data');
            }
            swimmerEvolutionCache[swimmerId] = data;
            currentEvolutionData = data;
            renderEvolutionChart(data);
        } catch (err) {
            console.error('Evolution fetch error:', err);
        } finally {
            evolutionLoading.classList.add('hidden');
        }
    }

    function renderEvolutionChart(data) {
        if (!data || !data.history || !data.history.length) return;

        const svg = evolutionSvg;
        svg.innerHTML = '';

        const width = 760;
        const height = 360;
        const pad = { top: 30, right: 35, bottom: 45, left: 60 };
        const chartW = width - pad.left - pad.right;
        const chartH = height - pad.top - pad.bottom;

        const history = data.history;
        const years = history.map(h => h.year);
        const strokeOrder = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"];

        // Determine maximum value across currently active lines
        let maxVal = 100;
        history.forEach(h => {
            if (activeLines['Total'] && h.total_score > maxVal) {
                maxVal = h.total_score;
            }
            strokeOrder.forEach(cat => {
                if (activeLines[cat]) {
                    const pts = (h.strokes[cat] && h.strokes[cat].points) || 0;
                    if (pts > maxVal) maxVal = pts;
                }
            });
        });

        // Round maxVal up to nice round step (e.g. 500, 250, 100)
        const step = maxVal > 1500 ? 500 : (maxVal > 600 ? 250 : 100);
        const yMax = Math.max(Math.ceil(maxVal / step) * step, step);

        const getX = (idx) => pad.left + (idx / Math.max(years.length - 1, 1)) * chartW;
        const getY = (val) => pad.top + chartH - (val / yMax) * chartH;

        // SVG Defs for white gradient
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const grad = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        grad.setAttribute("id", "total-gradient");
        grad.setAttribute("x1", "0");
        grad.setAttribute("y1", "0");
        grad.setAttribute("x2", "0");
        grad.setAttribute("y2", "1");

        const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "#ffffff");
        stop1.setAttribute("stop-opacity", "0.22");

        const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", "#ffffff");
        stop2.setAttribute("stop-opacity", "0.0");

        grad.appendChild(stop1);
        grad.appendChild(stop2);
        defs.appendChild(grad);
        svg.appendChild(defs);

        // Horizontal Gridlines & Y-Axis Labels
        const numYSteps = 5;
        for (let i = 0; i <= numYSteps; i++) {
            const val = Math.round((yMax / numYSteps) * i);
            const y = getY(val);

            const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            gridLine.setAttribute("x1", pad.left);
            gridLine.setAttribute("y1", y.toFixed(1));
            gridLine.setAttribute("x2", width - pad.right);
            gridLine.setAttribute("y2", y.toFixed(1));
            gridLine.setAttribute("class", "chart-grid-line");
            svg.appendChild(gridLine);

            const yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            yLabel.setAttribute("x", pad.left - 12);
            yLabel.setAttribute("y", y.toFixed(1));
            yLabel.setAttribute("class", "chart-y-label");
            yLabel.textContent = val;
            svg.appendChild(yLabel);
        }

        // X-Axis Year Labels
        years.forEach((yr, idx) => {
            const x = getX(idx);

            const xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
            xLabel.setAttribute("x", x.toFixed(1));
            xLabel.setAttribute("y", height - pad.bottom + 24);
            xLabel.setAttribute("class", "chart-axis-label");
            xLabel.textContent = yr;
            svg.appendChild(xLabel);
        });

        // Helper to format line path
        const buildPath = (coords) => {
            return coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
        };

        // Render Total Area & Line (White)
        if (activeLines['Total']) {
            const totalCoords = history.map((h, i) => ({
                x: getX(i),
                y: getY(h.total_score),
                val: h.total_score,
                year: h.year
            }));

            // Area path
            const areaPathD = `${buildPath(totalCoords)} L ${getX(history.length - 1).toFixed(1)},${(pad.top + chartH).toFixed(1)} L ${getX(0).toFixed(1)},${(pad.top + chartH).toFixed(1)} Z`;
            const areaEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            areaEl.setAttribute("d", areaPathD);
            areaEl.setAttribute("class", "chart-area-total");
            svg.appendChild(areaEl);

            // Line path
            const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            lineEl.setAttribute("d", buildPath(totalCoords));
            lineEl.setAttribute("class", "chart-line-total");
            svg.appendChild(lineEl);
        }

        // Render Stroke Category Lines
        strokeOrder.forEach(cat => {
            if (!activeLines[cat]) return;

            const color = STROKE_COLORS[cat];
            const coords = history.map((h, i) => {
                const pts = (h.strokes[cat] && h.strokes[cat].points) || 0;
                return {
                    x: getX(i),
                    y: getY(pts),
                    val: pts,
                    year: h.year,
                    details: h.strokes[cat]
                };
            });

            const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
            lineEl.setAttribute("d", buildPath(coords));
            lineEl.setAttribute("class", "chart-line-stroke");
            lineEl.setAttribute("stroke", color);
            svg.appendChild(lineEl);
        });

        // Render Interactive Dots on top with generous hit-targets
        // 1. Strokes dots
        strokeOrder.forEach(cat => {
            if (!activeLines[cat]) return;
            const color = STROKE_COLORS[cat];

            history.forEach((h, i) => {
                const pts = (h.strokes[cat] && h.strokes[cat].points) || 0;
                const cx = getX(i);
                const cy = getY(pts);
                const details = h.strokes[cat];

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("class", "chart-point-group");

                // Invisible generous hit target (30px diameter)
                const hitCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                hitCircle.setAttribute("cx", cx.toFixed(1));
                hitCircle.setAttribute("cy", cy.toFixed(1));
                hitCircle.setAttribute("r", "15");
                hitCircle.setAttribute("fill", "transparent");
                hitCircle.style.cursor = "pointer";
                g.appendChild(hitCircle);

                // Visible dot
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", cx.toFixed(1));
                circle.setAttribute("cy", cy.toFixed(1));
                circle.setAttribute("class", "chart-dot");
                circle.setAttribute("fill", color);
                circle.setAttribute("r", "4.5");
                circle.style.pointerEvents = "none";
                g.appendChild(circle);

                bindTooltip(g, circle, {
                    title: `${h.year} · ${cat}`,
                    color: color,
                    rows: [
                        { label: 'Points', value: `${pts} pts` },
                        { label: 'Event', value: details && details.event ? details.event : 'No swim' },
                        { label: 'Time', value: details && details.time ? details.time : '—' },
                        { label: 'Date', value: details && details.date ? details.date : '—' }
                    ],
                    x: cx,
                    y: cy
                });

                svg.appendChild(g);
            });
        });

        // 2. Total dots (White, thicker)
        if (activeLines['Total']) {
            history.forEach((h, i) => {
                const cx = getX(i);
                const cy = getY(h.total_score);

                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                g.setAttribute("class", "chart-point-group");

                // Invisible hit target
                const hitCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                hitCircle.setAttribute("cx", cx.toFixed(1));
                hitCircle.setAttribute("cy", cy.toFixed(1));
                hitCircle.setAttribute("r", "16");
                hitCircle.setAttribute("fill", "transparent");
                hitCircle.style.cursor = "pointer";
                g.appendChild(hitCircle);

                // Visible white dot
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", cx.toFixed(1));
                circle.setAttribute("cy", cy.toFixed(1));
                circle.setAttribute("class", "chart-dot dot-total-marker");
                circle.setAttribute("fill", "#ffffff");
                circle.setAttribute("r", "6");
                circle.style.pointerEvents = "none";
                g.appendChild(circle);

                bindTooltip(g, circle, {
                    title: `${h.year} · Total Score`,
                    color: '#ffffff',
                    rows: [
                        { label: 'Total Points', value: `${h.total_score} pts` }
                    ],
                    x: cx,
                    y: cy
                });

                svg.appendChild(g);
            });
        }
    }

    function bindTooltip(triggerEl, visualDot, data) {
        let isLocked = false;

        const show = (e) => {
            if (e && e.type === 'click') {
                isLocked = !isLocked;
                if (!isLocked) {
                    hide();
                    return;
                }
            }

            visualDot.classList.add('hovered');
            let content = `<div class="tt-title" style="color: ${data.color}">${data.title}</div>`;
            data.rows.forEach(r => {
                content += `<div class="tt-row"><span>${r.label}:</span><strong>${r.value}</strong></div>`;
            });
            evolutionTooltip.innerHTML = content;
            evolutionTooltip.classList.add('visible');

            const containerRect = evolutionSvg.parentElement.getBoundingClientRect();
            const svgRect = evolutionSvg.getBoundingClientRect();
            const scaleX = svgRect.width / 760;
            const scaleY = svgRect.height / 360;

            const pixelX = (svgRect.left - containerRect.left) + data.x * scaleX;
            const pixelY = (svgRect.top - containerRect.top) + data.y * scaleY;

            evolutionTooltip.style.left = `${pixelX}px`;
            evolutionTooltip.style.top = `${pixelY}px`;

            // Smart positioning to prevent overflow
            let transformY = (pixelY < 75) ? '16px' : '-125%';
            let transformX = '-50%';
            if (pixelX < 110) transformX = '-15%';
            else if (pixelX > svgRect.width - 110) transformX = '-85%';

            evolutionTooltip.style.transform = `translate(${transformX}, ${transformY})`;
        };

        const hide = () => {
            if (isLocked) return;
            visualDot.classList.remove('hovered');
            evolutionTooltip.classList.remove('visible');
        };

        triggerEl.addEventListener('mouseenter', show);
        triggerEl.addEventListener('mouseleave', hide);
        triggerEl.addEventListener('click', show);
        triggerEl.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            show(e);
        }, { passive: false });
    }

    function renderPentagonChart(swimmerData) {
        if (!swimmerData || !swimmerData.strokes) return;

        const svg = pentagonSvg;
        svg.innerHTML = '';

        const strokeOrder = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"];
        const strokesMap = {};
        swimmerData.strokes.forEach(s => {
            strokesMap[s.category] = s.data.points;
        });

        const pointsList = strokeOrder.map(cat => strokesMap[cat] || 0);
        const maxPointsScored = Math.max(...pointsList, 0);
        const scaleMax = Math.max(maxPointsScored, 500);

        const cx = 230;
        const cy = 190;
        const radius = 125;
        const numVertices = 5;

        // Concentric grid pentagons
        const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
        levels.forEach(lvl => {
            const r = radius * lvl;
            const pointsArray = [];
            for (let i = 0; i < numVertices; i++) {
                const angle = -Math.PI / 2 + (i * 2 * Math.PI / numVertices);
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                pointsArray.push(`${x.toFixed(1)},${y.toFixed(1)}`);
            }

            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            polygon.setAttribute("points", pointsArray.join(" "));
            polygon.setAttribute("class", lvl === 1.0 ? "radar-grid-outer" : "radar-grid");
            svg.appendChild(polygon);
        });

        // Axis lines
        for (let i = 0; i < numVertices; i++) {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI / numVertices);
            const xOuter = cx + radius * Math.cos(angle);
            const yOuter = cy + radius * Math.sin(angle);

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", cx);
            line.setAttribute("y1", cy);
            line.setAttribute("x2", xOuter.toFixed(1));
            line.setAttribute("y2", yOuter.toFixed(1));
            line.setAttribute("class", "radar-axis");
            svg.appendChild(line);
        }

        // Performance Polygon
        const dataPolygonPoints = [];
        const pointCoords = [];

        strokeOrder.forEach((cat, i) => {
            const pts = strokesMap[cat] || 0;
            const ratio = Math.max(pts / scaleMax, 0.05);
            const r = radius * ratio;
            const angle = -Math.PI / 2 + (i * 2 * Math.PI / numVertices);
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);

            dataPolygonPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
            pointCoords.push({ cat, pts, x, y, angle });
        });

        const perfPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        perfPolygon.setAttribute("points", dataPolygonPoints.join(" "));
        perfPolygon.setAttribute("class", "radar-polygon");
        svg.appendChild(perfPolygon);

        // Vertices & Labels
        pointCoords.forEach(pt => {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", pt.x.toFixed(1));
            circle.setAttribute("cy", pt.y.toFixed(1));
            circle.setAttribute("class", "radar-point");
            
            const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
            title.textContent = `${pt.cat}: ${pt.pts} pts`;
            circle.appendChild(title);
            svg.appendChild(circle);

            const labelR = radius + 28;
            const lx = cx + labelR * Math.cos(pt.angle);
            const ly = cy + labelR * Math.sin(pt.angle);

            const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            labelText.setAttribute("x", lx.toFixed(1));
            labelText.setAttribute("y", (ly - 6).toFixed(1));
            labelText.setAttribute("class", "radar-label");
            labelText.textContent = pt.cat;
            svg.appendChild(labelText);

            const scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            scoreText.setAttribute("x", lx.toFixed(1));
            scoreText.setAttribute("y", (ly + 10).toFixed(1));
            scoreText.setAttribute("class", "radar-score-label");
            scoreText.textContent = `${pt.pts} pts`;
            svg.appendChild(scoreText);
        });
    }

    function renderSwimmerPanel(panelId, data) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const targetPanel = panelId === 'compare-results' ? panel : panel;

        targetPanel.querySelector('.swimmer-name').textContent = data.swimmer_name;
        const club = data.club_name ? `${data.club_name} · ` : '';
        const age = data.age ? `Age ${data.age} · ` : '';
        targetPanel.querySelector('.swimmer-meta').textContent = `${club}${age}${data.target_year}`;

        const totalScoreEl = targetPanel.querySelector('.total-score-value');
        animateValue(totalScoreEl, 0, data.total_score, 900);

        const strokesGrid = targetPanel.querySelector('.strokes-grid');
        strokesGrid.innerHTML = '';

        data.strokes.forEach((stroke, index) => {
            const card = document.importNode(template.content, true);
            const cardRoot = card.querySelector('.stroke-card');
            cardRoot.style.animation = `fade-up 0.45s ease-out ${index * 0.08}s both`;

            card.querySelector('.category-name').textContent = stroke.category;
            card.querySelector('.stroke-points').textContent = stroke.data.points;

            const dropdownEl = card.querySelector('.card-dropdown');

            if (stroke.data.points === 0) {
                card.querySelector('.stroke-details').classList.add('hidden');
                card.querySelector('.card-footer').classList.add('hidden');
                card.querySelector('.stroke-points-badge').style.opacity = '0.35';
                card.querySelector('.empty-state').classList.remove('hidden');
                if (dropdownEl) dropdownEl.remove();
            } else {
                card.querySelector('.event-name').textContent =
                    `${stroke.data.formatted_name} ${stroke.data.course}`.trim();
                card.querySelector('.event-time').textContent = stroke.data.swim_time;
                card.querySelector('.event-date').textContent = stroke.data.result_date;
                card.querySelector('.event-comp').textContent = stroke.data.competition;

                const runs = stroke.data.all_runs || [];
                if (runs.length > 1) {
                    cardRoot.classList.add('has-dropdown');
                    card.querySelector('.dropdown-arrow').classList.remove('hidden');

                    const dropdownList = card.querySelector('.dropdown-list');
                    runs.forEach(run => {
                        const item = document.createElement('div');
                        item.className = 'dropdown-item';

                        const ev = document.createElement('span');
                        ev.className = 'dropdown-event';
                        ev.textContent = `${run.formatted_name} (${run.course})`;

                        const t = document.createElement('span');
                        t.className = 'dropdown-time';
                        t.textContent = run.swim_time;

                        const pts = document.createElement('span');
                        pts.className = 'dropdown-points';
                        pts.textContent = `${run.points} pts`;

                        item.appendChild(ev);
                        item.appendChild(t);
                        item.appendChild(pts);
                        dropdownList.appendChild(item);
                    });

                    cardRoot.addEventListener('click', () => {
                        cardRoot.classList.toggle('active');
                    });
                } else {
                    if (dropdownEl) dropdownEl.remove();
                }
            }

            strokesGrid.appendChild(card);
        });
    }


    compareBtn.addEventListener('click', () => {
        enterCompareMode();
    });

    document.getElementById('cancel-compare-btn').addEventListener('click', () => {
        exitCompareMode();
    });

    exitCompareGlobalBtn.addEventListener('click', () => {
        exitCompareMode();
    });

    compareForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await fetchAndRenderSwimmer2();
    });

    function enterCompareMode() {
        compareModeActive = true;
        compareWorkspace.classList.add('compare-mode');
        panel2.classList.remove('hidden');
        comparePlaceholder.classList.remove('hidden');

        compareHero.classList.add('hidden');
        compareDivider.classList.add('hidden');
        compareGrid.classList.add('hidden');

        compareBtn.classList.add('hidden');
        exitCompareGlobalBtn.classList.remove('hidden');
        compareInput.value = '';
    }

    function exitCompareMode() {
        compareModeActive = false;
        swimmer2Data = null;
        compareWorkspace.classList.remove('compare-mode');
        panel2.classList.add('hidden');
        compareSummaryCard.classList.add('hidden');
        compareBtn.classList.remove('hidden');
        exitCompareGlobalBtn.classList.add('hidden');
    }

    function renderComparisonSummary() {
        if (!swimmer1Data || !swimmer2Data) return;

        const winnerAnnounceEl = document.getElementById('winner-announcement');
        const totalDiff = swimmer1Data.total_score - swimmer2Data.total_score;

        if (totalDiff > 0) {
            winnerAnnounceEl.innerHTML = `<div class="total-diff-val positive">+${totalDiff} pts</div>`;
        } else if (totalDiff < 0) {
            winnerAnnounceEl.innerHTML = `<div class="total-diff-val negative">-${Math.abs(totalDiff)} pts</div>`;
        } else {
            winnerAnnounceEl.innerHTML = `<div class="total-diff-val neutral">0 pts</div>`;
        }

        const displayOrder = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "Individual Medley"];
        const summaryList = document.getElementById('summary-list');
        summaryList.innerHTML = '';

        displayOrder.forEach(strokeName => {
            const s1 = swimmer1Data.strokes.find(s => s.category === strokeName);
            const s2 = swimmer2Data.strokes.find(s => s.category === strokeName);

            const s1Points = s1 ? s1.data.points : 0;
            const s2Points = s2 ? s2.data.points : 0;
            const diff = s1Points - s2Points;

            const row = document.createElement('div');
            row.className = 'summary-row';

            const title = document.createElement('span');
            title.className = 'summary-stroke-name';
            title.textContent = strokeName;

            const comparison = document.createElement('div');
            comparison.className = 'summary-swimmers-comparison';

            const stat1 = document.createElement('div');
            stat1.className = 'swimmer-stat s1';
            const ev1 = document.createElement('span');
            ev1.className = 'sw-event';
            ev1.textContent = s1Points > 0 ? `${s1.data.formatted_name} ${s1.data.course}` : 'None';
            const pts1 = document.createElement('span');
            pts1.className = 'sw-points';
            pts1.textContent = `${s1Points} pts`;
            stat1.appendChild(ev1);
            stat1.appendChild(pts1);

            const badge = document.createElement('div');
            if (diff > 0) {
                badge.className = 'diff-badge positive';
                badge.textContent = `+${diff}`;
            } else if (diff < 0) {
                badge.className = 'diff-badge negative';
                badge.textContent = `${diff}`;
            } else {
                badge.className = 'diff-badge neutral';
                badge.textContent = `0`;
            }

            const stat2 = document.createElement('div');
            stat2.className = 'swimmer-stat s2';
            const ev2 = document.createElement('span');
            ev2.className = 'sw-event';
            ev2.textContent = s2Points > 0 ? `${s2.data.formatted_name} ${s2.data.course}` : 'None';
            const pts2 = document.createElement('span');
            pts2.className = 'sw-points';
            pts2.textContent = `${s2Points} pts`;
            stat2.appendChild(ev2);
            stat2.appendChild(pts2);

            comparison.appendChild(stat1);
            comparison.appendChild(badge);
            comparison.appendChild(stat2);

            row.appendChild(title);
            row.appendChild(comparison);
            summaryList.appendChild(row);
        });

        compareSummaryCard.classList.remove('hidden');
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        btnText.classList.toggle('hidden', isLoading);
        btnSpinner.classList.toggle('hidden', !isLoading);
    }

    function setCompareLoading(isLoading) {
        compareSubmitBtn.disabled = isLoading;
        compareBtnText.classList.toggle('hidden', isLoading);
        compareSpinner.classList.toggle('hidden', !isLoading);
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
    }

    function hideError() {
        errorMsg.classList.add('hidden');
    }

    function animateValue(el, start, end, duration) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.textContent = end;
            return;
        }
        let startTs = null;
        const step = (ts) => {
            if (!startTs) startTs = ts;
            const progress = Math.min((ts - startTs) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * (end - start) + start);
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = end;
        };
        requestAnimationFrame(step);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m]));
    }

    function setupSwimmerAutocomplete(inputEl, dropdownEl, onSelect) {
        let debounceTimer = null;
        let selectedIndex = -1;
        let currentResults = [];

        const closeDropdown = () => {
            dropdownEl.classList.add('hidden');
            dropdownEl.innerHTML = '';
            selectedIndex = -1;
            currentResults = [];
        };

        const renderResults = (results, query) => {
            currentResults = results || [];
            selectedIndex = -1;
            dropdownEl.innerHTML = '';

            if (currentResults.length === 0) {
                dropdownEl.innerHTML = `<div class="dropdown-message-item">No swimmers found for "${escapeHtml(query)}"</div>`;
                dropdownEl.classList.remove('hidden');
                return;
            }

            currentResults.forEach((swimmer, idx) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item-swimmer';
                item.setAttribute('data-index', idx);

                const info = document.createElement('div');
                info.className = 'swimmer-search-info';

                const name = document.createElement('span');
                name.className = 'swimmer-search-name';
                name.textContent = swimmer.name;

                const meta = document.createElement('span');
                meta.className = 'swimmer-search-meta';
                if (swimmer.birth_year) {
                    const badge = document.createElement('span');
                    badge.className = 'swimmer-search-badge';
                    badge.textContent = swimmer.birth_year;
                    meta.appendChild(badge);
                }
                const club = document.createElement('span');
                club.textContent = swimmer.club || swimmer.gender || '';
                meta.appendChild(club);

                info.appendChild(name);
                info.appendChild(meta);

                const idBadge = document.createElement('span');
                idBadge.className = 'swimmer-search-id';
                idBadge.textContent = `ID: ${swimmer.id}`;

                item.appendChild(info);
                item.appendChild(idBadge);

                item.addEventListener('mouseenter', () => {
                    updateSelection(idx);
                });

                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectSwimmer(swimmer);
                });

                dropdownEl.appendChild(item);
            });

            dropdownEl.classList.remove('hidden');
        };

        const updateSelection = (newIndex) => {
            const items = dropdownEl.querySelectorAll('.dropdown-item-swimmer');
            items.forEach((item, i) => {
                item.classList.toggle('selected', i === newIndex);
            });
            selectedIndex = newIndex;
            if (selectedIndex >= 0 && items[selectedIndex]) {
                items[selectedIndex].scrollIntoView({ block: 'nearest' });
            }
        };

        const selectSwimmer = (swimmer) => {
            inputEl.value = swimmer.id;
            closeDropdown();
            if (onSelect) {
                onSelect(swimmer);
            }
        };

        inputEl.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            const val = inputEl.value.trim();

            if (!val || /^\d+$/.test(val) || val.length < 2) {
                closeDropdown();
                return;
            }

            dropdownEl.innerHTML = `
                <div class="dropdown-message-item">
                    <div class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></div>
                    <span>Searching swimmers...</span>
                </div>
            `;
            dropdownEl.classList.remove('hidden');

            debounceTimer = setTimeout(async () => {
                const currentVal = inputEl.value.trim();
                if (currentVal !== val || /^\d+$/.test(currentVal) || currentVal.length < 2) {
                    return;
                }
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(currentVal)}`);
                    const data = await res.json();
                    if (inputEl.value.trim() === currentVal) {
                        renderResults(data, currentVal);
                    }
                } catch (err) {
                    dropdownEl.innerHTML = `<div class="dropdown-message-item">Could not search. Please try again.</div>`;
                }
            }, 280);
        });

        inputEl.addEventListener('keydown', (e) => {
            if (dropdownEl.classList.contains('hidden')) return;

            const items = dropdownEl.querySelectorAll('.dropdown-item-swimmer');
            if (items.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (selectedIndex + 1) >= items.length ? 0 : selectedIndex + 1;
                updateSelection(nextIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = (selectedIndex - 1) < 0 ? items.length - 1 : selectedIndex - 1;
                updateSelection(prevIndex);
            } else if (e.key === 'Enter') {
                const pickIndex = selectedIndex >= 0 ? selectedIndex : (currentResults.length > 0 ? 0 : -1);
                if (pickIndex >= 0 && currentResults[pickIndex]) {
                    e.preventDefault();
                    selectSwimmer(currentResults[pickIndex]);
                }
            } else if (e.key === 'Escape') {
                closeDropdown();
            }
        });

        document.addEventListener('click', (e) => {
            if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
                closeDropdown();
            }
        });
    }

    // Initialize Autocomplete for Main Search and Compare Search
    setupSwimmerAutocomplete(input, searchDropdown, () => {
        fetchAndRenderSwimmer1();
    });

    setupSwimmerAutocomplete(compareInput, compareSearchDropdown, () => {
        fetchAndRenderSwimmer2();
    });
});
