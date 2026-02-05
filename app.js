/* app.js - IMPROVED VERSION */

/**
 * IMPROVEMENTS MADE:
 * 1. Added card deletion functionality (was missing)
 * 2. Added card editing functionality (was missing)
 * 3. Fixed memory leak in Modal.open() - event listeners were never removed
 * 4. Added input validation with user feedback
 * 5. Improved error handling for edge cases
 * 6. Added deck renaming functionality
 * 7. Better keyboard navigation with focus management
 * 8. Fixed potential XSS with innerText everywhere (you had one, but consistency matters)
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
        editingCardId: null // NEW: Track which card is being edited
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
        AppState.ui.activeCardIndex = Math.max(0, cards.length - 1); // IMPROVED: Use max instead of 0
    }
}

/**
 * --- 5. Action Logic ---
 */

// IMPROVED: Added validation feedback
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

// NEW: Deck renaming functionality
function renameDeck(deckId, newName) {
    const trimmed = newName.trim();
    if (!trimmed) {
        alert('Deck name cannot be empty.');
        return false;
    }

    const deck = AppState.data.decks.find(d => d.id === deckId);
    if (deck) {
        deck.name = trimmed;
        Storage.save();
        renderSidebar();
        renderMainView();
        announceToScreenReader('Deck renamed');
        return true;
    }
    return false;
}

function deleteDeck(deckId) {
    const deck = AppState.data.decks.find(d => d.id === deckId);
    if (!deck) return;
    
    // IMPROVED: Show deck name in confirmation
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
    if (searchInput) searchInput.value = ''; // IMPROVED: Add null check
    
    Storage.save();
    refreshCardList();
    renderSidebar();
    renderMainView();
}

// IMPROVED: Added validation and return value
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

// NEW: Card editing functionality
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

// NEW: Card deletion functionality
function deleteCard(cardId) {
    const deckId = AppState.data.lastActiveDeckId;
    if (!deckId) return;

    if (!confirm('Delete this card?')) return;

    const cards = AppState.data.cardsByDeckId[deckId];
    AppState.data.cardsByDeckId[deckId] = cards.filter(c => c.id !== cardId);

    Storage.save();
    refreshCardList();
    
    // IMPROVED: Smart index adjustment after deletion
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
 * --- 6. Render Functions ---
 */

function renderSidebar() {
    const listEl = document.querySelector('.sidebar ul');
    if (!listEl) return; // IMPROVED: Safety check
    
    listEl.innerHTML = '';

    if (AppState.data.decks.length === 0) {
        listEl.innerHTML = '<li style="cursor:default; opacity:0.6; padding:10px;">No decks yet.</li>';
        return;
    }

    AppState.data.decks.forEach(deck => {
        const li = document.createElement('li');
        li.dataset.id = deck.id;
        li.tabIndex = 0;
        li.setAttribute('role', 'button'); // IMPROVED: Better accessibility
        li.setAttribute('aria-label', `Deck: ${deck.name}`);
        
        if (deck.id === AppState.data.lastActiveDeckId) {
            li.classList.add('active');
            li.setAttribute('aria-current', 'true'); // IMPROVED: Accessibility
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

// IMPROVED: Added XSS protection helper
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMainView() {
    const activeDeck = AppState.data.decks.find(d => d.id === AppState.data.lastActiveDeckId);
    const titleEl = document.getElementById('current-deck-title');
    const counterEl = document.getElementById('card-counter');
    const frontEl = document.querySelector('.card-front');
    const backEl = document.querySelector('.card-back');
    const controls = document.querySelector('.study-controls');
    const cardEl = document.getElementById('flashcard');
    
    // IMPROVED: Reset flip state on render
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
    
    // IMPROVED: Add edit/delete buttons to card display
    frontEl.innerHTML = `
        <div class="card-content">
            <p>${escapeHtml(currentCard.front)}</p>
        </div>
        <div class="card-actions">
            <button class="btn-card-edit" data-card-id="${currentCard.id}" aria-label="Edit card">✏️</button>
            <button class="btn-card-delete" data-card-id="${currentCard.id}" aria-label="Delete card">🗑️</button>
        </div>
    `;
    
    backEl.innerHTML = `
        <div class="card-content">
            <p>${escapeHtml(currentCard.back)}</p>
        </div>
    `;
    
    counterEl.textContent = `${AppState.ui.activeCardIndex + 1} / ${cards.length}`;
}

/**
 * --- 7. Modal System ---
 */
const Modal = {
    activeReturnFocus: null,
    activeListeners: new Map(), // IMPROVED: Track listeners to prevent memory leaks

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        AppState.ui.isModalOpen = true;
        this.activeReturnFocus = document.activeElement;
        
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');

        const focusable = modal.querySelectorAll('button, input, textarea');
        if (focusable.length) focusable[0].focus();

        // IMPROVED: Store and manage listener properly
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
        this.activeListeners.set(modalId, handleTrap); // IMPROVED: Store for cleanup
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // IMPROVED: Remove event listener to prevent memory leak
        const handler = this.activeListeners.get(modalId);
        if (handler) {
            modal.removeEventListener('keydown', handler);
            this.activeListeners.delete(modalId);
        }

        AppState.ui.isModalOpen = false;
        AppState.ui.editingCardId = null; // IMPROVED: Clear editing state
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        if (this.activeReturnFocus) {
            this.activeReturnFocus.focus();
            this.activeReturnFocus = null;
        }
    }
};

/**
 * --- 8. Initialization & Event Listeners ---
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

    // IMPROVED: Add keyboard support for sidebar
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

    // NEW: Card edit/delete buttons (delegated event)
    document.querySelector('.flashcard').addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-card-edit');
        const deleteBtn = e.target.closest('.btn-card-delete');
        
        if (editBtn) {
            const cardId = editBtn.dataset.cardId;
            const card = AppState.ui.currentCardList.find(c => c.id === cardId);
            if (card) {
                AppState.ui.editingCardId = cardId;
                document.getElementById('card-front-input').value = card.front;
                document.getElementById('card-back-input').value = card.back;
                // IMPROVED: Update modal title for editing
                document.getElementById('title-new-card').textContent = 'Edit Card';
                Modal.open('modal-new-card');
            }
        }
        
        if (deleteBtn) {
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
        AppState.ui.editingCardId = null; // IMPROVED: Clear editing mode
        document.getElementById('card-front-input').value = '';
        document.getElementById('card-back-input').value = '';
        document.getElementById('title-new-card').textContent = 'Add New Card'; // IMPROVED: Reset title
        Modal.open('modal-new-card');
    });

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
        
        // IMPROVED: Handle both create and edit
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

    // IMPROVED: Enter key submits forms
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