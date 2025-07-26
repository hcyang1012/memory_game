class MemoryGame {
    constructor() {
        this.cards = [];
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.attempts = 0;
        this.gameStarted = false;
        this.startTime = null;
        this.timerInterval = null;
        this.difficulty = 'easy';
        this.previewMode = false;
        this.previewTimer = null;
        this.isProcessingMatch = false; // 매치 처리 중 플래그
        
        // 게임패드 관련 변수
        this.gamepad = null;
        this.gamepadIndex = -1;
        this.selectedCardIndex = 0;
        this.gamepadInterval = null;
        this.lastGamepadState = {};
        
        // 이모지 카드 쌍들 (짝수 개로 구성)
        this.cardEmojis = [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
            '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
            '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺',
            '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞'
        ];
        
        this.initializeGame();
        this.setupEventListeners();
        this.setupGamepad();
    }
    
    initializeGame() {
        this.setDifficulty();
        this.createCards();
        this.shuffleCards();
        this.resetGame();
        this.startPreviewMode();
    }
    
    setDifficulty() {
        const difficultySelect = document.getElementById('difficulty');
        this.difficulty = difficultySelect.value;
    }
    
    getBoardSize() {
        switch(this.difficulty) {
            case 'easy': return { rows: 4, cols: 4 };
            case 'medium': return { rows: 6, cols: 6 };
            case 'hard': return { rows: 8, cols: 8 };
            default: return { rows: 4, cols: 4 };
        }
    }
    
    createCards() {
        const { rows, cols } = this.getBoardSize();
        const totalCards = rows * cols;
        const pairsNeeded = totalCards / 2;
        
        // 필요한 쌍만큼 이모지 선택
        const selectedEmojis = this.cardEmojis.slice(0, pairsNeeded);
        
        // 각 이모지를 2개씩 만들어서 카드 배열 생성
        this.cards = [];
        selectedEmojis.forEach(emoji => {
            this.cards.push({ emoji, id: Math.random(), isFlipped: false, isMatched: false });
            this.cards.push({ emoji, id: Math.random(), isFlipped: false, isMatched: false });
        });
    }
    
    shuffleCards() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    renderBoard() {
        const gameBoard = document.getElementById('game-board');
        const { rows, cols } = this.getBoardSize();
        
        gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        gameBoard.innerHTML = '';
        
        this.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.index = index;
            
            // 프리뷰 모드에서는 모든 카드를 보여주고, 게임 중에는 뒤집힌 카드만 보여줌
            if (this.previewMode || card.isFlipped || card.isMatched) {
                cardElement.textContent = card.emoji;
            } else {
                cardElement.textContent = '';
            }
            
            // 프리뷰 모드에서는 카드를 뒤집지 않음
            if (card.isFlipped && !this.previewMode) cardElement.classList.add('flipped');
            if (card.isMatched) cardElement.classList.add('matched');
            if (card.isMatched || this.previewMode) cardElement.classList.add('disabled');
            
            // 게임패드 선택 표시 (모바일이 아니고 게임패드가 연결되어 있을 때만)
            if (index === this.selectedCardIndex && !this.previewMode && !this.isMobileDevice() && this.gamepadIndex !== -1) {
                cardElement.classList.add('selected');
            }
            
            gameBoard.appendChild(cardElement);
        });
    }
    
    setupEventListeners() {
        const gameBoard = document.getElementById('game-board');
        
        // 게임 보드 클릭 이벤트
        gameBoard.addEventListener('click', (e) => {
            if (e.target.classList.contains('card')) {
                this.flipCard(parseInt(e.target.dataset.index));
            }
        });
        
        // 터치 이벤트 최적화 (모바일)
        gameBoard.addEventListener('touchstart', (e) => {
            e.preventDefault(); // 기본 터치 동작 방지
        }, { passive: false });
        
        gameBoard.addEventListener('touchend', (e) => {
            const card = e.target.closest('.card');
            if (card) {
                e.preventDefault();
                this.flipCard(parseInt(card.dataset.index));
            }
        }, { passive: false });
        
        // 새 게임 버튼
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });
        
        // 난이도 변경
        document.getElementById('difficulty').addEventListener('change', () => {
            this.startNewGame();
        });
        
        // 다시 하기 버튼
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.hideGameOver();
            this.startNewGame();
        });
        
        // 모바일에서 줌 방지
        document.addEventListener('touchmove', (e) => {
            if (e.scale !== 1) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    flipCard(index) {
        const card = this.cards[index];
        
        // 프리뷰 모드 중이거나 이미 뒤집혔거나 매치된 카드, 또는 매치 처리 중이면 무시
        if (this.previewMode || card.isFlipped || card.isMatched || this.isProcessingMatch) return;
        
        // 게임 시작 시간 기록
        if (!this.gameStarted) {
            this.startTimer();
            this.gameStarted = true;
        }
        
        // 카드 뒤집기
        card.isFlipped = true;
        this.flippedCards.push(index);
        
        this.renderBoard();
        
        // 두 번째 카드가 뒤집혔을 때 매치 확인
        if (this.flippedCards.length === 2) {
            this.attempts++;
            this.updateAttempts();
            this.checkMatch();
        }
    }
    
    checkMatch() {
        const [index1, index2] = this.flippedCards;
        const card1 = this.cards[index1];
        const card2 = this.cards[index2];
        
        // 매치 처리 시작
        this.isProcessingMatch = true;
        
        if (card1.emoji === card2.emoji) {
            // 매치 성공
            card1.isMatched = true;
            card2.isMatched = true;
            this.matchedPairs++;
            
            this.flippedCards = [];
            this.renderBoard();
            this.isProcessingMatch = false; // 매치 처리 완료
            
            // 게임 완료 확인
            if (this.matchedPairs === this.cards.length / 2) {
                this.endGame();
            }
        } else {
            // 매치 실패 - 잠시 후 카드 다시 뒤집기
            setTimeout(() => {
                card1.isFlipped = false;
                card2.isFlipped = false;
                this.flippedCards = [];
                this.renderBoard();
                this.isProcessingMatch = false; // 매치 처리 완료
            }, 500);
        }
    }
    
    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }
    
    updateTimer() {
        const elapsed = Date.now() - this.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timer').textContent = timeString;
    }
    
    updateAttempts() {
        document.getElementById('attempts').textContent = this.attempts;
    }
    
    endGame() {
        clearInterval(this.timerInterval);
        this.gameStarted = false;
        
        // 최종 통계 업데이트
        document.getElementById('final-attempts').textContent = this.attempts;
        document.getElementById('final-time').textContent = document.getElementById('timer').textContent;
        
        // 게임 오버 화면 표시
        document.getElementById('game-over').classList.remove('hidden');
    }
    
    hideGameOver() {
        document.getElementById('game-over').classList.add('hidden');
    }
    
    resetGame() {
        this.matchedPairs = 0;
        this.attempts = 0;
        this.flippedCards = [];
        this.gameStarted = false;
        this.previewMode = false;
        
        // 타이머 리셋
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.previewTimer) {
            clearTimeout(this.previewTimer);
        }
        document.getElementById('timer').textContent = '00:00';
        document.getElementById('attempts').textContent = '0';
        
        // 모든 카드 초기화
        this.cards.forEach(card => {
            card.isFlipped = false;
            card.isMatched = false;
        });
    }
    
    startPreviewMode() {
        this.previewMode = true;
        this.renderBoard();
        
        // 5초 후에 프리뷰 모드 종료
        this.previewTimer = setTimeout(() => {
            this.endPreviewMode();
        }, 5000);
        
        // 프리뷰 시작 메시지 표시
        this.showPreviewMessage();
    }
    
    endPreviewMode() {
        this.previewMode = false;
        this.renderBoard();
        this.hidePreviewMessage();
    }
    
    showPreviewMessage() {
        // 기존 타이머를 카운트다운으로 변경
        const timerElement = document.getElementById('timer');
        const timerLabel = document.querySelector('.timer span:first-child');
        
        timerElement.textContent = '5';
        timerElement.style.color = '#667eea';
        timerElement.style.fontWeight = 'bold';
        timerLabel.textContent = '카운트다운: ';
        
        // 카운트다운 시작
        this.startCountdown();
    }
    
    hidePreviewMessage() {
        // 타이머를 원래 상태로 복원
        const timerElement = document.getElementById('timer');
        const timerLabel = document.querySelector('.timer span:first-child');
        
        timerElement.textContent = '00:00';
        timerElement.style.color = '';
        timerElement.style.fontWeight = '';
        timerLabel.textContent = '시간: ';
    }
    
    startCountdown() {
        let countdown = 5;
        const timerElement = document.getElementById('timer');
        
        const countdownInterval = setInterval(() => {
            countdown--;
            timerElement.textContent = countdown.toString();
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
    
    startNewGame() {
        this.hideGameOver();
        this.setDifficulty();
        this.createCards();
        this.shuffleCards();
        this.resetGame();
        this.startPreviewMode();
        this.selectedCardIndex = 0; // 선택된 카드 초기화
    }
    
    setupGamepad() {
        // 모바일 환경에서는 게임패드 기능 비활성화
        if (this.isMobileDevice()) {
            this.updateGamepadStatus('모바일 환경');
            return;
        }
        
        // 게임패드 연결 이벤트
        window.addEventListener('gamepadconnected', (e) => {
            console.log('게임패드 연결됨:', e.gamepad);
            this.gamepadIndex = e.gamepad.index;
            this.startGamepadPolling();
            this.updateGamepadStatus('연결됨');
        });
        
        // 게임패드 연결 해제 이벤트
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('게임패드 연결 해제됨');
            this.gamepadIndex = -1;
            this.stopGamepadPolling();
            this.updateGamepadStatus('연결 안됨');
        });
        
        // 기존 게임패드 확인
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    this.gamepadIndex = i;
                    this.startGamepadPolling();
                    this.updateGamepadStatus('연결됨');
                    break;
                }
            }
        }
    }
    
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    }
    
    updateGamepadStatus(status) {
        const statusElement = document.getElementById('gamepad-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.style.color = status === '연결됨' ? '#48bb78' : '#e53e3e';
        }
    }
    
    startGamepadPolling() {
        if (this.gamepadInterval) {
            clearInterval(this.gamepadInterval);
        }
        
        this.gamepadInterval = setInterval(() => {
            this.pollGamepad();
        }, 50); // 20fps
    }
    
    stopGamepadPolling() {
        if (this.gamepadInterval) {
            clearInterval(this.gamepadInterval);
            this.gamepadInterval = null;
        }
    }
    
    pollGamepad() {
        // 모바일 환경에서는 게임패드 폴링 비활성화
        if (this.isMobileDevice() || this.gamepadIndex === -1) return;
        
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[this.gamepadIndex];
        
        if (!gamepad) return;
        
        this.handleGamepadInput(gamepad);
    }
    
    handleGamepadInput(gamepad) {
        const { rows, cols } = this.getBoardSize();
        const totalCards = rows * cols;
        
        // 매치 처리 중이면 게임패드 입력 무시
        if (this.isProcessingMatch) return;
        
        // D-pad 또는 왼쪽 스틱으로 카드 선택
        const leftStickX = gamepad.axes[0];
        const leftStickY = gamepad.axes[1];
        const dpadLeft = gamepad.buttons[14]?.pressed;
        const dpadRight = gamepad.buttons[15]?.pressed;
        const dpadUp = gamepad.buttons[12]?.pressed;
        const dpadDown = gamepad.buttons[13]?.pressed;
        
        // A 버튼으로 카드 선택
        const aButton = gamepad.buttons[0]?.pressed;
        
        // 현재 선택된 카드의 위치 계산
        const currentRow = Math.floor(this.selectedCardIndex / cols);
        const currentCol = this.selectedCardIndex % cols;
        
        let newIndex = this.selectedCardIndex;
        
        // 왼쪽 스틱 입력 처리 (감도 더 낮춤)
        if (Math.abs(leftStickX) > 0.85) {
            if (leftStickX > 0.85 && currentCol < cols - 1) {
                newIndex = this.selectedCardIndex + 1;
            } else if (leftStickX < -0.85 && currentCol > 0) {
                newIndex = this.selectedCardIndex - 1;
            }
        }
        
        if (Math.abs(leftStickY) > 0.85) {
            if (leftStickY > 0.85 && currentRow < rows - 1) {
                newIndex = this.selectedCardIndex + cols;
            } else if (leftStickY < -0.85 && currentRow > 0) {
                newIndex = this.selectedCardIndex - cols;
            }
        }
        
        // D-pad 입력 처리 (한 번만 실행되도록)
        if (dpadRight && currentCol < cols - 1 && !this.lastGamepadState.dpadRight) {
            newIndex = this.selectedCardIndex + 1;
        } else if (dpadLeft && currentCol > 0 && !this.lastGamepadState.dpadLeft) {
            newIndex = this.selectedCardIndex - 1;
        } else if (dpadDown && currentRow < rows - 1 && !this.lastGamepadState.dpadDown) {
            newIndex = this.selectedCardIndex + cols;
        } else if (dpadUp && currentRow > 0 && !this.lastGamepadState.dpadUp) {
            newIndex = this.selectedCardIndex - cols;
        }
        
        // 선택된 카드 범위 내로 제한
        if (newIndex >= 0 && newIndex < totalCards && newIndex !== this.selectedCardIndex) {
            this.selectedCardIndex = newIndex;
            this.renderBoard();
        }
        
        // A 버튼으로 카드 선택 (한 번만 실행되도록)
        if (aButton && !this.lastGamepadState.aButton) {
            this.flipCard(this.selectedCardIndex);
        }
        
        // 현재 상태 저장
        this.lastGamepadState = {
            aButton: aButton,
            dpadLeft: dpadLeft,
            dpadRight: dpadRight,
            dpadUp: dpadUp,
            dpadDown: dpadDown
        };
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame();
}); 