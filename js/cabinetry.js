/**
 * Cabinet Calculator & Lead Capture Logic
 * Vanilla JavaScript ES6+ implementation focused on performance.
 * Now fetching dynamic data from Decap CMS (/content/cabinets.json) grouped by series.
 */

// 1. DYNAMIC DATA HOLDER
let cabinetModels = [];

// Helper to resolve uploaded image vs external URL
function resolveCabinetImage(item) {
    if (!item) return '/assets/img/placeholder.jpg';
    return item.image || item.image_url || '/assets/img/placeholder.jpg';
}

// 2. STATE MANAGEMENT
const state = {
    selectedCabinetId: null,
    linearFeet: 0,
    activeFilter: 'all'
};

// 3. DOM ELEMENTS
const DOM = {};

// 4. INITIALIZATION (Async)
async function init() {
    DOM.grid = document.getElementById('cabinet-grid');
    DOM.filtersContainer = document.getElementById('series-filters');
    DOM.form = document.getElementById('lead-form');
    DOM.linearFeetInput = document.getElementById('linearFeet');
    DOM.phoneInput = document.getElementById('phone');
    DOM.errorMsg = document.getElementById('form-error');
    DOM.appView = document.getElementById('calculator-app');
    DOM.successView = document.getElementById('success-screen');
    DOM.estimateResult = document.getElementById('estimate-result');
    DOM.resetBtn = document.getElementById('reset-btn');

    // 1. Fetch dynamic data from CMS JSON
    await loadCabinetsFromCMS();

    // 2. Render UI and set up events
    renderFilterButtons();
    renderCabinetGrid();
    setupEventListeners();
}

// FETCH DATA FROM DECAP CMS
async function loadCabinetsFromCMS() {
    try {
        const response = await fetch('/content/cabinets.json');
        if (!response.ok) throw new Error('Could not fetch cabinets.json');

        const data = await response.json();

        // Extrai os gabinetes das séries agrupadas mantendo o formato interno
        cabinetModels = (data.series_list || []).flatMap(seriesGroup => {
            const seriesName = seriesGroup.series_name || 'General Series';

            return (seriesGroup.cabinets || []).map(item => ({
                id: item.id && item.id.trim() !== ''
                    ? item.id
                    : item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                name: item.name,
                series: seriesName,
                pricePerFoot: Number(item.pricePerFoot) || 0,
                image: resolveCabinetImage(item),
                alt: item.alt || item.name
            }));
        });
    } catch (error) {
        console.error('Error loading cabinet models from CMS:', error);
        if (DOM.grid) {
            DOM.grid.innerHTML = '<p class="error-message">Unable to load cabinet styles. Please try again later.</p>';
        }
    }
}

// 5. RENDER FUNCTIONS
function renderFilterButtons() {
    if (!cabinetModels.length) return;

    const uniqueSeries = ['all', ...new Set(cabinetModels.map(m => m.series))];
    DOM.filtersContainer.innerHTML = '';

    uniqueSeries.forEach(seriesName => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `filter-btn ${state.activeFilter === seriesName ? 'active' : ''}`;
        button.dataset.series = seriesName;
        button.textContent = seriesName === 'all' ? 'All' : seriesName;
        DOM.filtersContainer.appendChild(button);
    });
}

function renderCabinetGrid() {
    DOM.grid.innerHTML = '';

    if (!cabinetModels.length) return;

    const fragment = document.createDocumentFragment();

    const filteredModels = state.activeFilter === 'all'
        ? cabinetModels
        : cabinetModels.filter(m => m.series === state.activeFilter);

    filteredModels.forEach(model => {
        const card = document.createElement('div');
        card.className = 'cabinet-card';
        card.setAttribute('role', 'radio');

        const isSelected = state.selectedCabinetId === model.id;
        card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        card.setAttribute('tabindex', '0');
        card.dataset.id = model.id;

        card.innerHTML = `
            <img src="${model.image}" alt="${model.alt || model.name}" class="cabinet-img" width="400" height="300" loading="lazy">
            <span class="cabinet-series">${model.series}</span>
            <h3 class="cabinet-name">${model.name}</h3>
        `;

        fragment.appendChild(card);
    });

    DOM.grid.appendChild(fragment);
}

// 6. EVENT LISTENERS
function setupEventListeners() {
    DOM.filtersContainer.addEventListener('click', handleFilterSelection);
    DOM.grid.addEventListener('click', handleCabinetSelection);

    DOM.grid.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCabinetSelection(e);
        }
    });

    DOM.phoneInput.addEventListener('input', handlePhoneMask);
    DOM.form.addEventListener('submit', handleFormSubmit);
    DOM.resetBtn.addEventListener('click', resetApp);
}

// 7. EVENT HANDLERS
function handleFilterSelection(e) {
    const button = e.target.closest('.filter-btn');
    if (!button) return;

    state.activeFilter = button.dataset.series;

    DOM.filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn === button);
    });

    renderCabinetGrid();
}

function handleCabinetSelection(e) {
    const card = e.target.closest('.cabinet-card');
    if (!card) return;

    state.selectedCabinetId = card.dataset.id;

    const allCards = DOM.grid.querySelectorAll('.cabinet-card');
    allCards.forEach(c => {
        c.setAttribute('aria-checked', c === card ? 'true' : 'false');
    });

    if (DOM.errorMsg.textContent.includes('cabinet')) {
        DOM.errorMsg.textContent = '';
    }
}

function handlePhoneMask(e) {
    let input = e.target.value.replace(/\D/g, '');
    input = input.substring(0, 10);

    if (input.length === 0) {
        e.target.value = '';
    } else if (input.length <= 3) {
        e.target.value = `(${input}`;
    } else if (input.length <= 6) {
        e.target.value = `(${input.substring(0, 3)}) ${input.substring(3)}`;
    } else {
        e.target.value = `(${input.substring(0, 3)}) ${input.substring(3, 6)}-${input.substring(6)}`;
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    DOM.errorMsg.textContent = '';

    if (!state.selectedCabinetId) {
        DOM.errorMsg.textContent = 'Please select a cabinet style first.';
        return;
    }

    if (!DOM.form.checkValidity()) {
        DOM.errorMsg.textContent = 'Please fill out all required fields correctly.';
        const inputs = DOM.form.querySelectorAll('input:invalid');
        inputs.forEach(input => input.classList.add('invalid'));

        DOM.form.addEventListener('input', function removeInvalid(ev) {
            if (ev.target.validity.valid) {
                ev.target.classList.remove('invalid');
            }
        });
        return;
    }

    const formData = new FormData(DOM.form);
    const linearFeet = parseFloat(formData.get('linearFeet'));

    if (isNaN(linearFeet) || linearFeet <= 0) {
        DOM.errorMsg.textContent = 'Please enter a valid number for linear feet.';
        return;
    }

    calculateAndShowEstimate(linearFeet);
}

// 8. LOGIC & CALCULATION
function calculateAndShowEstimate(linearFeet) {
    const selectedModel = cabinetModels.find(m => m.id === state.selectedCabinetId);
    if (!selectedModel) return;

    const baseEstimate = linearFeet * selectedModel.pricePerFoot;
    const lowerBound = Math.floor(baseEstimate * 0.9);
    const upperBound = Math.ceil(baseEstimate * 1.15);

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });

    DOM.estimateResult.innerHTML = `Your estimated project layout is between <strong>${formatter.format(lowerBound)}</strong> and <strong>${formatter.format(upperBound)}</strong> including installation.`;

    DOM.appView.classList.add('hidden');
    DOM.appView.style.display = 'none';
    DOM.successView.classList.remove('hidden');
}

function resetApp() {
    state.selectedCabinetId = null;
    state.linearFeet = 0;
    state.activeFilter = 'all';

    DOM.form.reset();
    renderFilterButtons();
    renderCabinetGrid();

    DOM.errorMsg.textContent = '';
    DOM.form.querySelectorAll('input').forEach(input => input.classList.remove('invalid'));

    DOM.successView.classList.add('hidden');
    DOM.appView.style.display = 'block';
    DOM.appView.classList.remove('hidden');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Bootstrap app
document.addEventListener('DOMContentLoaded', init);