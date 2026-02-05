/* script.js */

/**
 * --- 1. Constants & State Management ---
 */
const STORAGE_KEY = 'flashcard_app_v1';

const AppState = {
    // Persistent Data (Saved to LocalStorage)
    data: {
        decks: [], // Array<{ id, name, createdAt }>
        cardsByDeckId: {}, // Record<string, Array<{ id, front, back, updatedAt }>>
        lastActiveDeckId: null
    },
    // Session State (UI only, resets on reload)
    ui: {
        activeCardIndex: 0,
        currentCardList: [], // The subset of cards currently being viewed (filtered/shuffled)
        searchQuery: '',
        isModalOpen: false
    }
};

/**
 * --- 2. Storage Module ---
 * Handles saving and loading from browser LocalStorage
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

// Update the hidden aria-live region for screen readers
function announceToScreenReader(message) {
    const el = document.getElementById('aria-announcer');
    if (el) {
        el.textContent = message;
        setTimeout(() => { el.textContent = ''; }, 1000);
    }
}

// Debounce function for search input optimization
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * --- 4. State Helpers ---
 */

// Re-syncs the UI list (currentCardList) with the Data Source
// Handles filtering (search) and keeps the UI in sync with DB
function refreshCardList() {
    const deckId = AppState.data.lastActiveDeckId;
    
    // Safety check: if no deck selected or deck deleted
    if (!deckId || !AppState.data.cardsByDeckId[deckId]) {
        AppState.ui.currentCardList = [];
        return;
    }

    let cards = [...AppState.data.cardsByDeckId[deckId]];

    // Apply Search Filter
    if (AppState.ui.searchQuery) {
        const q = AppState.ui.searchQuery.toLowerCase();
        cards = cards.filter(c => 
            c.front.toLowerCase().includes(q) || 
            c.back.toLowerCase().includes(q)
        );
    }

    AppState.ui.currentCardList = cards;

    // Reset index if it drifted out of bounds (e.g., after deletion or filter)
    if (AppState.ui.activeCardIndex >= cards.length) {
        AppState.ui.activeCardIndex = 0;
    }
}

/**
 * --- 5. Action Logic (The "Controller") ---
 */

function createDeck(name) {
    if (!name.trim()) return;

    const newDeck = {
        id: generateId(),
        name: name.trim(),
        createdAt: Date.now()
    };

    AppState.data.decks.push(newDeck);
    AppState.data.cardsByDeckId[newDeck.id] = [];
    
    // Automatically switch to the new deck
    switchDeck(newDeck.id);
}

function deleteDeck(deckId) {
    if (!confirm('Are you sure you want to delete this deck?')) return;

    // Remove from array
    AppState.data.decks = AppState.data.decks.filter(d => d.id !== deckId);
    // Remove from map
    delete AppState.data.cardsByDeckId[deckId];

    // If we deleted the active deck, fallback to the first available one
    if (AppState.data.lastActiveDeckId === deckId) {
        AppState.data.lastActiveDeckId = AppState.data.decks.length > 0 
            ? AppState.data.decks[0].id 
            : null;
    }

    Storage.save();
    refreshCardList();
    renderSidebar();
    renderMainView();
}

function switchDeck(deckId) {
    AppState.data.lastActiveDeckId = deckId;
    AppState.ui.activeCardIndex = 0;
    AppState.ui.searchQuery = ''; // Clear search
    document.getElementById('search-input').value = '';
    
    Storage.save();
    refreshCardList();
    renderSidebar();
    renderMainView();
}

function createCard(front, back) {
    const deckId = AppState.data.lastActiveDeckId;
    if (!deckId || !front.trim() || !back.trim()) return;

    const newCard = {
        id: generateId(),
        front: front.trim(),
        back: back.trim(),
        updatedAt: Date.now()
    };

    AppState.data.cardsByDeckId[deckId].push(newCard);

    Storage.save();
    refreshCardList();
    
    // Render
    renderSidebar(); // Updates count
    renderMainView();
    announceToScreenReader('Card added');
}

function navigateCard(direction) {
    const list = AppState.ui.currentCardList;
    if (list.length === 0) return;

    // 1. Reset Flip
    const cardEl = document.getElementById('flashcard');
    cardEl.classList.remove('is-flipped');

    // 2. Wait for flip animation to reset (cleaner UX)
    setTimeout(() => {
        let newIndex = AppState.ui.activeCardIndex + direction;

        // Loop functionality
        if (newIndex >= list.length) newIndex = 0;
        if (newIndex < 0) newIndex = list.length - 1;

        AppState.ui.activeCardIndex = newIndex;
        renderMainView();
    }, 150);
}

function shuffleCards() {
    const list = AppState.ui.currentCardList;
    if (list.length < 2) return;

    // Fisher-Yates Shuffle on the UI list
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
 * --- 6. Render Functions (The "View") ---
 */

function renderSidebar() {
    const listEl = document.querySelector('.sidebar ul');
    listEl.innerHTML = '';

    if (AppState.data.decks.length === 0) {
        listEl.innerHTML = '<li style="cursor:default; opacity:0.6; padding:10px;">No decks yet.</li>';
        return;
    }

    AppState.data.decks.forEach(deck => {
        const li = document.createElement('li');
        li.dataset.id = deck.id;
        li.tabIndex = 0; // Accessible focus
        
        // Highlight active
        if (deck.id === AppState.data.lastActiveDeckId) {
            li.classList.add('active');
        }

        const count = AppState.data.cardsByDeckId[deck.id]?.length || 0;

        li.innerHTML = `
            <div style="display:flex; align-items:center; flex-grow:1;">
                <span class="deck-name">${deck.name}</span>
                <span class="count">(${count})</span>
            </div>
            <button class="btn-delete-deck" aria-label="Delete ${deck.name}">🗑️</button>
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
    
    // Case 1: No Deck Selected
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

    // Case 2: Deck Empty (or Search Empty)
    if (cards.length === 0) {
        const isSearch = !!AppState.ui.searchQuery;
        frontEl.innerHTML = isSearch 
            ? `<p>No matches for "${AppState.ui.searchQuery}"</p>`
            : '<p>This deck is empty.<br>Click <strong>+ New Card</strong> to add one.</p>';
        backEl.textContent = '';
        counterEl.textContent = '0 / 0';
        controls.style.opacity = '0.5';
        controls.style.pointerEvents = 'none';
        return;
    }

    // Case 3: Display Card
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'auto';

    const currentCard = cards[AppState.ui.activeCardIndex];
    // Use innerHTML so users can potentially use bold/italics in future (sanitization recommended for prod)
    frontEl.innerText = currentCard.front; 
    backEl.innerText = currentCard.back; 
    
    counterEl.textContent = `${AppState.ui.activeCardIndex + 1} / ${cards.length}`;
}

/**
 * --- 7. Modal System (Accessibility) ---
 */
const Modal = {
    activeReturnFocus: null,

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        AppState.ui.isModalOpen = true;
        this.activeReturnFocus = document.activeElement;
        
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

        // Focus Trap Logic
        const focusable = modal.querySelectorAll('button, input, textarea');
        if (focusable.length) focusable[0].focus();

        // One-time listener for this specific open instance
        const handleTrap = (e) => {
            if (e.key === 'Escape') this.close(modalId);
            if (e.key === 'Tab') {
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); first.focus();
                }
            }
        };
        
        modal.addEventListener('keydown', handleTrap);
        // Store listener to remove it later (simple approach for this scope)
        modal.dataset.listener = 'active'; 
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        AppState.ui.isModalOpen = false;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        if (this.activeReturnFocus) this.activeReturnFocus.focus();
    }
};

/**
 * --- 8. Initialization & Event Listeners ---
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Data
    if (Storage.load()) {
        refreshCardList();
    }
    renderSidebar();
    renderMainView();

    // 2. Sidebar Delegation (Switching & Deleting)
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

    // 3. Search Listener
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

    // 4. Modal Triggers
    document.getElementById('btn-new-deck').addEventListener('click', () => {
        document.getElementById('new-deck-name').value = '';
        Modal.open('modal-new-deck');
    });

    document.getElementById('btn-new-card').addEventListener('click', () => {
        if (!AppState.data.lastActiveDeckId) {
            alert("Please create or select a deck first.");
            return;
        }
        document.getElementById('card-front-input').value = '';
        document.getElementById('card-back-input').value = '';
        Modal.open('modal-new-card');
    });

    // 5. Save Buttons
    document.getElementById('btn-save-deck').addEventListener('click', () => {
        const name = document.getElementById('new-deck-name').value;
        createDeck(name);
        Modal.close('modal-new-deck');
    });

    document.getElementById('btn-save-card').addEventListener('click', () => {
        const front = document.getElementById('card-front-input').value;
        const back = document.getElementById('card-back-input').value;
        createCard(front, back);
        Modal.close('modal-new-card');
    });

    // 6. Global Modal Close (Cancel buttons & Overlay click)
    document.addEventListener('click', (e) => {
        if (e.target.dataset.closeModal) {
            Modal.close(e.target.closest('.modal').id);
        }
        if (e.target.classList.contains('modal')) {
            Modal.close(e.target.id);
        }
    });

    // 7. Study Controls
    document.getElementById('btn-next').addEventListener('click', () => navigateCard(1));
    document.getElementById('btn-prev').addEventListener('click', () => navigateCard(-1));
    document.getElementById('btn-flip').addEventListener('click', () => {
        document.getElementById('flashcard').classList.toggle('is-flipped');
    });
    document.getElementById('btn-shuffle').addEventListener('click', shuffleCards);

    // 8. Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ignore if modal open or typing in input
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