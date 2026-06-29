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

        // Build meta line: club (if available) + year
        const club = data.club_name ? `${data.club_name} · ` : '';
        swimmerMetaEl.textContent = `${club}${data.target_year}`;

        // Animate score counter
        animateValue(totalScoreEl, 0, data.total_score, 900);

        // Render stroke cards with staggered fade-up
        data.strokes.forEach((stroke, index) => {
            const card = document.importNode(template.content, true);
            const cardRoot = card.querySelector('.stroke-card');

            // Staggered animation
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

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
    }

    function hideError() {
        errorMsg.classList.add('hidden');
    }

    // Smooth number count-up with cubic ease-out
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
