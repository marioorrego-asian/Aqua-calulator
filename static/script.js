document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const input = document.getElementById('swimmer-id');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const errorMsg = document.getElementById('error-message');
    const resultsContainer = document.getElementById('results-container');
    const swimmerNameEl = document.getElementById('swimmer-name');
    const swimmerMetaEl = document.getElementById('swimmer-meta');
    const totalScoreEl = document.getElementById('total-score-value');
    const strokesGrid = document.getElementById('strokes-grid');
    const template = document.getElementById('stroke-card-template');

    const bubbles = document.querySelectorAll('.bubble');
    const bubbleStates = Array.from(bubbles).map(bubble => ({
        element: bubble,
        wrapper: bubble.parentElement,
        currentX: 0,
        currentY: 0,
        currentScaleX: 1,
        currentScaleY: 1,
        currentAngle: 0
    }));

    let mouseX = -1000;
    let mouseY = -1000;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    window.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouseX = e.touches[0].clientX;
            mouseY = e.touches[0].clientY;
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    function updatePhysics() {

        bubbleStates.forEach(state => {
            const rect = state.wrapper.getBoundingClientRect();
            const bx = rect.left + rect.width / 2;
            const by = rect.top + rect.height / 2;

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
        resultsContainer.classList.add('hidden');
        strokesGrid.innerHTML = '';

        try {
            const response = await fetch(`/api/swimmer/${swimmerId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch data. Please try again.');
            }

            renderResults(data);
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    });

    function renderResults(data) {
        swimmerNameEl.textContent = data.swimmer_name;
        const club = data.club_name ? `${data.club_name} · ` : '';
        const age = data.age ? `Age ${data.age} · ` : '';
        swimmerMetaEl.textContent = `${club}${age}${data.target_year}`;

        animateValue(totalScoreEl, 0, data.total_score, 900);

        data.strokes.forEach((stroke, index) => {
            const card = document.importNode(template.content, true);
            const cardRoot = card.querySelector('.stroke-card');
            cardRoot.style.animation = `fade-up 0.45s ease-out ${index * 0.08}s both`;

            card.querySelector('.stroke-category').textContent = stroke.category;
            card.querySelector('.stroke-points').textContent = stroke.data.points;

            if (stroke.data.points === 0) {
                card.querySelector('.stroke-details').classList.add('hidden');
                card.querySelector('.card-footer').classList.add('hidden');
                card.querySelector('.stroke-points-badge').style.opacity = '0.35';
                card.querySelector('.empty-state').classList.remove('hidden');
            } else {
                card.querySelector('.event-name').textContent =
                    `${stroke.data.formatted_name} ${stroke.data.course}`.trim();
                card.querySelector('.event-time').textContent = stroke.data.swim_time;
                card.querySelector('.event-date').textContent = stroke.data.result_date;
                card.querySelector('.event-comp').textContent = stroke.data.competition;
            }

            strokesGrid.appendChild(card);
        });

        resultsContainer.classList.remove('hidden');
    }

    function setLoading(isLoading) {
        submitBtn.disabled = isLoading;
        btnText.classList.toggle('hidden', isLoading);
        btnSpinner.classList.toggle('hidden', !isLoading);
    }

    // Keep error display clean
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
