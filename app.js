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