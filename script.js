const sudokuBoard = document.getElementById('sudoku-board').getElementsByTagName('tbody')[0];
const startButton = document.getElementById('start-game');
const pauseButton = document.getElementById('pause-game');
const challengeFriendButton = document.getElementById('challenge-friend');
const modal = document.getElementById('challenge-modal');
const closeModal = document.querySelector('.close');
const generateCodeButton = document.getElementById('generate-code');
const searchGameButton = document.getElementById('search-game');
const gameResultDiv = document.getElementById('game-result');
const startChallengedGameButton = document.getElementById('start-challenged-game');
const challengeDifficultySelect = document.getElementById('challenge-difficulty');
const searchInput = document.getElementById('search-code');
const timerDisplay = document.getElementById('timer');
const difficultySelect = document.getElementById('difficulty');

let puzzles = {}; // Hold puzzles loaded from JSON
let puzzleBackup;
let timer;
let time = 0;
let isPaused = false;
let userInputs = []; // Store user inputs when the game is paused

startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePauseResume);

// Load puzzles from external file with codes
fetch('puzzles_with_codes.json')
    .then(response => response.json())
    .then(data => {
        puzzles = data; // Load puzzles with unique codes
        renderEmptyBoard(); // Initially show an empty board
    });

// Modal logic
challengeFriendButton.addEventListener('click', () => {
    modal.style.display = "block";
});

closeModal.addEventListener('click', () => {
    modal.style.display = "none";
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// Generate game code
generateCodeButton.addEventListener('click', () => {
    const difficulty = challengeDifficultySelect.value;
    const puzzle = getRandomPuzzleWithCode(difficulty);
    puzzleBackup = puzzle.grid;
    gameResultDiv.innerText = `Generated Game Code: ${puzzle.code}`;
    startChallengedGameButton.disabled = false; // Enable start button
});

// Search for game by code
searchGameButton.addEventListener('click', () => {
    const code = searchInput.value.trim();
    const puzzle = findPuzzleByCode(code);
    if (puzzle) {
        puzzleBackup = puzzle.grid;
        gameResultDiv.innerText = `Game found! Code: ${puzzle.code}`;
        startChallengedGameButton.disabled = false; // Enable start button
    } else {
        gameResultDiv.innerText = 'Game not found';
        startChallengedGameButton.disabled = true;
    }
});

// Start game with challenged or searched puzzle
startChallengedGameButton.addEventListener('click', () => {
    modal.style.display = "none";
    renderBoard(puzzleBackup);
    resetTimer();
    startTimer();
    pauseButton.disabled = false; // Enable pause button
    pauseButton.textContent = 'Pause'; // Ensure button shows 'Pause'
});

// Utility functions
function getRandomPuzzleWithCode(difficulty) {
    const puzzleList = puzzles[difficulty];
    const randomIndex = Math.floor(Math.random() * puzzleList.length);
    return puzzleList[randomIndex];
}

function findPuzzleByCode(code) {
    for (let difficulty in puzzles) {
        const puzzle = puzzles[difficulty].find(puzzle => puzzle.code === code);
        if (puzzle) {
            return puzzle;
        }
    }
    return null;
}

// Function to render an empty board (without any numbers)
function renderEmptyBoard() {
    sudokuBoard.innerHTML = ''; // Clear previous board
    for (let i = 0; i < 9; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 9; j++) {
            let cell = document.createElement('td');
            let input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.value = ''; // No value, just an empty cell
            cell.appendChild(input);
            row.appendChild(cell);
        }
        sudokuBoard.appendChild(row);
    }
}

// Start Game
function startGame() {
    const difficulty = difficultySelect.value;
    const puzzle = getRandomPuzzle(difficulty);
    puzzleBackup = puzzle; // Backup the puzzle for resuming
    userInputs = []; // Reset user inputs when starting a new game
    renderBoard(puzzle);
    resetTimer();
    startTimer();
    pauseButton.disabled = false; // Enable pause button
    pauseButton.textContent = 'Pause'; // Ensure button shows 'Pause'
}

// Get random puzzle based on difficulty
function getRandomPuzzle(difficulty) {
    const puzzleList = puzzles[difficulty];
    const randomIndex = Math.floor(Math.random() * puzzleList.length);
    return puzzleList[randomIndex].grid;
}

// Render Sudoku Board with numbers
function renderBoard(puzzle, restoreInputs = false) {
    sudokuBoard.innerHTML = ''; // Clear previous board
    for (let i = 0; i < 9; i++) {
        let row = document.createElement('tr');
        for (let j = 0; j < 9; j++) {
            let cell = document.createElement('td');
            let input = document.createElement('input');
            input.type = 'text';
            input.maxLength = 1;
            input.value = puzzle[i][j] !== 0 ? puzzle[i][j] : ''; // Set pre-filled values
            input.disabled = puzzle[i][j] !== 0; // Disable pre-filled values

            // If resuming, restore the user inputs
            if (restoreInputs && userInputs[i] && userInputs[i][j]) {
                input.value = userInputs[i][j].value;
            }

            cell.appendChild(input);
            row.appendChild(cell);
        }
        sudokuBoard.appendChild(row);
    }
}

// Timer Functionality
function startTimer() {
    timer = setInterval(() => {
        time++;
        let minutes = Math.floor(time / 60);
        let seconds = time % 60;
        timerDisplay.textContent = `Time: ${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timer); // Stop the timer
}

function resetTimer() {
    stopTimer();
    time = 0;
    timerDisplay.textContent = 'Time: 00:00';
}

// Pause/Resume Logic
function togglePauseResume() {
    if (isPaused) {
        // Resume the game
        restoreUserInputs(); // Restore the previous inputs
        startTimer(); // Restart the timer
        pauseButton.textContent = 'Pause'; // Change button text to 'Pause'
    } else {
        // Pause the game and show an empty board
        stopTimer(); // Stop the timer
        saveUserInputs(); // Save the current inputs
        clearBoard(); // Clear the board to show an empty grid
        pauseButton.textContent = 'Resume'; // Change button text to 'Resume'
    }
    isPaused = !isPaused; // Toggle the pause state
}

// Function to clear the Sudoku board when paused
function clearBoard() {
    const inputs = sudokuBoard.querySelectorAll('input');
    inputs.forEach(input => {
        input.value = ''; // Clear the input values
    });
}

// Function to restore the user's inputs when resuming the game
function restoreUserInputs() {
    const inputs = sudokuBoard.querySelectorAll('input');
    inputs.forEach((input, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;

        // Restore the saved value for each cell
        if (userInputs[row] && userInputs[row][col]) {
            input.value = userInputs[row][col].value;
        }
    });
}

// Save the current state of the board (user inputs)
function saveUserInputs() {
    userInputs = [];
    const inputs = sudokuBoard.querySelectorAll('input');
    inputs.forEach((input, index) => {
        const row = Math.floor(index / 9);
        const col = index % 9;

        if (!userInputs[row]) {
            userInputs[row] = [];
        }

        userInputs[row][col] = {
            value: input.value
        };
    });
}