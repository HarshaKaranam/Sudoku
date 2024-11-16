const sudokuBoard = document.getElementById('sudoku-board');
const startButton = document.getElementById('start-game');
const pauseButton = document.getElementById('pause-game');
const notesToggleButton = document.getElementById('notes-toggle');
const notesStatusText = document.querySelector('#notes-toggle .notes-status');
const timerDisplay = document.getElementById('timer');
const difficultySelect = document.getElementById('difficulty');
const eraseButton = document.getElementById('erase-button');
const paintButton = document.getElementById('paint-button');
const colorPalette = document.getElementById('color-palette');


let puzzles = {};
let currentSolution = [];
let puzzleBackup;
let userInputs = []; // Store user inputs when the game is paused
let timer;
let time = 0;
let isPaused = false;
let isNotesMode = false;
let selectedCell = null;
let selectedColor = '#9d9d9d'; // Default color for notes

// Load puzzles from sudoku_puzzles.json
fetch('puzzles_with_codes.json')
    .then(response => response.json())
    .then(data => {
        puzzles = data;
        renderEmptyBoard();
    });


// Toggle Notes mode on and off
notesToggleButton.addEventListener('click', () => {
    isNotesMode = !isNotesMode;
    notesToggleButton.classList.toggle('active', isNotesMode);
    notesStatusText.textContent = isNotesMode ? 'ON' : 'OFF'; // Update the text based on Notes mode
});

// Function to handle cell selection and highlighting
function addCellSelectionListeners() {
    const cells = sudokuBoard.getElementsByClassName('cell');
    for (let cell of cells) {
        cell.addEventListener('click', () => {
            clearHighlights();
            if (selectedCell) {
                selectedCell.classList.remove('selected');
            }
            selectedCell = cell;
            selectedCell.classList.add('selected');
            const cellValue = cell.textContent.trim();
            if (cellValue) {
                highlightMatchingNumbers(cellValue);
            }
        });
    }
}


// Highlight all cells containing the same number as the selected cell
function highlightMatchingNumbers(value) {
    clearHighlights();
    if (!value) return;
    const cells = sudokuBoard.getElementsByClassName('cell');
    for (let cell of cells) {
        if (cell.textContent.trim() === value && cell !== selectedCell) {
            cell.classList.add('highlight');
        }
        // Highlight matching notes in note-mode cells
        if (cell.classList.contains('note-mode')) {
            const notes = cell.querySelectorAll(`.note-${value}`);
            notes.forEach(note => {
                note.classList.add('highlight-note'); // Add highlight class to matching notes
            });
        }
    }
}

// Clear highlights from all cells
function clearHighlights() {
    const cells = sudokuBoard.getElementsByClassName('highlight');
    while (cells.length) {
        cells[0].classList.remove('highlight');
    }
    // Clear highlighted notes in note-mode cells
    const highlightedNotes = sudokuBoard.getElementsByClassName('highlight-note');
    while (highlightedNotes.length) {
        highlightedNotes[0].classList.remove('highlight-note');
    }
}

// Event listener for number pad clicks
document.getElementById('number-pad').addEventListener('click', (event) => {
    if (!selectedCell && event.target.classList.contains('number-btn')) {
        const number = event.target.getAttribute('data-value');
        highlightMatchingNumbers(number);
    } else if (selectedCell && event.target.classList.contains('number-btn')) {
        const number = event.target.getAttribute('data-value');
        updateCellValue(number);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.code === "Space") {
        isNotesMode = !isNotesMode;
        notesToggleButton.classList.toggle('active', isNotesMode);
        notesStatusText.textContent = isNotesMode ? 'ON' : 'OFF';
    }
});

// Event listener for keyboard number input
document.addEventListener('keydown', (event) => {
    if (!selectedCell && event.key >= '1' && event.key <= '9') {
        highlightMatchingNumbers(event.key);
    } else if (selectedCell && event.key >= '1' && event.key <= '9') {
        updateCellValue(event.key);
    } else if (event.key === 'Delete' && selectedCell && !selectedCell.dataset.prefilled) {
        selectedCell.textContent = ''; // Clear the cell's content
        selectedCell.classList.remove('user-entered'); // Remove user-entered style
    }
});

// Update cell value in regular or Notes mode
function updateCellValue(value) {
    if (!selectedCell.dataset.prefilled) {
        if (isNotesMode) {
            toggleNoteInCell(selectedCell, value); // Toggle note in Notes mode
        } else {
            toggleRegularInput(selectedCell, value); // Handle regular input
            checkForCompletion();
        }
    }
}

// Toggle regular input: Adds or removes the value in the cell
function toggleRegularInput(cell, value) {
    if (cell.classList.contains('note-mode')) {
        // If the cell is in Notes mode, clear notes and switch to regular mode
        cell.classList.remove('note-mode');
        cell.innerHTML = '';
    }

    if (cell.textContent === value) {
        // If the same value exists, clear it
        cell.textContent = '';
        cell.classList.remove('user-entered');
    } else {
        // Otherwise, set the new value
        cell.textContent = value;
        cell.classList.add('user-entered');
        removeNotesFromRelatedCells(cell, value);
    }
    userInputs[cell.dataset.row][cell.dataset.col] = cell.textContent;
    clearHighlights();
    highlightMatchingNumbers(cell.textContent);
}

// Function to check if the board is complete and matches the solution
function checkForCompletion() {
    const cells = document.querySelectorAll('.cell');
    const currentBoard = Array.from({ length: 9 }, () => Array(9).fill(0));

    // Fill the currentBoard array with the values from the Sudoku board
    cells.forEach((cell) => {
        const row = parseInt(cell.dataset.row, 10);
        const col = parseInt(cell.dataset.col, 10);
        currentBoard[row][col] = cell.textContent ? parseInt(cell.textContent, 10) : 0;
    });

    // Check if all cells are filled
    const isBoardComplete = currentBoard.flat().every(value => value !== 0);

    if (isBoardComplete) {
        if (compareBoards(currentBoard, currentSolution)) {
            // Pause the timer
            stopTimer();

            // Display a congratulatory message with the elapsed time
            const elapsedTime = formatTime(time);
            showCompletionModal(`You've completed the puzzle in ${elapsedTime}.`);
        } else {
            showCompletionModal("The board is fully filled, but the solution is incorrect. Keep trying!");
        }
    }
}

// Helper function to compare the current board with the solution
function compareBoards(board, solution) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] !== solution[row][col]) {
                return false;
            }
        }
    }
    return true;
}

// Format time for display
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
}

function showCompletionModal(message) {
    const modal = document.getElementById('completion-modal');
    const messageElement = document.getElementById('completion-message');
    const closeModalButton = document.getElementById('close-modal');

    // Set the message and show the modal
    messageElement.textContent = message;
    modal.classList.add('show');

    // Close modal on button click
    closeModalButton.addEventListener('click', () => {
        modal.classList.remove('show');
    });
}

// Toggle note in cell: Adds or removes the note in Notes mode
function toggleNoteInCell(cell, value) {
    if (!cell.classList.contains('note-mode')) {
        cell.classList.add('note-mode');
        cell.innerHTML = ''; // Clear any regular input
    }

    // Check if the note already exists in the cell
    const existingNote = cell.querySelector(`.note-${value}`);
    if (existingNote) {
        // If the note exists, remove it
        cell.removeChild(existingNote);
        if (!cell.querySelector('.note-mode div')) {
            // If no notes remain, remove note-mode styling
            cell.classList.remove('note-mode');
        }
    } else {
        // If the note does not exist, add it
        const note = document.createElement('div');
        note.textContent = value;
        note.classList.add(`note-${value}`);
        note.style.backgroundColor = selectedColor;
        cell.appendChild(note);
    }
    clearHighlights();
}

// Remove notes of a specific number from the row, column, and 3x3 grid
function removeNotesFromRelatedCells(cell, value) {
    const rowIndex = parseInt(cell.dataset.row, 10);
    const colIndex = parseInt(cell.dataset.col, 10);

    const cells = document.querySelectorAll('.cell');

    // Iterate through all cells
    cells.forEach((targetCell) => {
        const targetRowIndex = parseInt(targetCell.dataset.row, 10);
        const targetColIndex = parseInt(targetCell.dataset.col, 10);

        // Same row, same column, or same 3x3 grid
        if (
            targetRowIndex === rowIndex || // Same row
            targetColIndex === colIndex || // Same column
            isSameGrid(rowIndex, colIndex, targetRowIndex, targetColIndex) // Same 3x3 grid
        ) {
            // Remove the note if the cell is in note mode
            if (targetCell.classList.contains('note-mode')) {
                const noteToRemove = targetCell.querySelector(`.note-${value}`);
                if (noteToRemove) {
                    targetCell.removeChild(noteToRemove);
                }

                // If no notes remain, remove the note-mode class
                if (!targetCell.querySelector('.note-mode div')) {
                    targetCell.classList.remove('note-mode');
                }
            }
        }
    });
}

// Helper function to check if two cells are in the same 3x3 grid
function isSameGrid(row1, col1, row2, col2) {
    const gridRow1 = Math.floor(row1 / 3);
    const gridCol1 = Math.floor(col1 / 3);
    const gridRow2 = Math.floor(row2 / 3);
    const gridCol2 = Math.floor(col2 / 3);

    return gridRow1 === gridRow2 && gridCol1 === gridCol2;
}

// Add a note to the selected cell
function addNoteToCell(cell, value) {
    if (!cell.classList.contains('note-mode')) {
        cell.classList.add('note-mode');
        cell.innerHTML = ''; // Clear any regular input
    }
    // Add a note in the appropriate position if not already present
    if (!cell.querySelector(`.note-${value}`)) {
        const note = document.createElement('div');
        note.textContent = value;
        note.classList.add(`note-${value}`);
        cell.appendChild(note);
    }
}

// Save and Restor user inputs

function saveUserInputs() {
    userInputs = [];
    const rows = sudokuBoard.getElementsByClassName('row');
    for (let i = 0; i < rows.length; i++) {
        userInputs[i] = [];
        const cells = rows[i].getElementsByClassName('cell');
        for (let j = 0; j < cells.length; j++) {
            userInputs[i][j] = cells[j].textContent.trim() || '';
        }
    }
}

function restoreUserInputs() {
    const rows = sudokuBoard.getElementsByClassName('row');
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByClassName('cell');
        for (let j = 0; j < cells.length; j++) {
            cells[j].textContent = userInputs[i][j] || '';
        }
    }
}


// Toggle pause and resume functionality
function togglePauseResume() {
    if (isPaused) {
        // Resume the game
        renderBoard(puzzleBackup, true); // Restore the board and user inputs
        startTimer();
        pauseButton.innerHTML = '<i class="fas fa-pause"></i>'; // Set to pause icon
    } else {
        // Pause the game
        stopTimer();
        saveUserInputs(); // Save current user inputs
        renderEmptyBoard(); // Show an empty board
        pauseButton.innerHTML = '<i class="fas fa-play"></i>'; // Set to play icon
    }
    isPaused = !isPaused; // Toggle the pause state
}

// Start a new game with selected difficulty
function startGame() {
    const difficulty = difficultySelect.value;
    const puzzle = getRandomPuzzle(difficulty);
    puzzleBackup = puzzle;
    renderBoard(puzzle);
    resetTimer();
    startTimer();
    saveUserInputs();
    pauseButton.disabled = false;
    pauseButton.innerHTML = '<i class="fas fa-pause"></i>'; // Set to pause icon initially
    isPaused = false;
}

// Get a random puzzle based on difficulty
function getRandomPuzzle(difficulty) {
    const puzzleList = puzzles[difficulty];
    const randomIndex = Math.floor(Math.random() * puzzleList.length);
    currentSolution = puzzleList[randomIndex].solution;
    return puzzleList[randomIndex].grid;
}



// Render the Sudoku board with numbers and optionally restore user inputs
function renderBoard(puzzle, restoreInputs = false) {
    sudokuBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        let row = document.createElement('div');
        row.classList.add('row');
        for (let j = 0; j < 9; j++) {
            let cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = i;
            cell.dataset.col = j;

            // Display prefilled numbers as non-editable
            if (puzzle[i][j] !== 0) {
                cell.textContent = puzzle[i][j];
                cell.dataset.prefilled = "true";
                cell.classList.add('prefilled');
            } else if (restoreInputs && userInputs[i] && userInputs[i][j]) {
                cell.textContent = userInputs[i][j];
                cell.classList.add('user-entered');
            }
            row.appendChild(cell);
        }
        sudokuBoard.appendChild(row);
    }
    addCellSelectionListeners();
}


// Render an empty Sudoku board
function renderEmptyBoard() {
    sudokuBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        let row = document.createElement('div');
        row.classList.add('row');
        for (let j = 0; j < 9; j++) {
            let cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            row.appendChild(cell);
        }
        sudokuBoard.appendChild(row);
    }
}

// Timer functions
function startTimer() {
    timer = setInterval(() => {
        time++;
        let minutes = Math.floor(time / 60);
        let seconds = time % 60;
        timerDisplay.textContent = `Time: ${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timer);
}

function resetTimer() {
    stopTimer();
    time = 0;
    timerDisplay.textContent = 'Time: 00:00';
}

// Initialize an empty board and add listeners
renderEmptyBoard();

// Event listeners for game control buttons
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', togglePauseResume);

// Event listener for erasing content with the erase button
eraseButton.addEventListener('click', () => {
    if (selectedCell && !selectedCell.dataset.prefilled) {
        selectedCell.textContent = ''; // Clear the cell's content
        selectedCell.classList.remove('user-entered'); // Remove user-entered style
        clearHighlights();
    }
});



// Function to clear the selected cell
function clearSelectedCell() {
    if (selectedCell) {
        selectedCell.classList.remove('selected');
        selectedCell = null;
        clearHighlights();
    }
}

document.body.addEventListener('click', (event) => {
    const isClickInsideBoard = event.target.closest('#sudoku-board');
    const isClickInsideInteractiveElement = event.target.closest('button, #number-pad');

    // Deselect only if the click is outside the board and not on any button or interactive element
    if (!isClickInsideBoard && !isClickInsideInteractiveElement) {
        clearSelectedCell();
        clearHighlights();
    }
});

// Toggle the color palette visibility
paintButton.addEventListener('click', () => {
    colorPalette.style.display = colorPalette.style.display === 'flex' ? 'none' : 'flex';
    event.stopPropagation(); // Prevent closing immediately when clicking on the paint button
});

// Handle color selection from the palette
colorPalette.addEventListener('click', (event) => {
    const colorOption = event.target.closest('.color-option');
    if (colorOption) {
        selectedColor = colorOption.getAttribute('data-color');
        paintButton.style.borderColor = selectedColor; // Change paint button color
        colorPalette.classList.add('hidden'); // Hide color palette after selection
    }
    event.stopPropagation();
});

document.addEventListener('click', (event) => {
    if (colorPalette.style.display === 'flex') {
        colorPalette.style.display = 'none';
    }
});