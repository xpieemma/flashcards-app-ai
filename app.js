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