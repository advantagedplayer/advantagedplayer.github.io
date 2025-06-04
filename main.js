const cards = {
  'A': -1,
  '2': 1,
  '3': 1,
  '4': 1,
  '5': 1,
  '6': 1,
  '7': 0,
  '8': 0,
  '9': 0,
  '10': -1,
  'J': -1,
  'Q': -1,
  'K': -1
};

const suits = ['♠', '♥', '♦', '♣'];
let currentCards = [];
let score = 0;
let streak = 0;
let runningCount = 0;
let gameMode = 'simple';
let cardCount = 4;
let highScore = parseInt(localStorage.getItem('highScore')) || 0;

let deck = [];
let cardsDealt = 0;
const DECK_SIZE = 52;

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let correctSoundBuffer = null;
let incorrectSoundBuffer = null;

async function loadSound(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

loadSound('correct_answer.mp3').then(buffer => correctSoundBuffer = buffer);
loadSound('incorrect_answer.mp3').then(buffer => incorrectSoundBuffer = buffer);

function playSound(buffer) {
  if (!buffer || audioContext.state === 'suspended') return;
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
}

function createDealSound() {
  if (audioContext.state === 'suspended') { 
    audioContext.resume(); // Good to ensure context is running
  }
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(2000, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  
  oscillator.start();
  oscillator.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.1);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  oscillator.stop(audioContext.currentTime + 0.1);
}

function createWinSound() {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  playSound(correctSoundBuffer);
}

function createLoseSound() {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  playSound(incorrectSoundBuffer);
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId + '-screen').classList.add('active');
}

async function createDeckAndInitialShuffle() {
  deck = [];
  Object.keys(cards).forEach(rank => {
    suits.forEach(suit => {
      deck.push({ rank, suit });
    });
  });
  await shuffleDeck(); // Await the initial shuffle and its animation
}

function shuffleDeck() {
  return new Promise((resolve) => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    cardsDealt = 0;
    updateDeckStatus();
    
    const overlay = document.createElement('div');
    overlay.className = 'reshuffle-overlay';
    const text = document.createElement('div');
    text.className = 'reshuffle-text';
    text.textContent = 'Shuffling...';
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    
    setTimeout(() => {
      overlay.classList.add('active');
      setTimeout(() => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(); // Resolve promise after animation and removal
        }, 300); // Match CSS transition for fade-out
      }, 1500); // Duration shuffle text is visible
    }, 10); // Small delay for CSS transition to catch .active class
  });
}

function updateDeckStatus() {
  document.getElementById('cards-remaining').textContent = `${DECK_SIZE - cardsDealt}`;
}

async function getNextCard() {
  if (cardsDealt >= deck.length) {
    await shuffleDeck(); // Wait for shuffle animation to complete
  }
  const card = deck[cardsDealt];
  cardsDealt++;
  updateDeckStatus();
  return card;
}

async function displayCards() {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const cardsContainer = document.getElementById('cards');
  cardsContainer.innerHTML = ''; // Clear previous cards
  cardsContainer.setAttribute('data-count', cardCount);

  currentCards = []; // Reset current cards before fetching new ones
  const cardElementsToDisplay = [];

  // Fetch all card data first, awaiting shuffles if necessary
  for (let i = 0; i < cardCount; i++) {
    const cardData = await getNextCard(); // This will pause if a shuffle occurs
    currentCards.push(cardData);

    const cardElement = document.createElement('div');
    // Set base classes, animation class will be added with timeout
    cardElement.className = `card ${isRedSuit(cardData.suit) ? 'red' : ''}`;
    cardElement.textContent = `${cardData.rank}${cardData.suit}`;
    cardElement.dataset.value = cards[cardData.rank];
    
    cardElement.addEventListener('click', () => {
      cardElement.classList.add('show-value');
      setTimeout(() => {
        cardElement.classList.remove('show-value');
      }, 1000);
    });
    cardElementsToDisplay.push(cardElement);
  }
  
  // Now, display cards with staggered animation
  cardElementsToDisplay.forEach((cardElement, index) => {
    setTimeout(() => {
      cardElement.classList.add('deal-animation'); // Add animation class
      cardsContainer.appendChild(cardElement);
      createDealSound();
    }, index * 150);
  });
}

function isRedSuit(suit) {
  return suit === '♥' || suit === '♦';
}

function updateScore(correct) {
  if (correct) {
    streak++;
    score += 100 * streak;
  } else {
    streak = 0;
  }
  
  document.getElementById('score').textContent = score;
  document.getElementById('streak').textContent = streak;
}

function updateHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    document.getElementById('high-score').textContent = highScore;
  }
}

function showHint() {
  const currentCount = currentCards.reduce((sum, card) => sum + cards[card.rank], 0);
  const totalCount = gameMode === 'running' ? currentCount + runningCount : currentCount;
  
  const hintDisplay = document.createElement('div');
  hintDisplay.className = 'hint-display';
  hintDisplay.textContent = `Count: ${totalCount}`;
  document.body.appendChild(hintDisplay);
  
  streak = 0;
  document.getElementById('streak').textContent = streak;
  
  setTimeout(() => hintDisplay.classList.add('active'), 10);
  
  setTimeout(() => {
    hintDisplay.classList.remove('active');
    setTimeout(() => hintDisplay.remove(), 300); 
  }, 1500);
}

function showFeedback(isCorrect) {
  const feedbackOverlay = document.getElementById('feedback-overlay');
  const feedbackIcon = document.getElementById('feedback-icon');

  // Reset classes to ensure animation re-triggers
  feedbackOverlay.classList.remove('active');
  feedbackIcon.className = 'feedback-icon'; 
  
  feedbackIcon.textContent = isCorrect ? '✔' : '✖';

  // Force reflow to ensure animation restarts if called rapidly
  void feedbackIcon.offsetWidth; 

  feedbackIcon.classList.add(isCorrect ? 'correct' : 'incorrect');
  feedbackOverlay.classList.add('active'); // This makes the overlay visible
  
  // Overlay will be hidden by its own CSS animation or a timeout if needed
  // Currently, feedbackAnim in CSS has 'forwards', but overlay itself has a timeout
  setTimeout(() => {
    feedbackOverlay.classList.remove('active');
  }, 700); // Duration of the feedback
}

async function handleGuess(guess) {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const currentCount = currentCards.reduce((sum, card) => sum + cards[card.rank], 0);
  const correct = parseInt(guess) === (gameMode === 'running' ? currentCount + runningCount : currentCount);
  
  const clickedButton = document.querySelector(`.answers button[data-value="${guess}"]`);
  clickedButton.classList.add(correct ? 'correct' : 'incorrect');
  
  showFeedback(correct); // Start feedback animation

  if (correct) {
    createWinSound();
  } else {
    createLoseSound();
  }
  
  if (gameMode === 'running') {
    runningCount += currentCount;
    document.getElementById('running-count').textContent = runningCount;
  }
  
  updateScore(correct);
  updateHighScore();

  // Call displayCards after starting feedback. Cards will appear while feedback is active.
  // If displayCards triggers a shuffle, its animation will also run, awaited internally.
  await displayCards(); 
  
  setTimeout(() => {
    clickedButton.classList.remove('correct', 'incorrect');
  }, 500);
}

function initGame() {
  document.getElementById('high-score').textContent = highScore;

  const resumeAudio = () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    document.body.removeEventListener('click', resumeAudio);
    document.body.removeEventListener('touchstart', resumeAudio);
  };
  document.body.addEventListener('click', resumeAudio);
  document.body.addEventListener('touchstart', resumeAudio);
  
  document.querySelectorAll('[data-screen]').forEach(button => {
    button.addEventListener('click', async (e) => { // Note: make handler async if it calls async functions
      const targetButton = e.currentTarget; 
      const screen = targetButton.dataset.screen;
      const mode = targetButton.dataset.mode;
      showScreen(screen);
      if (screen === 'game' && mode) {
        await startGame(mode); // startGame is now async
      }
    });
  });

  cardCount = 2; // Default starting card count

  document.querySelectorAll('.card-count-btn').forEach(button => {
    button.addEventListener('click', async (e) => { // Make handler async
      document.querySelectorAll('.card-count-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      cardCount = parseInt(e.target.dataset.cards);
      await displayCards(); // displayCards is now async
    });
  });

  document.querySelectorAll('.answers button[data-value]').forEach(button => { // More specific selector
    button.addEventListener('click', (e) => {
      handleGuess(e.target.dataset.value); // handleGuess is async but doesn't need to be awaited here
    });
  });

  document.querySelector('.hint-button').addEventListener('click', showHint);
}

async function startGame(mode) {
  gameMode = mode;
  score = 0;
  streak = 0;
  runningCount = 0;
  
  await createDeckAndInitialShuffle(); // Creates deck and handles initial shuffle animation

  document.getElementById('score').textContent = '0';
  document.getElementById('streak').textContent = '0';
  document.getElementById('running-count').textContent = '0';
  document.getElementById('running-count-display').classList.toggle('hidden', mode === 'simple');
  
  await displayCards(); // Deals the first hand of cards
  updateHighScore();
}

document.addEventListener('DOMContentLoaded', initGame);