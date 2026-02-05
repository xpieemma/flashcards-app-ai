# flashcards-app-ai

### Where AI saved time

AI helped to save time with the CSS Grid layout setup and Boilerplate HTML. AI did a great job with grid-template-areas, ensuring the sidebar remained fixed while the main content was fluid—a process that usually takes trial and error. It provided an app-layout that handled desktop-to-mobile responsiveness in record time.

### Bug Fixed: State Desynchronization
State desynchronization was causing an issue. AI initially suggested a simple nested array structure: decks[i].cards. AppState.ui.currentCardList was introduced, then refreshCardList() was used to bridge permanent data, apply search filters, and save data temporarily to the UI array.

Refactoring Code (Clarity & Performance)
This allowed us to move from O(n) to O(1) complexity and prevented data duplication.

Before:

JavaScript
// Hard to update a specific card without looping through everything
const decks = [
  { id: 1, cards: [{ id: 101, front: '...' }] }
];
After:

JavaScript
const AppState = {
    // Distinct separation between what is saved to DB and what is just for the UI
    data: {
        decks: [], 
        cardsByDeckId: {}, // Key-Value store for O(1) access
        lastActiveDeckId: null
    },
    ui: {
        currentCardList: [], // Temporary list for shuffling/searching
        searchQuery: ''
    }
};

### Accessibility Improvement
There were some areas where screen reader users would be left in silence. Therefore, text injection into aria-live="polite" was important.

### Prompt Engineering
Prompt 1: "Write base styles with CSS variables and responsive grid." Improved Prompt: "CSS grid layout: fixed-width sidebar, fluid main. Break it down and show why it works." Result: AI stopped dumping monolithic blocks of code.