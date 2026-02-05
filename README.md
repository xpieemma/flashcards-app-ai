# 🎓 FlashStudy - AI-Powered Flashcard App

An intelligent flashcard study app with **AI-powered deck generation** using three free APIs. Learn through active recall with automatically generated flashcards on any topic.

## ✨ Features

### Core Functionality
- ✅ **Create, Edit, Delete** decks and flashcards
- ✅ **3D Flip Animation** for an engaging study experience
- ✅ **Search & Filter** cards within decks
- ✅ **Shuffle Mode** for randomized learning
- ✅ **Keyboard Shortcuts** for efficient navigation
- ✅ **Persistent Storage** using localStorage
- ✅ **Full Accessibility** (ARIA labels, screen reader support)
- ✅ **Dark Mode** support (auto-detects system preference)

### 🤖 AI-Powered Generation (NEW!)

#### 1. **Google Gemini AI** - Any Topic
Generate flashcards about **any subject** using Google's powerful AI:
- Photosynthesis
- French Verbs
- JavaScript Functions
- World War II
- And literally anything else!

**Setup Required:** Free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

#### 2. **Open Trivia Database** - Quiz Mode
Get multiple-choice trivia questions from curated categories:
- General Knowledge
- Science & Nature
- Computer Science
- Sports
- History

**No API key needed!** ✅

#### 3. **REST Countries API** - Geography
Learn about countries worldwide:
- World Capitals
- Population Statistics
- Currencies

**No API key needed!** ✅

## 🚀 Quick Start

### 1. Download the Files
```bash
# Clone or download these three files:
# - index.html
# - app.js
# - styles.css
```

### 2. Set Up Google Gemini API (Optional but Recommended)

The AI generation feature requires a free API key:

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Get API Key"** → **"Create API key"**
3. Copy your API key
4. Open `app.js` and find this line (around line 280):
   ```javascript
   const apiKey = 'YOUR_GEMINI_API_KEY'; // REPLACE THIS WITH YOUR KEY
   ```
5. Replace `'YOUR_GEMINI_API_KEY'` with your actual key:
   ```javascript
   const apiKey = 'AIzaSyA...your-actual-key-here';
   ```

**Note:** The other two APIs (Trivia & Geography) work immediately without any setup!

### 3. Open the App
Simply open `index.html` in any modern browser:
- Chrome, Firefox, Safari, or Edge
- No web server needed!
- Works offline (after first load)

## 📖 How to Use

### Manual Card Creation
1. Click **"+ New Deck"** in the header
2. Give your deck a name (e.g., "Spanish Vocabulary")
3. Click **"+ New Card"** to add flashcards
4. Study by clicking cards or using keyboard shortcuts

### AI Generation
1. Click **"✨ Generate"** in the header
2. Choose your generation method:
   - **AI Custom Topic**: Enter any subject and let AI create questions
   - **Trivia Quiz**: Select a category for quiz-style questions
   - **Geography**: Choose capitals, populations, or currencies
3. Click the appropriate "Generate" button
4. Your new deck appears in the sidebar automatically!

### Keyboard Shortcuts
- `Space` or `Enter` - Flip the current card
- `←` Arrow - Previous card
- `→` Arrow - Next card

## 🛠️ How It Works

### The Three APIs

#### 1. Google Gemini AI
```javascript
// Makes a POST request to Gemini's content generation endpoint
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`)
```
- **Input:** A topic (e.g., "Photosynthesis")
- **Output:** JSON array of flashcard objects
- **Cost:** FREE (with rate limits)
- **Quota:** 15 requests/minute, 1,500/day

#### 2. Open Trivia Database
```javascript
// Simple GET request, no authentication needed
fetch('https://opentdb.com/api.php?amount=10&category=18&type=multiple')
```
- **Input:** Category ID and question count
- **Output:** Multiple-choice trivia questions
- **Cost:** 100% FREE, unlimited
- **No API key required!**

#### 3. REST Countries API
```javascript
// Public API with comprehensive country data
fetch('https://restcountries.com/v3.1/all?fields=name,capital,population,currencies')
```
- **Input:** None (fetches all countries)
- **Output:** Detailed country information
- **Cost:** 100% FREE, unlimited
- **No API key required!**

### Active Recall Learning

This app implements **active recall**, the most effective study technique:

1. **Question First** - See the question before the answer
2. **Force Retrieval** - Your brain must actively recall the information
3. **Immediate Feedback** - Flip to check if you were correct
4. **Spaced Repetition** - Shuffle mode helps prevent pattern recognition

Studies show active recall is **2-3x more effective** than passive reading!

## 🏗️ Technical Implementation

### Architecture
```
AppState (Single Source of Truth)
├── data (Persisted to localStorage)
│   ├── decks[]
│   ├── cardsByDeckId{}  ← O(1) lookup!
│   └── lastActiveDeckId
└── ui (Temporary)
    ├── currentCardList[] ← For search/shuffle
    ├── activeCardIndex
    └── searchQuery
```

### Why `cardsByDeckId`?
Instead of nesting cards inside decks, we use a **key-value store**:

**Before (Slow):**
```javascript
// O(n) - Must loop through all decks to find one card
const decks = [
  { id: 1, cards: [{ id: 101, front: '...' }] }
];
```

**After (Fast):**
```javascript
// O(1) - Direct access by ID
const cardsByDeckId = {
  'deck-123': [
    { id: '101', front: 'Question', back: 'Answer' }
  ]
};
```

### Security
- **XSS Protection:** All user input is escaped via `escapeHtml()`
- **HTML Entity Decoding:** API responses are sanitized
- **No eval():** No dynamic code execution
- **CSP Compatible:** Works with Content Security Policy

### Accessibility
- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation (Tab, Enter, Escape, Arrows)
- ✅ Screen reader announcements via `aria-live`
- ✅ Focus management in modals
- ✅ High contrast mode support
- ✅ Reduced motion support

## 🎨 Customization

### Change the Theme Colors
Edit `styles.css` variables:
```css
body {
    --primary: #2563eb;        /* Brand color */
    --primary-hover: #1d4ed8;  /* Hover state */
    --bg-body: #f4f4f9;        /* Background */
    /* ... */
}
```

### Add More Trivia Categories
Open Trivia Database supports 24 categories! Edit the `<select>` in `index.html`:
```html
<option value="11">Film</option>
<option value="22">Geography</option>
<option value="27">Animals</option>
```
[Full category list](https://opentdb.com/api_category.php)

### Customize AI Prompts
Edit the prompt in `generateAIDeck()` function:
```javascript
const prompt = `Create 10 flashcards about "${topic}".
Make them suitable for university-level study.
Include technical terminology.
...`;
```

## 📊 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 90+     | ✅ Full |
| Firefox | 88+     | ✅ Full |
| Safari  | 14+     | ✅ Full |
| Edge    | 90+     | ✅ Full |

**Required Features:**
- CSS Grid
- CSS Custom Properties
- LocalStorage API
- Fetch API
- ES6+ (arrow functions, template literals)

## 🐛 Troubleshooting

### "Please add your Google Gemini API key"
- You need to replace `'YOUR_GEMINI_API_KEY'` in `app.js`
- Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Make sure there are no spaces or quotes in the key

### "Failed to generate deck: API Error: 429"
- You've hit the rate limit (15 requests/minute)
- Wait 60 seconds and try again
- Consider using Trivia or Geography instead

### "No questions available" (Trivia)
- The selected category might be temporarily unavailable
- Try a different category
- Check your internet connection

### Cards not saving
- Check if localStorage is enabled in your browser
- Private/Incognito mode may block localStorage
- Try clearing browser cache

## 📝 License

MIT License - Feel free to use this for personal or educational purposes!

## 🙏 Credits

- **Google Gemini** - AI-powered content generation
- **Open Trivia Database** - Community-curated trivia questions
- **REST Countries** - Comprehensive country data API

## 🚧 Roadmap

Future enhancements:
- [ ] Spaced repetition algorithm (SRS)
- [ ] Progress tracking & statistics
- [ ] Export/Import decks (JSON, CSV)
- [ ] Image support in flashcards
- [ ] Audio pronunciation
- [ ] Collaborative decks
- [ ] More API integrations (Wikipedia, Dictionary API)

## 💡 Development Reflections

### Where AI Saved Time

AI assistance was particularly valuable for:

**CSS Grid Layout Setup**
- AI excelled at creating the `grid-template-areas` structure
- Ensured the sidebar remained fixed while main content stayed fluid
- Handled desktop-to-mobile responsiveness efficiently
- What normally requires trial-and-error was delivered correctly on first attempt

**Boilerplate HTML**
- Generated semantic HTML with proper ARIA attributes
- Established accessible form structures
- Created modal templates with keyboard trap logic

### Bug Fixed: State Desynchronization

**Problem:** The initial nested array structure (`decks[i].cards`) caused performance issues and made card updates require O(n) loops through all decks.

**Solution:** Introduced a two-tier state architecture:

```javascript
// BEFORE: O(n) complexity - had to loop to find cards
const decks = [
  { id: 1, cards: [{ id: 101, front: '...' }] }
];

// AFTER: O(1) complexity - direct access by ID
const AppState = {
    data: {
        decks: [],                    // Array of deck metadata
        cardsByDeckId: {},            // Key-value store for O(1) lookup
        lastActiveDeckId: null
    },
    ui: {
        currentCardList: [],          // Temporary list for search/shuffle
        searchQuery: '',
        activeCardIndex: 0
    }
};
```

**Benefits:**
- ✅ O(1) card access by deck ID
- ✅ Prevents data duplication
- ✅ Clean separation between persisted data and UI state
- ✅ `refreshCardList()` bridges permanent data with temporary filters

### Accessibility Improvements

**Screen Reader Support:**
- Added `aria-live="polite"` regions for dynamic announcements
- Implemented `announceToScreenReader()` function for card actions
- Users now hear "Card added", "Deck deleted", "Found 5 cards" etc.

**Keyboard Navigation:**
- Full keyboard support (Tab, Enter, Escape, Arrow keys)
- Focus management in modals
- Visual focus indicators meeting WCAG AA standards

### Prompt Engineering Lessons

**Initial Approach (Poor Results):**
```
"Write base styles with CSS variables and responsive grid."
```
❌ Result: Monolithic code dumps, hard to understand

**Improved Approach (Great Results):**
```
"CSS grid layout: fixed-width sidebar, fluid main. 
Break it down and show why it works."
```
✅ Result: Well-commented, modular code with explanations

**Key Takeaway:** Asking AI to explain *why* something works, not just *how*, leads to better code and better learning.

### Architecture Decisions

**Why No Framework?**
- Vanilla JavaScript keeps it simple and educational
- No build step required - works immediately
- Easier to understand for learners
- Demonstrates core web platform capabilities

**Why localStorage Instead of a Database?**
- Zero backend setup required
- Works offline immediately
- Perfect for personal study tool
- Easy to understand and debug

**Why Three Different APIs?**
- Demonstrates different API patterns (AI, REST, public data)
- Provides immediate value with OR without API keys
- Shows how to handle rate limits and errors
- Educational value in comparing API designs

## 📚 Educational Value

This project demonstrates:
- **State Management:** Separation of concerns, O(1) lookups
- **Event Delegation:** Efficient DOM event handling
- **Memory Management:** Proper listener cleanup
- **Accessibility:** ARIA, keyboard nav, screen readers
- **API Integration:** Three different patterns (AI, REST, public)
- **Error Handling:** Graceful degradation
- **XSS Prevention:** Input sanitization
- **Responsive Design:** CSS Grid, mobile-first approach

---

**Made with ❤️ for effective learning through active recall**

*Built as a demonstration of vanilla JavaScript best practices, accessible design, and practical API integration.*