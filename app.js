const cardFrontEl = document.querySelector('.card-front');
const cardBackEl = document.querySelector('.card-back');
const deckTitleEl = document.querySelector('h2'); 
const flashcardEl = document.getElementById('flashcard');




const AppState = {
    decks: [
        { id: 1, name: 'JavaScript Basics', cards: [
            { id: 101, front: 'let vs var', back: 'let is block scoped, var is function scoped' },
            { id: 102, front: '=== vs ==', back: '=== checks type and value' }
        ]},
        { id: 2, name: 'CSS Grid', cards: [] }
    ],
    activeDeckId: 1,
    currentCardIndex: 0
}; // state object


function generateId() {
    return Date.now();
}

function getActiveDeck() {
    return AppState.decks.find(d => d.id === AppState.activeDeckId);
}

/* script.js - continued */

const Modal = {
    activeReturnFocus: null,

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // 1. Save current focus to restore later
        this.activeReturnFocus = document.activeElement;

        // 2. Show Modal
        modal.style.display = 'flex'; // Assuming flex centers it
        modal.setAttribute('aria-hidden', 'false');

        // 3. Find focusable elements
        const focusable = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];

        // 4. Set focus to first input or button
        if (firstFocusable) firstFocusable.focus();

        // 5. Focus Trap Listener
        modal.addEventListener('keydown', (e) => {
            const isTab = (e.key === 'Tab' || e.keyCode === 9);
            const isEsc = (e.key === 'Escape' || e.keyCode === 27);

            if (isEsc) {
                this.close(modalId);
                return;
            }

            if (!isTab) return;

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        });
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');

        // Restore focus
        if (this.activeReturnFocus) {
            this.activeReturnFocus.focus();
        }
    }
};

// Wire up global close buttons (delegated)
document.addEventListener('click', (e) => {
    if (e.target.dataset.closeModal) {
        Modal.close(e.target.closest('.modal').id);
    }
});

/* script.js */

const deckListEl = document.querySelector('.sidebar ul'); // Update selector based on your HTML

function renderSidebar() {
    deckListEl.innerHTML = '';
    
    AppState.decks.forEach(deck => {
        const li = document.createElement('li');
        li.dataset.id = deck.id;
        li.className = (deck.id === AppState.activeDeckId) ? 'active' : '';
        li.tabIndex = 0; // Make focusable
        li.innerHTML = `
            <span>${deck.name}</span>
            <span class="count">(${deck.cards.length})</span>
            <button class="btn-delete-deck" aria-label="Delete Deck" style="margin-left:auto; font-size:0.8em">🗑️</button>
        `;
        deckListEl.appendChild(li);
    });
}

// Delegated Listener for Sidebar (Switching & Deleting)
deckListEl.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    
    const deckId = parseInt(li.dataset.id);

    // Handle Delete Button
    if (e.target.classList.contains('btn-delete-deck')) {
        e.stopPropagation(); // Prevent switching
        if(confirm('Delete this deck?')) {
            AppState.decks = AppState.decks.filter(d => d.id !== deckId);
            // If we deleted active deck, switch to the first one available
            if (AppState.activeDeckId === deckId && AppState.decks.length > 0) {
                AppState.activeDeckId = AppState.decks[0].id;
            }
            renderSidebar();
        }
        return;
    }

    // Handle Switch Deck
    AppState.activeDeckId = deckId;
    AppState.currentCardIndex = 0; // Reset card position
    renderSidebar();
    renderMainView(); // Will be defined later
});