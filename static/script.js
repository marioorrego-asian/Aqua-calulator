document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const input = document.getElementById('swimmer-id');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('span');
    const btnSpinner = document.getElementById('btn-spinner');
    
    const errorMessage = document.getElementById('error-message');
    const resultsContainer = document.getElementById('results-container');
    
    const swimmerNameEl = document.getElementById('swimmer-name');
    const swimmerIdEl = document.getElementById('swimmer-id-display');
    const totalScoreEl = document.getElementById('total-score-value');
    const strokesGrid = document.getElementById('strokes-grid');
    const template = document.getElementById('stroke-card-template');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const swimmerId = input.value.trim();
        if (!swimmerId) return;

        // Reset state
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
        swimmerIdEl.textContent = `ID: ${data.swimmer_id} | ${data.target_year} Profile`;
        
        // Animate counter
        animateValue(totalScoreEl, 0, data.total_score, 1000);
        
        data.strokes.forEach((stroke, index) => {
            const card = document.importNode(template.content, true);
            const cardRoot = card.querySelector('.stroke-card');
            
            // Add staggered animation delay
            cardRoot.style.animationDelay = `${index * 0.1}s`;
            cardRoot.classList.add('fade-in');
            
            card.querySelector('.stroke-category').textContent = stroke.category;
            card.querySelector('.stroke-points').textContent = stroke.data.points;

            if (stroke.data.points === 0) {
                card.querySelector('.stroke-details').classList.add('hidden');
                card.querySelector('.empty-state').classList.remove('hidden');
            } else {
                card.querySelector('.event-name').textContent = `${stroke.data.formatted_name} ${stroke.data.course}`;
                card.querySelector('.event-time').textContent = stroke.data.swim_time;
                card.querySelector('.event-date').textContent = stroke.data.result_date;
                card.querySelector('.event-comp').textContent = stroke.data.competition;
            }

            strokesGrid.appendChild(card);
        });

        resultsContainer.classList.remove('hidden');
    }

    function setLoading(isLoading) {
        if (isLoading) {
            submitBtn.disabled = true;
            btnText.classList.add('hidden');
            btnSpinner.style.display = 'block';
        } else {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.style.display = 'none';
        }
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // Number counting animation
    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            obj.innerHTML = Math.floor(easeProgress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end; // Ensure exact final value
            }
        };
        window.requestAnimationFrame(step);
    }
});
