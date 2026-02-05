

const STORAGE_KEY = 'flashcard_app_final';

const GEMINI_API_KEY = 'AIzaSyCGwwByWY_cc2yPOWJA5hyoo_SxaMlFH-s'; 

const AppState = {
    data: {
        decks: [], 
        cardsByDeckId: {},
        lastActiveDeckId: null,
        theme: 'light'
    },
    ui: {
        activeCardIndex: 0,
        currentCardList: [],
        searchQuery: '',
        isModalOpen: false,
        editingCardId: null
    }
};

/** --- 1. Storage & Theme Engine --- */
const Storage = {
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.data));
        } catch (e) { alert('Storage full. Please delete some decks.'); }
    },
    load() {
        const json = localStorage.getItem(STORAGE_KEY);
        if (json) {
            const parsed = JSON.parse(json);
            if (Array.isArray(parsed.decks)) AppState.data = parsed;
        }
    }
};

const Theme = {
    init() {
        if (!localStorage.getItem(STORAGE_KEY)) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            AppState.data.theme = prefersDark ? 'dark' : 'light';
        }
        this.apply(AppState.data.theme);
    },
    toggle() {
        AppState.data.theme = AppState.data.theme === 'light' ? 'dark' : 'light';
        this.apply(AppState.data.theme);
        Storage.save();
    },
    apply(mode) {
        document.body.setAttribute('data-theme', mode);
        const btn = document.getElementById('btn-theme-toggle');
        if(btn) btn.textContent = mode === 'dark' ? '☀️' : '🌙';
    }
};

/** --- 2. Memory Engine (Leitner SRS) --- */
const Scheduler = {
    intervals: [1, 3, 7, 14, 30], // Days
    calculate(card, rating) {
        let box = card.box || 0;
        if (rating === 'again') box = 0;
        else if (rating === 'good') box = Math.min(box + 1, this.intervals.length - 1);
        else if (rating === 'easy') box = Math.min(box + 2, this.intervals.length - 1);

        return {
            box,
            nextReview: Date.now() + (this.intervals[box] * 24 * 60 * 60 * 1000)
        };
    }
};

/** --- 3. Core Logic --- */
function refreshCardList() {
    const deckId = AppState.data.lastActiveDeckId;
    if (!deckId || !AppState.data.cardsByDeckId[deckId]) {
        AppState.ui.currentCardList = [];
        return;
    }
    
    let cards = [...AppState.data.cardsByDeckId[deckId]];
    
    if (AppState.ui.searchQuery) {
        if (AppState.ui.searchQuery === '__DUE__') {
            const now = Date.now();
            cards = cards.filter(c => !c.nextReview || c.nextReview <= now);
        } else {
            const q = AppState.ui.searchQuery.toLowerCase();
            cards = cards.filter(c => c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q));
        }
    }
    
    AppState.ui.currentCardList = cards;
    if (AppState.ui.activeCardIndex >= cards.length) AppState.ui.activeCardIndex = 0;
}

function createDeck(name) {
    if (!name.trim()) return false;
    const id = crypto.randomUUID();
    AppState.data.decks.push({ id, name: name.trim(), createdAt: Date.now() });
    AppState.data.cardsByDeckId[id] = [];
    switchDeck(id);
    return true;
}

function switchDeck(id) {
    AppState.data.lastActiveDeckId = id;
    AppState.ui.activeCardIndex = 0;
    AppState.ui.searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.value = '';
    Storage.save();
    refreshCardList();
    renderAll();
}

function createCard(front, back) {
    const deckId = AppState.data.lastActiveDeckId;
    if (!deckId) return alert('Select a deck first.');
    const card = { id: crypto.randomUUID(), front, back, box: 0, nextReview: null };
    AppState.data.cardsByDeckId[deckId].push(card);
    Storage.save();
    refreshCardList();
    renderAll();
    announce('Card Added');
    return true;
}

function updateCard(id, front, back) {
    const deckId = AppState.data.lastActiveDeckId;
    const card = AppState.data.cardsByDeckId[deckId].find(c => c.id === id);
    if (card) {
        card.front = front; card.back = back;
        Storage.save(); refreshCardList(); renderAll(); announce('Card Updated');
        return true;
    }
}

function deleteCard(id) {
    if(!confirm('Delete this card?')) return;
    const deckId = AppState.data.lastActiveDeckId;
    AppState.data.cardsByDeckId[deckId] = AppState.data.cardsByDeckId[deckId].filter(c => c.id !== id);
    Storage.save(); refreshCardList(); renderAll(); announce('Card Deleted');
}

function deleteDeck(id) {
    if(!confirm('Delete this deck?')) return;
    AppState.data.decks = AppState.data.decks.filter(d => d.id !== id);
    delete AppState.data.cardsByDeckId[id];
    if (AppState.data.lastActiveDeckId === id) AppState.data.lastActiveDeckId = null;
    Storage.save(); refreshCardList(); renderAll(); announce('Deck Deleted');
}

/** --- 4. Render Engine --- */
function renderAll() { renderSidebar(); renderMain(); }

function renderSidebar() {
    const list = document.querySelector('.sidebar ul');
    if(!list) return;
    list.innerHTML = '';
    AppState.data.decks.forEach(deck => {
        const li = document.createElement('li');
        if (deck.id === AppState.data.lastActiveDeckId) li.classList.add('active');
        
        const cards = AppState.data.cardsByDeckId[deck.id] || [];
        const dueCount = cards.filter(c => !c.nextReview || c.nextReview <= Date.now()).length;
        const badge = dueCount > 0 ? `<span style="background:var(--danger); color:white; padding:2px 6px; border-radius:10px; font-size:0.7em; margin-left:5px;">${dueCount}</span>` : '';

        li.innerHTML = `<span>${escapeHtml(deck.name)} (${cards.length}) ${badge}</span>
                        <button class="btn-delete-deck" onclick="event.stopPropagation(); deleteDeck('${deck.id}')">🗑️</button>`;
        li.onclick = () => switchDeck(deck.id);
        list.appendChild(li);
    });
}

function renderMain() {
    const deck = AppState.data.decks.find(d => d.id === AppState.data.lastActiveDeckId);
    const title = document.getElementById('current-deck-title');
    const frontEl = document.querySelector('.card-front');
    const backEl = document.querySelector('.card-back');
    const cardEl = document.getElementById('flashcard');
    
    if(cardEl) cardEl.classList.remove('is-flipped');
    
    if (!deck) {
        if(title) title.textContent = 'Select a Deck';
        if(frontEl) frontEl.innerHTML = '<p class="placeholder-text">Create or select a deck to begin.</p>';
        if(backEl) backEl.textContent = '';
        return;
    }
    
    if(title) title.textContent = deck.name;
    const cards = AppState.ui.currentCardList;
    
    if (cards.length === 0) {
        if(frontEl) frontEl.innerHTML = AppState.ui.searchQuery === '__DUE__' 
            ? '<p class="placeholder-text">🎉 You are all caught up!</p>'
            : '<p class="placeholder-text">This deck is empty.</p>';
        if(backEl) backEl.textContent = '';
        return;
    }

    const card = cards[AppState.ui.activeCardIndex];
    const counter = document.getElementById('card-counter');
    if(counter) counter.textContent = `${AppState.ui.activeCardIndex + 1} / ${cards.length}`;

    // Render Front (Matches new CSS)
    if(frontEl) frontEl.innerHTML = `
        <div class="card-content">${escapeHtml(card.front)}</div>
        <div class="card-actions-mini">
            <button class="btn-mini" onclick="event.stopPropagation(); editCard('${card.id}')">✏️</button>
            <button class="btn-mini" onclick="event.stopPropagation(); deleteCard('${card.id}')">🗑️</button>
        </div>`;

    // Render Back (With SRS Buttons)
    if(backEl) backEl.innerHTML = `
        <div class="card-content">${escapeHtml(card.back)}</div>
        <div class="srs-actions" onclick="event.stopPropagation()">
            <button class="btn-srs btn-again" onclick="rateCard('${card.id}', 'again')">Again</button>
            <button class="btn-srs btn-good" onclick="rateCard('${card.id}', 'good')">Good</button>
            <button class="btn-srs btn-easy" onclick="rateCard('${card.id}', 'easy')">Easy</button>
        </div>`;
}

/** --- 5. Generators --- */
const Generators = {
    async ai(topic) {
        if (!topic) return alert('Enter topic');
        const btn = document.getElementById('btn-generate-ai');
        const originalText = btn.textContent;
        btn.textContent = 'Generating...'; 
        btn.disabled = true;
        
        try {
            // Check for placeholder key
            if (GEMINI_API_KEY.includes('YOUR_GEMINI')) throw new Error('Invalid API Key. Edit app.js line 7.');

            const prompt = `Create 7 flashcards about "${topic}". Return strictly a JSON array of objects. Each object must have "front" and "back" keys. No markdown.`;
            
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!res.ok) throw new Error(`API Error: ${res.status}`);

            const data = await res.json();
            const rawText = data.candidates[0].content.parts[0].text;
            
            // --- ROBUST PARSING FIX ---
            // Find the first '[' and the last ']' to extract purely the JSON array
            const jsonStartIndex = rawText.indexOf('[');
            const jsonEndIndex = rawText.lastIndexOf(']') + 1;
            
            if (jsonStartIndex === -1 || jsonEndIndex === 0) {
                throw new Error("AI did not return a valid JSON array.");
            }

            const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex);
            const cards = JSON.parse(jsonString);
            
            if (createDeck(`✨ ${topic}`)) {
                cards.forEach(c => createCard(c.front, c.back));
                Modal.close('modal-generate');
                announce('AI Deck Generated');
            }
        } catch(e) { 
            console.error(e);
            alert(`Generation Failed: ${e.message}`); 
        } finally { 
            btn.textContent = originalText; 
            btn.disabled = false; 
        }
    },

    async trivia(cat) {
        const btn = document.getElementById('btn-generate-trivia');
        const original = btn.textContent;
        btn.textContent = 'Loading...'; btn.disabled = true;
        try {
            const res = await fetch(`https://opentdb.com/api.php?amount=10&category=${cat}&type=boolean`);
            const data = await res.json();
            if (createDeck('🎯 Trivia')) {
                data.results.forEach(q => createCard(decodeHtml(q.question), q.correct_answer));
                Modal.close('modal-generate');
                announce('Trivia Deck Generated');
            }
        } catch(e) { alert('Trivia API Error'); }
        finally { btn.textContent = original; btn.disabled = false; }
    },

    async geo(type) {
        const btn = document.getElementById('btn-generate-geo');
        const original = btn.textContent;
        btn.textContent = 'Loading...'; btn.disabled = true;
        try {
            const res = await fetch('[https://restcountries.com/v3.1/all?fields=name,capital,population](https://restcountries.com/v3.1/all?fields=name,capital,population)');
            const data = await res.json();
            const name = type === 'capitals' ? '🌍 Capitals' : '🌍 Populations';
            if (createDeck(name)) {
                data.sort(() => 0.5 - Math.random()).slice(0, 10).forEach(c => {
                    const f = type === 'capitals' ? c.name.common : `Population of ${c.name.common}?`;
                    const b = type === 'capitals' ? (c.capital?.[0] || 'N/A') : (c.population/1e6).toFixed(1) + 'M';
                    createCard(f, b);
                });
                Modal.close('modal-generate');
                announce('Geography Deck Generated');
            }
        } catch(e) { alert('Geography API Error'); }
        finally { btn.textContent = original; btn.disabled = false; }
    }
};

/** --- 6. Utilities --- */
function escapeHtml(str) { return str ? str.replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; }
function decodeHtml(html) { const txt = document.createElement("textarea"); txt.innerHTML = html; return txt.value; }
function announce(msg) { 
    const el = document.getElementById('aria-announcer');
    if(el) el.textContent = msg; 
}

// Global actions
window.rateCard = (id, rating) => {
    const deckId = AppState.data.lastActiveDeckId;
    const card = AppState.data.cardsByDeckId[deckId].find(c => c.id === id);
    if(card) {
        const res = Scheduler.calculate(card, rating);
        card.box = res.box; card.nextReview = res.nextReview;
        Storage.save();
        let next = AppState.ui.activeCardIndex + 1;
        if(next >= AppState.ui.currentCardList.length) next = 0;
        AppState.ui.activeCardIndex = next;
        const el = document.getElementById('flashcard');
        if(el) el.classList.remove('is-flipped');
        setTimeout(renderMain, 300);
        announce(`Rated ${rating}`);
    }
};

window.deleteDeck = deleteDeck;
window.deleteCard = deleteCard;
window.editCard = (id) => {
    AppState.ui.editingCardId = id;
    const card = AppState.ui.currentCardList.find(c => c.id === id);
    if(card) {
        document.getElementById('card-front-input').value = card.front;
        document.getElementById('card-back-input').value = card.back;
        document.getElementById('title-new-card').textContent = 'Edit Card';
        Modal.open('modal-new-card');
    }
};

/** --- 7. Initialization --- */
const Modal = {
    open(id) { document.getElementById(id).style.display = 'flex'; },
    close(id) { document.getElementById(id).style.display = 'none'; }
};

document.addEventListener('DOMContentLoaded', () => {
    Storage.load();
    Theme.init();
    refreshCardList();
    renderAll();

    // Listeners
    const bind = (id, event, fn) => { const el = document.getElementById(id); if(el) el.addEventListener(event, fn); };

    bind('btn-theme-toggle', 'click', () => Theme.toggle());
    bind('btn-new-deck', 'click', () => Modal.open('modal-new-deck'));
    bind('btn-save-deck', 'click', () => { if(createDeck(document.getElementById('new-deck-name').value)) Modal.close('modal-new-deck'); });
    
    bind('btn-new-card', 'click', () => {
        AppState.ui.editingCardId = null;
        document.getElementById('card-front-input').value = '';
        document.getElementById('card-back-input').value = '';
        document.getElementById('title-new-card').textContent = 'Add Card';
        Modal.open('modal-new-card');
    });
    
    bind('btn-save-card', 'click', () => {
        const f = document.getElementById('card-front-input').value;
        const b = document.getElementById('card-back-input').value;
        if(AppState.ui.editingCardId) updateCard(AppState.ui.editingCardId, f, b);
        else createCard(f, b);
        Modal.close('modal-new-card');
    });

    const cardEl = document.getElementById('flashcard');
    if(cardEl) cardEl.onclick = (e) => {
        if(!e.target.closest('button')) cardEl.classList.toggle('is-flipped');
    };

    bind('btn-flip', 'click', () => cardEl.classList.toggle('is-flipped'));
    bind('btn-next', 'click', () => {
        AppState.ui.activeCardIndex = (AppState.ui.activeCardIndex + 1) % AppState.ui.currentCardList.length;
        renderMain();
    });
    bind('btn-prev', 'click', () => {
        const len = AppState.ui.currentCardList.length;
        AppState.ui.activeCardIndex = (AppState.ui.activeCardIndex - 1 + len) % len;
        renderMain();
    });

    // Generators
    bind('btn-open-generate', 'click', () => Modal.open('modal-generate'));
    bind('btn-generate-ai', 'click', () => Generators.ai(document.getElementById('gen-topic').value));
    bind('btn-generate-trivia', 'click', () => Generators.trivia(document.getElementById('trivia-category').value));
    bind('btn-generate-geo', 'click', () => Generators.geo(document.getElementById('geo-type').value));
    
    // Filters
    bind('btn-filter-due', 'click', () => {
        AppState.ui.searchQuery = AppState.ui.searchQuery === '__DUE__' ? '' : '__DUE__';
        refreshCardList(); renderMain();
    });
    bind('search-input', 'input', (e) => {
        AppState.ui.searchQuery = e.target.value.trim();
        refreshCardList(); renderMain();
    });

    window.onclick = (e) => { if(e.target.classList.contains('modal')) e.target.style.display = 'none'; };
    document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = (e) => e.target.closest('.modal').style.display = 'none');
    
    document.addEventListener('keydown', (e) => {
        if(AppState.ui.isModalOpen) return;
        if(e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if(cardEl) cardEl.classList.toggle('is-flipped'); }
        if(e.key === 'ArrowRight') document.getElementById('btn-next').click();
        if(e.key === 'ArrowLeft') document.getElementById('btn-prev').click();
    });
});