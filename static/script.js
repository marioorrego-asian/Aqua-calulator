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
    bubbles.forEach(bubble => {
        const r1 = Math.floor(Math.random() * 25) + 38;
        const r2 = 100 - r1;
        const r3 = Math.floor(Math.random() * 25) + 38;
        const r4 = 100 - r3;
        const r5 = Math.floor(Math.random() * 25) + 38;
        const r6 = 100 - r5;
        const r7 = Math.floor(Math.random() * 25) + 38;
        const r8 = 100 - r7;
        bubble.style.borderRadius = `${r1}% ${r2}% ${r3}% ${r4}% / ${r5}% ${r6}% ${r7}% ${r8}%`;

        const wrapper = bubble.parentElement;
        const width = parseFloat(getComputedStyle(wrapper).width || 50);
        bubble.dataset.depth = (width / 150) * 0.04;
    });

    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    window.addEventListener('mousemove', (e) => {
        targetX = (e.clientX / window.innerWidth) - 0.5;
        targetY = (e.clientY / window.innerHeight) - 0.5;
    });

    function updateParallax() {
        mouseX += (targetX - mouseX) * 0.08;
        mouseY += (targetY - mouseY) * 0.08;

        bubbles.forEach(bubble => {
            const depth = parseFloat(bubble.dataset.depth || 0.02);
            const x = mouseX * depth * window.innerWidth;
            const y = mouseY * depth * window.innerHeight;
            bubble.style.transform = `translate(${x}px, ${y}px)`;
        });

        requestAnimationFrame(updateParallax);
    }
    requestAnimationFrame(updateParallax);

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
        swimmerMetaEl.textContent = `${club}${data.target_year}`;

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
