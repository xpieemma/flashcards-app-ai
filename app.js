/* app.js - ENHANCED VERSION WITH API INTEGRATIONS */

/**
 * IMPROVEMENTS MADE:
 * 1. Added card deletion functionality
 * 2. Added card editing functionality
 * 3. Fixed memory leak in Modal.open() - event listeners are now removed
 * 4. Added input validation with user feedback
 * 5. Improved error handling for edge cases
 * 6. Better keyboard navigation with focus management
 * 7. Fixed potential XSS with escapeHtml everywhere
 * 8. **NEW: Integrated 3 free APIs for flashcard generation**
 * - Google Gemini AI (for any topic)
 * - Open Trivia Database (for trivia/quiz decks)
 * - REST Countries API (for geography decks)
 */

/**
 * --- 1. Constants & State Management ---
 */
const STORAGE_KEY = 'flashcard_app_v1';

const AppState = {
    data: {
        decks: [],
        cardsByDeckId: {},
        lastActiveDeckId: null
    },
    ui: {
        activeCardIndex: 0,
        currentCardList: [],
        searchQuery: '',
        isModalOpen: false,
        editingCardId: null
    }
};

/**
 * --- 2. Storage Module ---
 */
const Storage = {
    save() {
        try {
            const serializable = {
                decks: AppState.data.decks,
                cardsByDeckId: AppState.data.cardsByDeckId,
                lastActiveDeckId: AppState.data.lastActiveDeckId
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
        } catch (e) {
            console.error('Storage failed:', e);
            alert('Could not save progress. LocalStorage might be full.');
        }
    },

    load() {
        const json = localStorage.getItem(STORAGE_KEY);
        if (!json) return false;

        try {
            const parsed = JSON.parse(json);
            if (Array.isArray(parsed.decks)) {
                AppState.data.decks = parsed.decks;
                AppState.data.cardsByDeckId = parsed.cardsByDeckId || {};
                AppState.data.lastActiveDeckId = parsed.lastActiveDeckId;
                return true;
            }
        } catch (e) {
            console.error('Corrupt save data:', e);
        }
        return false;
    }
};

/**
 * --- 3. Utilities ---
 */
function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
}

function announceToScreenReader(message) {
    const el = document.getElementById('aria-announcer');
    if (el) {
        el.textContent = message;
        setTimeout(() => { el.textContent = ''; }, 1000);
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

/**
 * --- 4. State Helpers ---
 */
function refreshCardList() {
    const deckId = AppState.data.lastActiveDeckId;
    
    if (!deckId || !AppState.data.cardsByDeckId[deckId]) {
        AppState.ui.currentCardList = [];
        return;
    }

    let cards = [...AppState.data.cardsByDeckId[deckId]];

    if (AppState.ui.searchQuery) {
        const q = AppState.ui.searchQuery.toLowerCase();
        cards = cards.filter(c => 
            c.front.toLowerCase().includes(q) || 
            c.back.toLowerCase().includes(q)
        );
    }

    AppState.ui.currentCardList = cards;

    if (AppState.ui.activeCardIndex >= cards.length) {
        AppState.ui.activeCardIndex = Math.max(0, cards.length - 1);
    }
}

/**
 * --- 5. Action Logic ---
 */

function createDeck(name) {
    const trimmed = name.trim();
    if (!trimmed) {
        alert('Deck name cannot be empty.');
        return false;
    }

    const newDeck = {
        id: generateId(),
        name: trimmed,
        createdAt: Date.now()
    };

    AppState.data.decks.push(newDeck);
    AppState.data.cardsByDeckId[newDeck.id] = [];
    
    switchDeck(newDeck.id);
    return true;
}

function deleteDeck(deckId) {
    const deck = AppState.data.decks.find(d => d.id === deckId);
    if (!deck) return;
    
    if (!confirm(`Are you sure you want to delete "${deck.name}"?`)) return;

    AppState.data.decks = AppState.data.decks.filter(d => d.id !== deckId);
    delete AppState.data.cardsByDeckId[deckId];

    if (AppState.data.lastActiveDeckId === deckId) {
        AppState.data.lastActiveDeckId = AppState.data.decks.length > 0 
            ? AppState.data.decks[0].id 
            : null;
    }

    Storage.save();
    refreshCardList();
    renderSidebar();
    renderMainView();
    announceToScreenReader('Deck deleted');
}

function switchDeck(deckId) {
    AppState.data.lastActiveDeckId = deckId;
    AppState.ui.activeCardIndex = 0;
    AppState.ui.searchQuery = '';
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    
    Storage.save();
    refreshCardList();
    renderSidebar();
    renderMainView();
}

function createCard(front, back) {
    const deckId = AppState.data.lastActiveDeckId;
    if (!deckId) {
        alert('Please select a deck first.');
        return false;
    }
    
    const frontTrimmed = front.trim();
    const backTrimmed = back.trim();
    
    if (!frontTrimmed || !backTrimmed) {
        alert('Both front and back must have content.');
        return false;
    }

    const newCard = {
        id: generateId(),
        front: frontTrimmed,
        back: backTrimmed,
        updatedAt: Date.now()
    };

    AppState.data.cardsByDeckId[deckId].push(newCard);

    Storage.save();
    refreshCardList();
    renderSidebar();
    renderMainView();
    announceToScreenReader('Card added');
    return true;
}

function updateCard(cardId, front, back) {
    const deckId = AppState.data.lastActiveDeckId;
    if (!deckId) return false;

    const frontTrimmed = front.trim();
    const backTrimmed = back.trim();
    
    if (!frontTrimmed || !backTrimmed) {
        alert('Both front and back must have content.');
        return false;
    }

    const cards = AppState.data.cardsByDeckId[deckId];
    const card = cards.find(c => c.id === cardId);
    
    if (card) {
        card.front = frontTrimmed;
        card.back = backTrimmed;
        card.updatedAt = Date.now();
        
        Storage.save();
        refreshCardList();
        renderSidebar();
        renderMainView();
        announceToScreenReader('Card updated');
        return true;
    }
    return false;
}

function deleteCard(cardId) {
    const deckId = AppState.data.lastActiveDeckId;
    if (!deckId) return;

    if (!confirm('Delete this card?')) return;

    const cards = AppState.data.cardsByDeckId[deckId];
    AppState.data.cardsByDeckId[deckId] = cards.filter(c => c.id !== cardId);

    Storage.save();
    refreshCardList();
    
    if (AppState.ui.activeCardIndex >= AppState.ui.currentCardList.length) {
        AppState.ui.activeCardIndex = Math.max(0, AppState.ui.currentCardList.length - 1);
    }
    
    renderSidebar();
    renderMainView();
    announceToScreenReader('Card deleted');
}

function navigateCard(direction) {
    const list = AppState.ui.currentCardList;
    if (list.length === 0) return;

    const cardEl = document.getElementById('flashcard');
    cardEl.classList.remove('is-flipped');

    setTimeout(() => {
        let newIndex = AppState.ui.activeCardIndex + direction;

        if (newIndex >= list.length) newIndex = 0;
        if (newIndex < 0) newIndex = list.length - 1;

        AppState.ui.activeCardIndex = newIndex;
        renderMainView();
    }, 150);
}

function shuffleCards() {
    const list = AppState.ui.currentCardList;
    if (list.length < 2) return;

    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }

    AppState.ui.activeCardIndex = 0;
    document.getElementById('flashcard').classList.remove('is-flipped');
    renderMainView();
    announceToScreenReader('Deck shuffled');
}

/**
 * --- 6. API GENERATION MODULE ---
 * Three free APIs for flashcard generation
 */

/**
 * 1. GOOGLE GEMINI AI - Generate flashcards on any topic
 * Get your free API key from: https://aistudio.google.com/app/apikey
 */
async function generateAIDeck(topic) {
    const apiKey = 'YOUR_GEMINI_API_KEY'; // REPLACE THIS WITH YOUR KEY
    
    if (apiKey === 'YOUR_GEMINI_API_KEY') {
        alert('Please add your Google Gemini API key in app.js.\nGet it free at: https://aistudio.google.com/app/apikey');
        return;
    }
    
    const btn = document.getElementById('btn-generate-ai');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Generating...';
    btn.disabled = true;

    try {
        const prompt = `Create 8 flashcards about "${topic}". 
Return ONLY a valid JSON array with no markdown formatting.
Each object must have exactly two keys: "front" (question) and "back" (answer).
Make the questions clear and educational.
Example format: [{"front": "What is...?", "back": "It is..."}]`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        let rawText = data.candidates[0].content.parts[0].text;
        
        // Clean markdown formatting if present
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const cards = JSON.parse(rawText);

        if (!Array.isArray(cards) || cards.length === 0) {
            throw new Error('Invalid response format');
        }

        // Create deck and add cards
        if (createDeck(`✨ AI: ${topic}`)) {
            cards.forEach(card => {
                if (card.front && card.back) {
                    createCard(card.front, card.back);
                }
            });
            announceToScreenReader(`Generated ${cards.length} cards about ${topic}`);
            Modal.close('modal-generate');
        }

    } catch (error) {
        console.error('AI Generation Error:', error);
        alert(`Failed to generate deck: ${error.message}\n\nCheck console for details.`);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

/**
 * 2. OPEN TRIVIA DATABASE - Generate quiz/trivia flashcards
 * No API key needed! Categories: General Knowledge, Science, Computers, etc.
 */
async function generateTriviaDeck(category = 18, count = 10) {
    const btn = document.getElementById('btn-generate-trivia');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Loading...';
    btn.disabled = true;

    try {
        // Category 18 = Computers, 17 = Science & Nature, 9 = General Knowledge
        const response = await fetch(
            `https://opentdb.com/api.php?amount=${count}&category=${category}&type=multiple`
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.response_code !== 0 || !data.results || data.results.length === 0) {
            throw new Error('No questions available');
        }

        const categoryNames = {
            9: 'General Knowledge',
            17: 'Science & Nature',
            18: 'Computer Science',
            21: 'Sports',
            23: 'History'
        };

        const deckName = `🎯 Trivia: ${categoryNames[category] || 'Mixed'}`;

        if (createDeck(deckName)) {
            data.results.forEach(item => {
                const question = decodeHtmlEntities(item.question);
                const correctAnswer = decodeHtmlEntities(item.correct_answer);
                const incorrectAnswers = item.incorrect_answers.map(a => decodeHtmlEntities(a));
                
                // Format as multiple choice
                const allAnswers = [correctAnswer, ...incorrectAnswers].sort(() => Math.random() - 0.5);
                const answerList = allAnswers.map((a, i) => `${String.fromCharCode(65 + i)}) ${a}`).join('\n');
                const correctLetter = String.fromCharCode(65 + allAnswers.indexOf(correctAnswer));
                
                const front = `${question}\n\n${answerList}`;
                const back = `${correctLetter}) ${correctAnswer}`;
                
                createCard(front, back);
            });
            announceToScreenReader(`Generated ${data.results.length} trivia questions`);
            Modal.close('modal-generate');
        }

    } catch (error) {
        console.error('Trivia Generation Error:', error);
        alert(`Failed to generate trivia deck: ${error.message}`);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

/**
 * 3. REST COUNTRIES API - Generate geography flashcards
 * No API key needed! Learn capitals, populations, currencies, etc.
 */
async function generateGeographyDeck(type = 'capitals', count = 20) {
    const btn = document.getElementById('btn-generate-geo');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Loading...';
    btn.disabled = true;

    try {
        const response = await fetch(
            'https://restcountries.com/v3.1/all?fields=name,capital,population,currencies,region,flags'
        );

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const countries = await response.json();

        // Filter out countries without the data we need
        const validCountries = countries.filter(c => {
            if (type === 'capitals') return c.capital && c.capital.length > 0;
            if (type === 'populations') return c.population > 0;
            return true;
        });

        // Shuffle and take the requested count
        const shuffled = validCountries.sort(() => Math.random() - 0.5).slice(0, count);

        const deckNames = {
            'capitals': '🌍 Geography: World Capitals',
            'populations': '🌍 Geography: Populations',
            'currencies': '🌍 Geography: Currencies'
        };

        if (createDeck(deckNames[type] || '🌍 Geography')) {
            shuffled.forEach(country => {
                const countryName = country.name.common;
                let front, back;

                switch (type) {
                    case 'capitals':
                        front = `What is the capital of ${countryName}?`;
                        back = country.capital[0];
                        break;
                    case 'populations':
                        front = `What is the approximate population of ${countryName}?`;
                        back = `${(country.population / 1000000).toFixed(1)} million`;
                        break;
                    case 'currencies':
                        const currency = Object.values(country.currencies || {})[0];
                        front = `What currency is used in ${countryName}?`;
                        back = currency ? `${currency.name} (${currency.symbol || ''})` : 'No data';
                        break;
                    default:
                        front = `Question about ${countryName}`;
                        back = 'Answer';
                }

                createCard(front, back);
            });
            announceToScreenReader(`Generated ${shuffled.length} geography questions`);
            Modal.close('modal-generate');
        }

    } catch (error) {
        console.error('Geography Generation Error:', error);
        alert(`Failed to generate geography deck: ${error.message}`);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

/**
 * --- 7. Render Functions ---
 */

function renderSidebar() {
    const listEl = document.querySelector('.sidebar ul');
    if (!listEl) return;
    
    listEl.innerHTML = '';

    if (AppState.data.decks.length === 0) {
        listEl.innerHTML = '<li style="cursor:default; opacity:0.6; padding:10px;">No decks yet.</li>';
        return;
    }

    AppState.data.decks.forEach(deck => {
        const li = document.createElement('li');
        li.dataset.id = deck.id;
        li.tabIndex = 0;
        li.setAttribute('role', 'button');
        li.setAttribute('aria-label', `Deck: ${deck.name}`);
        
        if (deck.id === AppState.data.lastActiveDeckId) {
            li.classList.add('active');
            li.setAttribute('aria-current', 'true');
        }

        const count = AppState.data.cardsByDeckId[deck.id]?.length || 0;

        li.innerHTML = `
            <div style="display:flex; align-items:center; flex-grow:1;">
                <span class="deck-name">${escapeHtml(deck.name)}</span>
                <span class="count">(${count})</span>
            </div>
            <button class="btn-delete-deck" aria-label="Delete ${escapeHtml(deck.name)}">🗑️</button>
        `;
        listEl.appendChild(li);
    });
}

function renderMainView() {
    const activeDeck = AppState.data.decks.find(d => d.id === AppState.data.lastActiveDeckId);
    const titleEl = document.getElementById('current-deck-title');
    const counterEl = document.getElementById('card-counter');
    const frontEl = document.querySelector('.card-front');
    const backEl = document.querySelector('.card-back');
    const controls = document.querySelector('.study-controls');
    const cardEl = document.getElementById('flashcard');
    
    if (cardEl) cardEl.classList.remove('is-flipped');
    
    if (!activeDeck) {
        titleEl.textContent = 'Select a Deck';
        counterEl.textContent = '';
        frontEl.innerHTML = '<p>Create a deck to get started!</p>';
        backEl.innerHTML = '';
        controls.style.opacity = '0.5';
        controls.style.pointerEvents = 'none';
        return;
    }

    titleEl.textContent = activeDeck.name;

    const cards = AppState.ui.currentCardList;

    if (cards.length === 0) {
        const isSearch = !!AppState.ui.searchQuery;
        frontEl.innerHTML = isSearch 
            ? `<p>No matches for "${escapeHtml(AppState.ui.searchQuery)}"</p>`
            : '<p>This deck is empty.<br>Click <strong>+ New Card</strong> to add one.</p>';
        backEl.textContent = '';
        counterEl.textContent = '0 / 0';
        controls.style.opacity = '0.5';
        controls.style.pointerEvents = 'none';
        return;
    }

    controls.style.opacity = '1';
    controls.style.pointerEvents = 'auto';

    const currentCard = cards[AppState.ui.activeCardIndex];
    
    frontEl.innerHTML = `
        <div class="card-content">
            <p style="white-space: pre-wrap;">${escapeHtml(currentCard.front)}</p>
        </div>
        <div class="card-actions">
            <button class="btn-card-edit" data-card-id="${currentCard.id}" aria-label="Edit card">✏️</button>
            <button class="btn-card-delete" data-card-id="${currentCard.id}" aria-label="Delete card">🗑️</button>
        </div>
    `;
    
    backEl.innerHTML = `
        <div class="card-content">
            <p style="white-space: pre-wrap;">${escapeHtml(currentCard.back)}</p>
        </div>
    `;
    
    counterEl.textContent = `${AppState.ui.activeCardIndex + 1} / ${cards.length}`;
}

/**
 * --- 8. Modal System ---
 */
const Modal = {
    activeReturnFocus: null,
    activeListeners: new Map(),

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        AppState.ui.isModalOpen = true;
        this.activeReturnFocus = document.activeElement;
        
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

        const focusable = modal.querySelectorAll('button, input, textarea, select');
        if (focusable.length) focusable[0].focus();

        const handleTrap = (e) => {
            if (e.key === 'Escape') this.close(modalId);
            if (e.key === 'Tab') {
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault(); 
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); 
                    first.focus();
                }
            }
        };
        
        modal.addEventListener('keydown', handleTrap);
        this.activeListeners.set(modalId, handleTrap);
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const handler = this.activeListeners.get(modalId);
        if (handler) {
            modal.removeEventListener('keydown', handler);
            this.activeListeners.delete(modalId);
        }

        AppState.ui.isModalOpen = false;
        AppState.ui.editingCardId = null;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        if (this.activeReturnFocus) {
            this.activeReturnFocus.focus();
            this.activeReturnFocus = null;
        }
    }
};

/**
 * --- 9. Initialization & Event Listeners ---
 */

document.addEventListener('DOMContentLoaded', () => {
    if (Storage.load()) {
        refreshCardList();
    }
    renderSidebar();
    renderMainView();

    // Sidebar: Switch & Delete decks
    document.querySelector('.sidebar ul').addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete-deck');
        const deckItem = e.target.closest('li');

        if (deleteBtn && deckItem) {
            e.stopPropagation();
            deleteDeck(deckItem.dataset.id);
            return;
        }

        if (deckItem) {
            switchDeck(deckItem.dataset.id);
        }
    });

    document.querySelector('.sidebar ul').addEventListener('keydown', (e) => {
        const deckItem = e.target.closest('li');
        if (deckItem && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            switchDeck(deckItem.dataset.id);
        }
    });

    // Search
    const handleSearch = debounce((e) => {
        AppState.ui.searchQuery = e.target.value.trim();
        AppState.ui.activeCardIndex = 0;
        refreshCardList();
        renderMainView();
        
        if (AppState.ui.searchQuery) {
            announceToScreenReader(`Found ${AppState.ui.currentCardList.length} cards`);
        }
    }, 300);
    
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // Card edit/delete buttons
    document.querySelector('.flashcard').addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-card-edit');
        const deleteBtn = e.target.closest('.btn-card-delete');
        
        if (editBtn) {
            e.stopPropagation();
            const cardId = editBtn.dataset.cardId;
            const card = AppState.ui.currentCardList.find(c => c.id === cardId);
            if (card) {
                AppState.ui.editingCardId = cardId;
                document.getElementById('card-front-input').value = card.front;
                document.getElementById('card-back-input').value = card.back;
                document.getElementById('title-new-card').textContent = 'Edit Card';
                Modal.open('modal-new-card');
            }
        }
        
        if (deleteBtn) {
            e.stopPropagation();
            const cardId = deleteBtn.dataset.cardId;
            deleteCard(cardId);
        }
    });

    // Modal Triggers
    document.getElementById('btn-new-deck').addEventListener('click', () => {
        document.getElementById('new-deck-name').value = '';
        Modal.open('modal-new-deck');
    });

    document.getElementById('btn-new-card').addEventListener('click', () => {
        if (!AppState.data.lastActiveDeckId) {
            alert("Please create or select a deck first.");
            return;
        }
        AppState.ui.editingCardId = null;
        document.getElementById('card-front-input').value = '';
        document.getElementById('card-back-input').value = '';
        document.getElementById('title-new-card').textContent = 'Add New Card';
        Modal.open('modal-new-card');
    });

    // NEW: Generate Deck Modal Trigger
    const btnOpenGenerate = document.getElementById('btn-open-generate');
    if (btnOpenGenerate) {
        btnOpenGenerate.addEventListener('click', () => {
            Modal.open('modal-generate');
        });
    }

    // NEW: API Generation Buttons
    const btnGenerateAI = document.getElementById('btn-generate-ai');
    if (btnGenerateAI) {
        btnGenerateAI.addEventListener('click', () => {
            const topic = document.getElementById('gen-topic').value.trim();
            if (!topic) {
                alert('Please enter a topic');
                return;
            }
            generateAIDeck(topic);
        });
    }

    const btnGenerateTrivia = document.getElementById('btn-generate-trivia');
    if (btnGenerateTrivia) {
        btnGenerateTrivia.addEventListener('click', () => {
            const category = document.getElementById('trivia-category').value;
            generateTriviaDeck(parseInt(category), 10);
        });
    }

    const btnGenerateGeo = document.getElementById('btn-generate-geo');
    if (btnGenerateGeo) {
        btnGenerateGeo.addEventListener('click', () => {
            const type = document.getElementById('geo-type').value;
            generateGeographyDeck(type, 15);
        });
    }

    // Save Buttons
    document.getElementById('btn-save-deck').addEventListener('click', () => {
        const name = document.getElementById('new-deck-name').value;
        if (createDeck(name)) {
            Modal.close('modal-new-deck');
        }
    });

    document.getElementById('btn-save-card').addEventListener('click', () => {
        const front = document.getElementById('card-front-input').value;
        const back = document.getElementById('card-back-input').value;
        
        let success;
        if (AppState.ui.editingCardId) {
            success = updateCard(AppState.ui.editingCardId, front, back);
        } else {
            success = createCard(front, back);
        }
        
        if (success) {
            Modal.close('modal-new-card');
        }
    });

    document.getElementById('new-deck-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-save-deck').click();
        }
    });

    // Global Modal Close
    document.addEventListener('click', (e) => {
        if (e.target.dataset.closeModal) {
            Modal.close(e.target.closest('.modal').id);
        }
        if (e.target.classList.contains('modal')) {
            Modal.close(e.target.id);
        }
    });

    // Study Controls
    document.getElementById('btn-next').addEventListener('click', () => navigateCard(1));
    document.getElementById('btn-prev').addEventListener('click', () => navigateCard(-1));
    document.getElementById('btn-flip').addEventListener('click', () => {
        document.getElementById('flashcard').classList.toggle('is-flipped');
    });
    document.getElementById('btn-shuffle').addEventListener('click', shuffleCards);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        if (AppState.ui.isModalOpen || 
            ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }

        switch (e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                document.getElementById('flashcard').classList.toggle('is-flipped');
                break;
            case 'ArrowRight':
                navigateCard(1);
                break;
            case 'ArrowLeft':
                navigateCard(-1);
                break;
        }
    });
});