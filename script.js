document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        gameContainer: document.getElementById('game-container'),
        playerHand: document.getElementById('player-hand'),
        aiHand: document.getElementById('ai-hand'),
        playerCardSlot: document.getElementById('player-card-slot'),
        aiCardSlot: document.getElementById('ai-card-slot'),
        playerScore: document.getElementById('player-score'),
        aiScore: document.getElementById('ai-score'),
        turnCounter: document.getElementById('turn-counter'),
        messageBox: document.getElementById('message-box'),
        timer: document.getElementById('timer'),
        swapAbilityButton: document.getElementById('swap-ability-button'),
        graveyardDisplay: document.getElementById('graveyard-display'),
        graveyardCount: document.getElementById('graveyard-count'),
        modalOverlay: document.getElementById('modal-overlay'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalFooter: document.getElementById('modal-footer'),
    };

    const sounds = {
        bgm: new Audio('Night_Howling.mp3'),
        set: new Audio('set.mp3'),
        open: new Audio('open.mp3'),
        lose: new Audio('lose.mp3'),
        joker_use: new Audio('joker_use.mp3'),
        hikiwake: new Audio('hikiwake.mp3'),
        cursor_move: new Audio('Cursor_Move.mp3'),
        bairitu_success: new Audio('bairitu_bonus_success.mp3'),
        win: new Audio('win.mp3'),
        tokusyu_hatudou: new Audio('tokusyu_hatudou.mp3'),
        timer: new Audio('timer.mp3'),
    };
    
    sounds.bgm.loop = true;
    sounds.bgm.volume = 0.15;
    sounds.timer.loop = true;
    sounds.timer.volume = 0.5;

    let state = {};
    let timerInterval;
    const TIME_LIMIT = 30;
    let isBgmPlaying = false;
    let isTimerSoundPlaying = false;

    function playSound(sound) {
        sound.currentTime = 0;
        sound.play();
    }

    function playBgm() {
        if (!isBgmPlaying) {
            sounds.bgm.play().catch(e => console.error("BGMの再生に失敗:", e));
            isBgmPlaying = true;
        }
    }

    function stopAllLoopSounds() {
        sounds.bgm.pause();
        sounds.bgm.currentTime = 0;
        isBgmPlaying = false;
        sounds.timer.pause();
        sounds.timer.currentTime = 0;
        isTimerSoundPlaying = false;
    }

    function initializeGame() {
        stopAllLoopSounds();
        state = {
            player: { hand: ["1", "2", "3", "4", "Joker"], score: 0, bonusCard: null, abilityUsed: false, cardToPlay: null, selectedCard: null },
            ai: { hand: ["1", "2", "3", "4", "Joker"], score: 0, bonusCard: null, cardToPlay: null },
            graveyard: [], turn: 1, phase: 'bonus-selection', isModalOpen: false,
        };
        updateScoresAndAbilities();
        updateTurnCounter();
        updateGraveyardDisplay();
        resetPlayArea();
        promptBonusSelection();
    }

    function promptBonusSelection() {
        showModal( "倍率ボーナス選択", "勝利時のポイントが倍になるカードを1枚選んでください。", state.player.hand.filter(card => ["2", "3", "4"].includes(card)),
            (cardValue) => {
                playBgm();
                playSound(sounds.cursor_move);
                state.player.bonusCard = cardValue;
                hideModal();
                startGame();
            }, [], true
        );
    }
    
    function startGame() {
        state.phase = 'player-turn';
        renderHands();
        displayMessage("セット！\nカードを選んでください");
        startTimer();
    }

    function renderHands() {
        elements.playerHand.innerHTML = '';
        state.player.hand.forEach(card => {
            elements.playerHand.appendChild(createCardElement(card, 'player'));
        });
        elements.aiHand.innerHTML = '';
        state.ai.hand.forEach(() => {
            elements.aiHand.appendChild(createCardElement('back', 'ai'));
        });
    }

    function createCardElement(cardValue, owner) {
        const cardEl = document.createElement('div');
        cardEl.classList.add('card');
        cardEl.dataset.value = cardValue;
        if (cardValue === 'back') cardEl.classList.add('back');
        if (owner === 'player' && cardValue === state.player.bonusCard) cardEl.classList.add('bonus');
        if (owner === 'player' && cardValue === state.player.selectedCard) cardEl.classList.add('selected');
        if (state.phase === 'player-turn' && owner === 'player' && !state.isModalOpen) {
            cardEl.classList.add('playable');
            cardEl.addEventListener('click', (e) => {
                e.stopPropagation();
                handlePlayerCardSelect(cardValue);
            });
        } else if (owner === 'modal') {
             cardEl.style.cursor = 'pointer';
        }
        return cardEl;
    }

    function updateScoresAndAbilities() {
        elements.playerScore.textContent = `${state.player.score} pt`;
        elements.aiScore.textContent = `${state.ai.score} pt`;
        const canUseAbility = !state.player.abilityUsed && state.player.score >= 2 && state.graveyard.length > 0 && state.phase === 'player-turn';
        elements.swapAbilityButton.disabled = !canUseAbility;
    }

    function updateTurnCounter() { elements.turnCounter.textContent = `ターン ${state.turn}/5`; }
    function updateGraveyardDisplay() { elements.graveyardCount.textContent = state.graveyard.length; }
    function displayMessage(text, duration = null) {
        elements.messageBox.textContent = text;
        elements.messageBox.classList.remove('hidden');
        if (duration) setTimeout(() => elements.messageBox.classList.add('hidden'), duration);
    }
    
    function resetPlayArea() {
        elements.playerCardSlot.innerHTML = '';
        elements.aiCardSlot.innerHTML = '';
        elements.messageBox.classList.add('hidden');
    }

    function handlePlayerCardSelect(cardValue) {
        if (state.phase !== 'player-turn' || state.isModalOpen) return;
        if (state.player.selectedCard === cardValue) {
            playSound(sounds.set);
            state.player.cardToPlay = cardValue;
            state.player.selectedCard = null;
            stopTimer();
            const cardIndex = state.player.hand.indexOf(cardValue);
            state.player.hand.splice(cardIndex, 1);
            elements.playerCardSlot.innerHTML = '';
            elements.playerCardSlot.appendChild(createCardElement('back', 'player'));
            renderHands();
            aiTurn();
        } else {
            playSound(sounds.cursor_move);
            state.player.selectedCard = cardValue;
            renderHands();
        }
    }
    
    elements.gameContainer.addEventListener('click', () => {
        if (state.phase === 'player-turn' && state.player.selectedCard !== null) {
            state.player.selectedCard = null;
            renderHands();
        }
    });

    function aiTurn() {
        state.phase = 'ai-turn';
        updateScoresAndAbilities();
        const randomIndex = Math.floor(Math.random() * state.ai.hand.length);
        state.ai.cardToPlay = state.ai.hand[randomIndex];
        state.ai.hand.splice(randomIndex, 1);
        elements.aiCardSlot.innerHTML = '';
        elements.aiCardSlot.appendChild(createCardElement('back', 'ai'));
        renderHands();
        displayMessage("オープン！", 1000);
        setTimeout(revealCards, 1000);
    }
    
    function revealCards() {
        state.phase = 'reveal';
        if (state.player.cardToPlay === 'Joker' || state.ai.cardToPlay === 'Joker') playSound(sounds.joker_use);
        else playSound(sounds.open);
        elements.playerCardSlot.innerHTML = '';
        elements.playerCardSlot.appendChild(createCardElement(state.player.cardToPlay, 'player'));
        elements.aiCardSlot.innerHTML = '';
        elements.aiCardSlot.appendChild(createCardElement(state.ai.cardToPlay, 'ai'));
        setTimeout(calculatePoints, 2000);
    }

    function calculatePoints() {
        state.phase = 'scoring';
        const pCard = state.player.cardToPlay, aCard = state.ai.cardToPlay;
        let pPoints = 0, aPoints = 0, message = "";
        const pIsJoker = pCard === 'Joker', aIsJoker = aCard === 'Joker';
        const pVal = parseInt(pCard), aVal = parseInt(aCard);

        // ★★★ここがルールの変更点です★★★
        if (pIsJoker && aIsJoker) { 
            message = "相打ち！\n両者 -2pt";
            pPoints = -2;
            aPoints = -2;
        }
        else if (pIsJoker) { pPoints = aVal; message = `プレイヤーが ${pPoints}pt 獲得！`; }
        else if (aIsJoker) { aPoints = pVal; message = `AIが ${aPoints}pt 獲得！`; }
        else {
            if (pVal > aVal) {
                pPoints = pVal - aVal;
                if (pCard === state.player.bonusCard) {
                    playSound(sounds.bairitu_success);
                    pPoints *= { '2': 4, '3': 3, '4': 2 }[pCard];
                    message = `倍率ボーナス！\nプレイヤーが ${pPoints}pt 獲得！`;
                } else { message = `プレイヤーが ${pPoints}pt 獲得！`; }
            } else if (aVal > pVal) { aPoints = aVal - pVal; message = `AIが ${aPoints}pt 獲得！`; }
            else { message = "引き分け！"; }
        }
        state.player.score += pPoints;
        state.ai.score += aPoints;
        state.graveyard.push(pCard, aCard);
        updateScoresAndAbilities();
        updateGraveyardDisplay();
        displayMessage(message);
        setTimeout(nextTurn, 3000);
    }

    function nextTurn() {
        resetPlayArea();
        if (state.turn >= 5) gameOver();
        else {
            state.turn++; state.phase = 'player-turn';
            updateTurnCounter(); renderHands();
            updateScoresAndAbilities();
            displayMessage("セット！\nカードを選んでください");
            startTimer();
        }
    }

    function gameOver() {
        state.phase = 'game-over';
        stopAllLoopSounds();
        let resultMessage;
        if (state.player.score > state.ai.score) { resultMessage = "あなたの勝利！"; playSound(sounds.win); }
        else if (state.ai.score > state.player.score) { resultMessage = "あなたの敗北..."; playSound(sounds.lose); }
        else { resultMessage = "引き分け"; playSound(sounds.hikiwake); }
        displayMessage(`ゲーム終了！\n${resultMessage}`);
        setTimeout(() => {
             showModal("ゲーム結果", `<h2>${resultMessage}</h2><p>あなた: ${state.player.score}pt vs AI: ${state.ai.score}pt</p>`, [], null, [{text: "もう一度プレイ", action: initializeGame}]);
        }, 2000);
    }

    function startTimer() {
        clearInterval(timerInterval);
        let timeLeft = TIME_LIMIT;
        elements.timer.textContent = timeLeft;
        elements.timer.classList.remove('warning');
        timerInterval = setInterval(() => {
            timeLeft--;
            elements.timer.textContent = timeLeft;
            if (timeLeft <= 10) {
                elements.timer.classList.add('warning');
                if (!isTimerSoundPlaying) { sounds.timer.play(); isTimerSoundPlaying = true; }
            }
            if (timeLeft <= 0) {
                stopTimer();
                displayMessage("時間切れ！\nランダムに選択します");
                setTimeout(() => {
                    if (state.player.hand.length > 0) {
                        const cardToPlay = state.player.selectedCard || state.player.hand[Math.floor(Math.random() * state.player.hand.length)];
                        state.player.selectedCard = cardToPlay;
                        handlePlayerCardSelect(cardToPlay);
                    }
                }, 1000);
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        sounds.timer.pause();
        sounds.timer.currentTime = 0;
        isTimerSoundPlaying = false;
    }
    
    elements.swapAbilityButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (elements.swapAbilityButton.disabled) return;
        playSound(sounds.tokusyu_hatudou);
        showModal( "墓地と手札を交換", "手札から墓地に送るカードを1枚選んでください。", state.player.hand,
            (cardToSwap) => {
                const graveyardIndex = Math.floor(Math.random() * state.graveyard.length);
                const cardFromGraveyard = state.graveyard.splice(graveyardIndex, 1)[0];
                const handIndex = state.player.hand.indexOf(cardToSwap);
                state.player.hand.splice(handIndex, 1);
                state.graveyard.push(cardToSwap);
                state.player.hand.push(cardFromGraveyard);
                state.player.score -= 2;
                state.player.abilityUsed = true;
                hideModal(); renderHands();
                updateScoresAndAbilities();
                updateGraveyardDisplay();
                displayMessage("カードを交換しました！", 2000);
            }, [{text: "キャンセル", action: hideModal}]
        );
    });

    elements.graveyardDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound(sounds.cursor_move);
        if (state.graveyard.length === 0) {
             showModal("墓地", "<p>墓地はまだ空です。</p>", [], null, [{text: "閉じる", action: hideModal}]);
             return;
        }
        showModal("墓地にあるカード", "", state.graveyard, null, [{text: "閉じる", action: hideModal}]);
    });

    function showModal(title, bodyText, cards, onCardClick, buttons = [], isBonusSelection = false) {
        state.isModalOpen = true;
        elements.modalTitle.textContent = title;
        let bodyContent = '';
        if (bodyText) bodyContent = (typeof bodyText === 'string' && bodyText.startsWith('<')) ? bodyText : `<p>${bodyText}</p>`;
        const cardContainer = document.createElement('div');
        cardContainer.className = 'modal-card-container';
        cards.forEach(card => {
            const cardEl = createCardElement(card, 'modal');
            if (onCardClick) cardEl.addEventListener('click', () => onCardClick(card));
            cardContainer.appendChild(cardEl);
        });
        elements.modalBody.innerHTML = bodyContent;
        elements.modalBody.appendChild(cardContainer);
        elements.modalFooter.innerHTML = '';
        if (!isBonusSelection) {
            buttons.forEach(btnInfo => {
                const button = document.createElement('button');
                button.textContent = btnInfo.text;
                button.onclick = btnInfo.action;
                elements.modalFooter.appendChild(button);
            });
        }
        elements.modalOverlay.classList.remove('hidden');
        renderHands();
    }

    function hideModal() {
        state.isModalOpen = false;
        elements.modalOverlay.classList.add('hidden');
        renderHands();
    }

    initializeGame();
});

