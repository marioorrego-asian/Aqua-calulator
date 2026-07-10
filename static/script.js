document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const input = document.getElementById('swimmer-id');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const errorMsg = document.getElementById('error-message');
    const resultsContainer = document.getElementById('results-container');
    const template = document.getElementById('stroke-card-template');

    let swimmer1Data = null;
    let swimmer2Data = null;
    let compareModeActive = false;

    const bubbles = document.querySelectorAll('.bubble');
    const bubbleStates = Array.from(bubbles).map(bubble => ({
        element: bubble,
        wrapper: bubble.parentElement,
        currentX: 0,
        currentY: 0,
        currentScaleX: 1,
        currentScaleY: 1,
        currentAngle: 0,
        bx: 0,
        by: 0
    }));

    function cacheBubblePositions() {
        bubbleStates.forEach(state => {
            const rect = state.wrapper.getBoundingClientRect();
            state.bx = rect.left + rect.width / 2 + window.scrollX;
            state.by = rect.top + rect.height / 2 + window.scrollY;
        });
    }

    // Cache immediately on load, and on window resizing/scrolling
    cacheBubblePositions();
    window.addEventListener('resize', cacheBubblePositions);

    let mouseX = -1000;
    let mouseY = -1000;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.pageX;
        mouseY = e.pageY;
    });

    window.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            mouseX = e.touches[0].pageX;
            mouseY = e.touches[0].pageY;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouseX = e.touches[0].pageX;
            mouseY = e.touches[0].pageY;
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    function updatePhysics() {
        bubbleStates.forEach(state => {
            const bx = state.bx;
            const by = state.by;

            let targetX = 0;
            let targetY = 0;
            let targetScaleX = 1;
            let targetScaleY = 1;
            let targetAngle = 0;

            const dx = bx - mouseX;
            const dy = by - mouseY;
            const dist = Math.hypot(dx, dy);

            const radius = 220;
            if (dist < radius) {
                const force = (radius - dist) / radius;
                const push = force * 65;

                const angleRad = Math.atan2(dy, dx);
                targetX = Math.cos(angleRad) * push;
                targetY = Math.sin(angleRad) * push;

                targetScaleX = 1 - force * 0.25;
                targetScaleY = 1 + force * 0.18;
                targetAngle = angleRad * (180 / Math.PI);
            }

            state.currentX += (targetX - state.currentX) * 0.08;
            state.currentY += (targetY - state.currentY) * 0.08;
            state.currentScaleX += (targetScaleX - state.currentScaleX) * 0.08;
            state.currentScaleY += (targetScaleY - state.currentScaleY) * 0.08;
            state.currentAngle += (targetAngle - state.currentAngle) * 0.08;

            state.element.style.transform = `
                translate(${state.currentX}px, ${state.currentY}px)
                rotate(${state.currentAngle}deg)
                scale(${state.currentScaleX}, ${state.currentScaleY})
                rotate(${-state.currentAngle}deg)
            `;
        });

        requestAnimationFrame(updatePhysics);
    }
    requestAnimationFrame(updatePhysics);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const swimmerId = input.value.trim();
        if (!swimmerId) return;

        setLoading(true);
        hideError();
        exitCompareMode();
        resultsContainer.classList.add('hidden');

        try {
            const response = await fetch(`/api/swimmer/${swimmerId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch data. Please try again.');
            }

            swimmer1Data = data;
            renderSwimmerPanel('panel-1', data);

            document.getElementById('compare-btn').classList.remove('hidden');
            resultsContainer.classList.remove('hidden');
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    });

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

    const compareBtn = document.getElementById('compare-btn');
    const compareWorkspace = document.getElementById('compare-workspace');
    const panel2 = document.getElementById('panel-2');
    const compareForm = document.getElementById('compare-search-form');
    const compareInput = document.getElementById('compare-swimmer-id');
    const compareSubmitBtn = document.getElementById('compare-submit-btn');
    const compareBtnText = document.getElementById('compare-btn-text');
    const compareSpinner = document.getElementById('compare-spinner');
    const comparePlaceholder = document.getElementById('compare-placeholder');

    const compareHero = document.getElementById('compare-hero');
    const compareDivider = document.getElementById('compare-divider');
    const compareGrid = document.getElementById('compare-grid');

    const compareSummaryCard = document.getElementById('compare-summary-card');
    const exitCompareGlobalBtn = document.getElementById('exit-compare-global-btn');

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
        const swimmerId = compareInput.value.trim();
        if (!swimmerId) return;

        setCompareLoading(true);
        try {
            const response = await fetch(`/api/swimmer/${swimmerId}`);
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
});
