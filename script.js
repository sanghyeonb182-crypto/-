/**
 * 나와 너의 취향 일치도는? - 정적 정밀 웹앱 JavaScript
 */

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    text: "민트초코 음료나 아이스크림을 좋아해?",
    icon: "IceCream",
    emoji: "💚🍫",
    hostAnswer: true,
  },
  {
    id: 2,
    text: "하루에 1시간 이상 게임을 즐겨?",
    icon: "Gamepad2",
    emoji: "🎮🔥",
    hostAnswer: true,
  },
  {
    id: 3,
    text: "쉬는 날엔 약속 없이 집에 있는 게 가장 행복해?",
    icon: "Home",
    emoji: "🏡🛋️",
    hostAnswer: true,
  },
  {
    id: 4,
    text: "강아지보다 고양이가 더 매력적이라고 생각해?",
    icon: "Cat",
    emoji: "🐱💤",
    hostAnswer: false,
  },
  {
    id: 5,
    text: "일찍 자는 아침형 인간보다는 밤늦게 활동하는 밤올빼미야?",
    icon: "Moon",
    emoji: "🦉🌙",
    hostAnswer: true,
  },
];

// App State
let questions = [];
let friendAnswers = {};
let isCustomized = false;
let currentQuestionIndex = 0;
let confettiIntervalId = null;

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  loadQuestionsState();
  showScreen("welcome");
  setupGlobalEvents();
});

// Load state from localStorage
function loadQuestionsState() {
  const savedQuestions = localStorage.getItem("friendship_test_questions");
  const savedCustomized = localStorage.getItem("friendship_test_customized");

  if (savedQuestions) {
    try {
      questions = JSON.parse(savedQuestions);
    } catch (e) {
      questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    }
  } else {
    questions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
  }

  isCustomized = savedCustomized === "true";
  updateWelcomeCustomBadge();
}

// Update Welcome Screen Customization Alert Pills
function updateWelcomeCustomBadge() {
  const badgeContainer = document.getElementById("welcome-status");
  const customizeBtn = document.getElementById("btn-settings");
  
  if (isCustomized) {
    badgeContainer.className = "text-[11px] font-bold text-emerald-600 bg-emerald-50/70 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center justify-center gap-1 shrink-0 select-none";
    badgeContainer.innerHTML = '🟢 내 진짜 취향 정보가 설정되어 있어요!';
    
    if (customizeBtn) {
      customizeBtn.innerHTML = '<i data-lucide="settings" class="w-3.5 h-3.5 animate-spin-slow text-pink-400"></i>진짜 내 취향 수정 ⚙️';
    }
  } else {
    badgeContainer.className = "text-[11px] font-bold text-amber-600 bg-amber-50/50 px-2.5 py-0.5 rounded-full border border-amber-100/50 inline-block select-none text-center shadow-xs self-center";
    badgeContainer.innerHTML = '🟡 현재 기본 제공 취향정보로 작동 중이에요.';
    
    if (customizeBtn) {
      customizeBtn.innerHTML = '<i data-lucide="settings" class="w-3.5 h-3.5 animate-spin-slow text-pink-400"></i>내 취향 설정하기 ⚙️';
    }
  }
  // Re-render lucide icons inside headers
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Show/Hide Screens with Transition simulation
function showScreen(screenId) {
  // Clear any existing confetti loops if departing from result screen
  stopConfetti();

  const screens = ["welcome", "setup", "test", "result"];
  screens.forEach((id) => {
    const el = document.getElementById(`screen-${id}`);
    if (el) {
      if (id === screenId) {
        el.style.display = "block";
        // Force reflow for scale animation
        el.offsetHeight; 
        el.classList.add("active");
      } else {
        el.style.display = "none";
        el.classList.remove("active");
      }
    }
  });

  // Re-generate Lucide SVG indicators
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Trigger page-specific initializations
  if (screenId === "setup") {
    renderSetupQuestions();
  } else if (screenId === "test") {
    startNewTest();
  } else if (screenId === "result") {
    renderResultSummary();
  }
}

// Global UI Interactivity Handlers
function setupGlobalEvents() {
  // Welcomes links
  document.getElementById("btn-start").addEventListener("click", () => showScreen("test"));
  document.getElementById("btn-customize-link").addEventListener("click", () => showScreen("setup"));
  
  // Header Settings
  const settingsBtn = document.getElementById("btn-settings");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => showScreen("setup"));
  }

  // Setups buttons
  document.getElementById("btn-setup-reset").addEventListener("click", resetSetupToDefault);
  document.getElementById("btn-setup-save").addEventListener("click", saveSetupQuestions);
  document.getElementById("btn-setup-close").addEventListener("click", () => showScreen("welcome"));
  document.getElementById("btn-setup-back").addEventListener("click", () => showScreen("welcome"));

  // Tests steps control buttons
  document.getElementById("btn-prev-q").addEventListener("click", handlePreviousQuestion);
  document.getElementById("btn-next-q").addEventListener("click", handleNextOrSubmitQuestion);
  document.getElementById("btn-test-back").addEventListener("click", () => {
    if (confirm("정말로 메인 화면으로 돌아가시겠어요? 입력 중인 대답이 초기화됩니다.")) {
      showScreen("welcome");
    }
  });

  // Test Answer Options
  document.getElementById("btn-choice-yes").addEventListener("click", () => selectTestAnswer(true));
  document.getElementById("btn-choice-no").addEventListener("click", () => selectTestAnswer(false));

  // Results Buttons
  document.getElementById("btn-restart-from-summary").addEventListener("click", () => showScreen("welcome"));
  document.getElementById("btn-share-result").addEventListener("click", copyResultToClipboard);
  document.getElementById("btn-reconfigure").addEventListener("click", () => showScreen("setup"));
}

/* ------------------ SETUP PREFERENCES ------------------ */
let tempQuestions = [];

function renderSetupQuestions() {
  // Deep copy original questions
  tempQuestions = JSON.parse(JSON.stringify(questions));
  
  const container = document.getElementById("setup-questions-container");
  container.innerHTML = "";

  tempQuestions.forEach((q, idx) => {
    const row = document.createElement("div");
    row.className = "p-3.5 bg-white/50 hover:bg-white/70 rounded-2xl border border-white/60 transition-colors flex flex-col gap-2.5";
    row.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 shrink-0 flex items-center justify-center font-jua text-xs text-white bg-pink-400 rounded-full">
          Q${idx + 1}
        </span>
        <span class="text-xl select-none shrink-0">${q.emoji}</span>
        <input
          type="text"
          value="${escapeHtml(q.text)}"
          oninput="updateTempQuestionText(${q.id}, this.value)"
          class="flex-1 bg-white/85 px-3 py-1 text-xs text-gray-700 rounded-lg border border-white focus:outline-none focus:ring-1 focus:ring-pink-400 font-medium"
          placeholder="질문 ${q.id}번 내용을 입력하세요"
        />
      </div>

      <div class="flex items-center justify-between mt-1">
        <span class="text-xs text-gray-500 flex items-center gap-1">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-pink-400"></i>
          이 질문에 대한 내 대답은?
        </span>
        
        <div class="flex gap-1 bg-white/80 p-0.5 rounded-full border border-white">
          <button
            type="button"
            onclick="updateTempQuestionAnswer(${q.id}, true)"
            id="setup-q-${q.id}-yes"
            class="px-3 py-1 rounded-full text-xs font-bold transition-all ${
              q.hostAnswer
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-xs scale-105'
                : 'text-gray-400 hover:text-emerald-500'
            }"
          >
            Yes ⭕
          </button>
          <button
            type="button"
            onclick="updateTempQuestionAnswer(${q.id}, false)"
            id="setup-q-${q.id}-no"
            class="px-3 py-1 rounded-full text-xs font-bold transition-all ${
              !q.hostAnswer
                ? 'bg-gradient-to-r from-rose-400 to-rose-500 text-white shadow-xs scale-105'
                : 'text-gray-400 hover:text-rose-500'
            }"
          >
            No ❌
          </button>
        </div>
      </div>
    `;
    container.appendChild(row);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Global scope bindings for row click handlers inside setup
window.updateTempQuestionText = function(id, text) {
  const q = tempQuestions.find((item) => item.id === id);
  if (q) q.text = text;
};

window.updateTempQuestionAnswer = function(id, hostAns) {
  const q = tempQuestions.find((item) => item.id === id);
  if (q) {
    q.hostAnswer = hostAns;
    // Visually toggle buttons immediately without full re-render
    const yesBtn = document.getElementById(`setup-q-${id}-yes`);
    const noBtn = document.getElementById(`setup-q-${id}-no`);
    
    if (hostAns) {
      yesBtn.className = "px-3 py-1 rounded-full text-xs font-bold transition-all bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-xs scale-105";
      noBtn.className = "px-3 py-1 rounded-full text-xs font-bold transition-all text-gray-400 hover:text-rose-500";
    } else {
      yesBtn.className = "px-3 py-1 rounded-full text-xs font-bold transition-all text-gray-400 hover:text-emerald-500";
      noBtn.className = "px-3 py-1 rounded-full text-xs font-bold transition-all bg-gradient-to-r from-rose-400 to-rose-500 text-white shadow-xs scale-105";
    }
  }
};

function saveSetupQuestions() {
  const hasEmpty = tempQuestions.some((q) => !q.text.trim());
  if (hasEmpty) {
    alert("질문 내용을 모두 입력해주세요!");
    return;
  }

  questions = JSON.parse(JSON.stringify(tempQuestions));
  localStorage.setItem("friendship_test_questions", JSON.stringify(questions));
  localStorage.setItem("friendship_test_customized", "true");
  isCustomized = true;

  updateWelcomeCustomBadge();
  showScreen("welcome");
}

function resetSetupToDefault() {
  if (confirm("모든 질문과 답을 기본값으로 초기화하시겠어요?")) {
    tempQuestions = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
    renderSetupQuestions();
  }
}


/* ------------------ FRIEND TESTING ------------------ */
function startNewTest() {
  friendAnswers = {};
  currentQuestionIndex = 0;
  renderTestQuestion();
}

function renderTestQuestion() {
  const totalCount = questions.length;
  const currentQ = questions[currentQuestionIndex];
  
  // 1. Update progress bar filled state
  const answeredCount = Object.keys(friendAnswers).length;
  const progressPercent = (answeredCount / totalCount) * 100;
  document.getElementById("progress-bar-fill").style.width = `${progressPercent}%`;

  // 2. Update Progress label text e.g., "3 / 5 완료"
  document.getElementById("progress-text-content").innerText = `${answeredCount} / ${totalCount} 완료`;

  // 3. Render numbered dots highlighting active states
  const dotsContainer = document.getElementById("test-steps-container");
  dotsContainer.innerHTML = "";
  
  questions.forEach((q, idx) => {
    const isCurrent = idx === currentQuestionIndex;
    const hasBeenAnswered = friendAnswers[q.id] !== undefined;

    const dotBtn = document.createElement("button");
    dotBtn.type = "button";
    dotBtn.className = `w-7 h-7 flex items-center justify-center text-xs font-jua rounded-full transition-all duration-300 cursor-pointer ${
      isCurrent
        ? "bg-[#6C5CE7] text-white font-bold scale-110 shadow-md"
        : hasBeenAnswered
        ? "bg-white/70 text-emerald-700 font-medium border border-emerald-200"
        : "bg-white/30 text-gray-400 border border-white/40 hover:bg-white/50 hover:text-pink-500"
    }`;
    dotBtn.innerText = idx + 1;
    dotBtn.addEventListener("click", () => {
      currentQuestionIndex = idx;
      renderTestQuestion();
    });
    dotsContainer.appendChild(dotBtn);
  });

  // 4. Update core content card
  document.getElementById("test-question-step-badge").innerText = `질문 ${currentQ.id}번`;
  document.getElementById("test-question-emoji").innerText = currentQ.emoji;
  document.getElementById("test-question-text").innerText = currentQ.text;

  // 5. Highlight chosen states if already annotated
  const currentSelectInfo = document.getElementById("test-current-choice-info");
  const yesBtn = document.getElementById("btn-choice-yes");
  const noBtn = document.getElementById("btn-choice-no");

  const alreadyChosen = friendAnswers[currentQ.id] !== undefined;
  if (alreadyChosen) {
    const isYes = friendAnswers[currentQ.id];
    currentSelectInfo.innerHTML = `내 선택: <span class="${isYes ? 'text-emerald-700' : 'text-rose-700'}">${isYes ? '좋아해! ⭕' : '아니야... ❌'}</span>`;
    currentSelectInfo.classList.remove("hidden");

    if (isYes) {
      yesBtn.className = "py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer bg-[#2B8A3E] text-white border-[#2B8A3E] shadow-xs";
      noBtn.className = "py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer bg-[#FFD1DC]/75 hover:bg-[#FFD1DC] text-[#C92A2A] border-[#FFA8A8]/45 shadow-[0_4px_0_#FFA8A8]";
    } else {
      yesBtn.className = "py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer bg-[#B2F2BB]/75 hover:bg-[#B2F2BB] text-[#2B8A3E] border-[#94D82D]/40 shadow-[0_4px_0_#94D82D]";
      noBtn.className = "py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer bg-[#C92A2A] text-white border-[#C92A2A] shadow-xs";
    }
  } else {
    currentSelectInfo.innerHTML = "";
    currentSelectInfo.classList.add("hidden");
    
    yesBtn.className = "py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer bg-[#B2F2BB]/75 hover:bg-[#B2F2BB] text-[#2B8A3E] border-[#94D82D]/40 shadow-[0_4px_0_#94D82D]";
    noBtn.className = "py-4 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer bg-[#FFD1DC]/75 hover:bg-[#FFD1DC] text-[#C92A2A] border-[#FFA8A8]/45 shadow-[0_4px_0_#FFA8A8]";
  }

  // 6. Navigation items
  const prevBtn = document.getElementById("btn-prev-q");
  const nextBtn = document.getElementById("btn-next-q");

  // Previous Button
  if (currentQuestionIndex === 0) {
    prevBtn.disabled = true;
    prevBtn.className = "opacity-40 text-gray-400 border border-gray-100 cursor-not-allowed bg-transparent flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-bold";
  } else {
    prevBtn.disabled = false;
    prevBtn.className = "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer active:scale-95 flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-bold";
  }

  // Toggle Next / Finish button layout
  const allAnswered = questions.every((q) => friendAnswers[q.id] !== undefined);
  if (allAnswered && currentQuestionIndex === totalCount - 1) {
    nextBtn.className = "flex items-center justify-center gap-1.5 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-jua rounded-2xl text-base shadow-lg shadow-pink-200 hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer";
    nextBtn.innerHTML = '결과 보러 가기! 🎉 <i data-lucide="arrow-right" class="w-5 h-5 animate-bounce-horizontal"></i>';
    nextBtn.disabled = false;
  } else {
    nextBtn.className = "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer active:scale-95 flex items-center justify-center gap-1 px-4 py-2 rounded-xl text-xs font-bold";
    nextBtn.innerHTML = '목록 넘기기 <i data-lucide="chevron-right" class="w-4 h-4"></i>';
    
    if (currentQuestionIndex === totalCount - 1) {
      nextBtn.disabled = true;
      nextBtn.classList.add("opacity-40", "cursor-not-allowed");
    } else {
      nextBtn.disabled = false;
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function selectTestAnswer(ansValue) {
  const currentQ = questions[currentQuestionIndex];
  friendAnswers[currentQ.id] = ansValue;

  renderTestQuestion();

  // Auto-advance with 350ms delay
  if (currentQuestionIndex < questions.length - 1) {
    setTimeout(() => {
      // Confirm that the user is still on the same index, preventing jump conflicts
      if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderTestQuestion();
      }
    }, 350);
  }
}

function handlePreviousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderTestQuestion();
  }
}

function handleNextOrSubmitQuestion() {
  const totalCount = questions.length;
  const allAnswered = questions.every((q) => friendAnswers[q.id] !== undefined);

  if (allAnswered && currentQuestionIndex === totalCount - 1) {
    showScreen("result");
  } else if (currentQuestionIndex < totalCount - 1) {
    currentQuestionIndex++;
    renderTestQuestion();
  }
}


/* ------------------ TEST SUMMARY RESULTS ------------------ */
function renderResultSummary() {
  let matchCount = 0;
  questions.forEach((q) => {
    if (q.hostAnswer === friendAnswers[q.id]) {
      matchCount++;
    }
  });

  const percentage = Math.round((matchCount / questions.length) * 100);
  const details = getResultMessages(percentage);

  // Print results
  document.getElementById("result-emoji-title").innerText = details.emoji;
  document.getElementById("result-title").innerText = details.title;
  document.getElementById("result-percentage").innerText = `${percentage}%`;
  document.getElementById("result-message").innerHTML = `"${details.message}"`;
  document.getElementById("result-submessage").innerText = details.subMessage;

  // Animate dynamic circular ring SVG
  const ring = document.getElementById("result-circle-fill");
  const circumference = 2 * Math.PI * 60; // 376.99
  
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference;
  
  setTimeout(() => {
    const offset = circumference * (1 - percentage / 100);
    ring.style.strokeDashoffset = offset;
  }, 150);

  // Print Question by Question Comparison cards
  renderComparisonCards();

  // Draw cute continuous falling confetti if score >= 80%
  if (percentage >= 80) {
    startConfetti();
  }
}

function getResultMessages(pct) {
  if (pct === 100) {
    return {
      emoji: "💝💘🔥",
      title: "천생연분 그 자체!!",
      message: "와! 우리 대박이다! 모든 질문이 다 맞아!",
      subMessage: "이건 신의 계시야... 우리 오늘 바로 평생 베프 등극하자! 당장 매점 쏠게! 🏃‍♀️💨",
    };
  } else if (pct === 80) {
    return {
      emoji: "✨💖🤩",
      title: "통하는 구석이 대박 많네!",
      message: `우와! 우리 무려 ${pct}%나 닮았어!`,
      subMessage: "어쩐지 처음 볼 때부터 느낌이 통하더라니! 같이 보드게임이나 피씨방 고고? 🎮👾",
    };
  } else if (pct === 60) {
    return {
      emoji: "😃🌟🙌",
      title: "우린 꽤 통하는 편!",
      message: `우와! 절반 이상 닮은 ${pct}% 일치!`,
      subMessage: "조금만 더 대화해보면 매일 떠들 수 있는 파트너가 될 예감! 조만간 친해지자 ☕",
    };
  } else if (pct === 40) {
    return {
      emoji: "🍃🧐🎯",
      title: "서로 다른 매력이 매력적이야!",
      message: `어! 우린 ${pct}% 닮은 일치도야!`,
      subMessage: "서로 반대되는 점이 있어서 오히려 신선한 대화가 가능해! 다른 만큼 서로 알려주자! 🗺️",
    };
  } else {
    return {
      emoji: "🔍👾🧭",
      title: "완벽하게 개성 넘치는 우리!",
      message: `오히려 신기해! 일치도는 ${pct}%!`,
      subMessage: "어쩜 이렇게 알짜배기처럼 서로 다른 매력을 가졌을까? 반대라서 자석처럼 착! 붙을 운명 🧲",
    };
  }
}

function renderComparisonCards() {
  const container = document.getElementById("result-comparison-container");
  container.innerHTML = "";

  questions.forEach((q, idx) => {
    const isMatched = q.hostAnswer === friendAnswers[q.id];
    
    const card = document.createElement("div");
    card.className = `p-3 rounded-2xl border flex flex-col gap-1.5 transition-shadow ${
      isMatched ? 'bg-[#B2F2BB]/30 border-emerald-200' : 'bg-white/40 border-white/50'
    }`;

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-start gap-1.5 flex-1 pr-2">
          <span class="w-4 h-4 mt-0.5 shrink-0 flex items-center justify-center text-[9px] font-jua rounded-full text-white ${
            isMatched ? 'bg-emerald-500' : 'bg-gray-400'
          }">
            ${idx + 1}
          </span>
          <span class="text-xs font-semibold text-gray-700 leading-normal">
            ${q.emoji} ${escapeHtml(q.text)}
          </span>
        </div>

        <div>
          ${
            isMatched
              ? '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-110 text-emerald-700 text-[10px] font-bold rounded-full">일치! 💚</span>'
              : '<span class="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100/75 text-gray-400 text-[10px] font-bold rounded-full">다름 🔍</span>'
          }
        </div>
      </div>

      <div class="flex justify-between items-center text-xs mt-1 bg-white/75 p-2 rounded-xl border border-gray-100/50">
        <div class="flex items-center gap-1 text-gray-500">
          <span class="px-1 border border-pink-200 text-pink-500 rounded text-[9px] font-semibold select-none">내 답</span>
          <span class="font-bold">${q.hostAnswer ? 'Yes ⭕' : 'No ❌'}</span>
        </div>
        
        <span class="text-gray-300">|</span>

        <div class="flex items-center gap-1 text-gray-500">
          <span class="px-1 border border-emerald-200 text-emerald-500 rounded text-[9px] font-semibold select-none">친구 답</span>
          <span class="font-bold">${friendAnswers[q.id] ? 'Yes ⭕' : 'No ❌'}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function copyResultToClipboard() {
  let matchCount = 0;
  questions.forEach((q) => {
    if (q.hostAnswer === friendAnswers[q.id]) {
      matchCount++;
    }
  });

  const percentage = Math.round((matchCount / questions.length) * 100);
  const details = getResultMessages(percentage);

  const textToCopy = `🎉 [나와 너의 취향 일치도는?] 결과 🎉\n\n우리는 무려 ${percentage}% 나 일치하는 사이에요! \n${details.title}\n"${details.subMessage}"\n\n나도 한번 테스트하러 가기 👉 ${window.location.href}`;
  
  navigator.clipboard.writeText(textToCopy)
    .then(() => {
      alert("결과가 클립보드에 복사되었어요! 친구에게 카톡으로 보내봐요 💌");
    })
    .catch(() => {
      alert("클립보드 복사에 실패했습니다. 직접 복사 내용을 선택해주세요!");
    });
}


/* ------------------ CONFETTI & SPARKS PHYSICS ------------------ */
function startConfetti() {
  stopConfetti(); // Prevent duplicates

  const parent = document.getElementById("confetti-container");
  if (!parent) return;

  const particleEmojis = ['💖', '✨', '🍭', '🍀', '🌸', '💝', '🎉', '🌟'];
  
  // Create first batch of particles (30 count)
  for (let i = 0; i < 30; i++) {
    createParticle(parent, particleEmojis);
  }

  // Continuously spawn random falling emojis to establish standard loop
  confettiIntervalId = setInterval(() => {
    createParticle(parent, particleEmojis);
  }, 300);
}

function createParticle(parent, emojis) {
  const div = document.createElement("div");
  div.className = "confetti-particle";
  div.innerText = emojis[Math.floor(Math.random() * emojis.length)];

  const lValue = Math.random() * 100; // Left offset
  const duration = 3 + Math.random() * 3; // Animation time in secs
  const size = 16 + Math.random() * 28; // FontSize
  const delay = Math.random() * 2; // Staggered entry

  div.style.left = `${lValue}vw`;
  div.style.fontSize = `${size}px`;
  div.style.animationDuration = `${duration}s`;
  div.style.animationDelay = `${delay}s`;

  parent.appendChild(div);

  // Self cleaning
  setTimeout(() => {
    div.remove();
  }, (duration + delay) * 1000);
}

function stopConfetti() {
  if (confettiIntervalId) {
    clearInterval(confettiIntervalId);
    confettiIntervalId = null;
  }
  const parent = document.getElementById("confetti-container");
  if (parent) {
    parent.innerHTML = "";
  }
}


/* ------------------ SANITIZATION UTILITIES ------------------ */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
