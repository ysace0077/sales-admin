// AI Chat Module - Ollama 연동
const OLLAMA_URL = '/ollama/api/chat';
const AI_MODEL = 'exaone3.5:7.8b'; // 한국어 최적 모델

// 판매 데이터 컨텍스트 생성
function buildSalesContext() {
    try {
        // 전역 데이터에서 판매 요약 추출
        const aceData = window.allAceData || [];
        const essaData = window.allEssaData || [];

        const totalAce = aceData.reduce((s, r) => s + (parseFloat(r['판매금액']) || 0), 0);
        const totalEssa = essaData.reduce((s, r) => s + (parseFloat(r['판매금액']) || 0), 0);

        // 직원별 매출
        const sellerStats = {};
        [...aceData, ...essaData].forEach(r => {
            const name = r['판매직원'] || r['담당자'] || '미상';
            sellerStats[name] = (sellerStats[name] || 0) + (parseFloat(r['판매금액']) || 0);
        });
        const topSellers = Object.entries(sellerStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amt]) => `${name}: ${(amt / 10000).toFixed(0)}만원`)
            .join(', ');

        return `
당신은 여수 침대/가구 매장의 AI 판매 분석 어시스턴트입니다.
매장은 ACE(침대)와 ESSA(소파/가구) 두 브랜드를 취급합니다.
주요 직원: 오희정(실장), 이호만(점장), 김승진(실장)

현재 데이터 요약:
- ACE 총 매출: ${(totalAce / 10000).toFixed(0)}만원 (${aceData.length}건)
- ESSA 총 매출: ${(totalEssa / 10000).toFixed(0)}만원 (${essaData.length}건)
- 직원별 매출 TOP5: ${topSellers}

한국어로 친절하고 간결하게 답변해주세요.
판매 전략, 데이터 분석, 고객 응대 방법 등 매장 운영에 도움이 되는 답변을 해주세요.
        `.trim();
    } catch (e) {
        return '당신은 여수 침대/가구 매장(ACE, ESSA 브랜드)의 AI 판매 분석 어시스턴트입니다. 한국어로 친절하게 답변해주세요.';
    }
}

// 채팅 히스토리
let chatHistory = [];

// AI 응답 요청
async function askAI(userMessage) {
    chatHistory.push({ role: 'user', content: userMessage });

    const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: AI_MODEL,
            messages: [
                { role: 'system', content: buildSalesContext() },
                ...chatHistory
            ],
            stream: false
        })
    });

    if (!response.ok) throw new Error('AI 서버 응답 오류');

    const data = await response.json();
    const aiMessage = data.message?.content || '응답을 받지 못했습니다.';
    chatHistory.push({ role: 'assistant', content: aiMessage });
    return aiMessage;
}

// AI 탭 UI 렌더링
function renderAIChat() {
    const container = document.getElementById('aiTab');
    if (!container) return;

    container.innerHTML = `
        <div style="
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            overflow: hidden;
            margin-bottom: 20px;
        ">
            <!-- 헤더 -->
            <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px 25px;
                display: flex;
                align-items: center;
                gap: 15px;
            ">
                <div style="font-size: 2em;">🤖</div>
                <div>
                    <div style="color: white; font-size: 1.3em; font-weight: 700;">AI 판매 어시스턴트</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">exaone3.5 · 여수 매장 전용</div>
                </div>
                <div style="margin-left: auto; display: flex; gap: 10px;">
                    <select id="aiModelSelect" style="
                        padding: 8px 12px;
                        border-radius: 8px;
                        border: none;
                        font-size: 0.9em;
                        cursor: pointer;
                    ">
                        <option value="exaone3.5:7.8b">EXAONE 3.5 (한국어)</option>
                        <option value="deepseek-r1:8b">DeepSeek R1 (추론)</option>
                        <option value="qwen2.5-coder:7b">Qwen2.5 (코딩)</option>
                        <option value="gemma2:9b">Gemma2 9B</option>
                        <option value="llama3.2:3b">Llama3.2 (빠름)</option>
                        <option value="gemma2:2b">Gemma2 2B (최속)</option>
                    </select>
                    <button onclick="clearChat()" style="
                        padding: 8px 15px;
                        background: rgba(255,255,255,0.2);
                        color: white;
                        border: 1px solid rgba(255,255,255,0.4);
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.9em;
                    ">🗑️ 대화 초기화</button>
                </div>
            </div>

            <!-- 빠른 질문 버튼 -->
            <div style="padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; display: flex; flex-wrap: wrap; gap: 8px;">
                <span style="color: #666; font-size: 0.9em; align-self: center;">빠른 질문:</span>
                ${[
                    '이번 달 매출 분석해줘',
                    'ESSA 판매 늘리는 방법',
                    '직원별 성과 비교',
                    '고객 상담 스크립트 작성',
                    '비수기 대응 전략',
                    '침대 추천 방법 알려줘'
                ].map(q => `
                    <button onclick="quickAsk('${q}')" style="
                        padding: 6px 14px;
                        background: white;
                        border: 1px solid #667eea;
                        color: #667eea;
                        border-radius: 20px;
                        cursor: pointer;
                        font-size: 0.85em;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#667eea';this.style.color='white'"
                       onmouseout="this.style.background='white';this.style.color='#667eea'">
                        ${q}
                    </button>
                `).join('')}
            </div>

            <!-- 채팅창 -->
            <div id="chatMessages" style="
                height: 450px;
                overflow-y: auto;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                background: #fafafa;
            ">
                <div style="text-align: center; color: #999; font-size: 0.9em; padding: 20px;">
                    💬 안녕하세요! 매장 판매 데이터를 기반으로 분석해드립니다.<br>
                    궁금한 것을 자유롭게 물어보세요!
                </div>
            </div>

            <!-- 입력창 -->
            <div style="
                padding: 15px 20px;
                border-top: 1px solid #e9ecef;
                display: flex;
                gap: 10px;
                background: white;
            ">
                <textarea id="chatInput" placeholder="질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)" style="
                    flex: 1;
                    padding: 12px 15px;
                    border: 2px solid #e9ecef;
                    border-radius: 10px;
                    font-size: 1em;
                    resize: none;
                    height: 50px;
                    font-family: inherit;
                    outline: none;
                    transition: border-color 0.2s;
                " onfocus="this.style.borderColor='#667eea'"
                   onblur="this.style.borderColor='#e9ecef'"
                   onkeydown="handleChatKey(event)"></textarea>
                <button id="sendBtn" onclick="sendMessage()" style="
                    padding: 12px 25px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: 600;
                    white-space: nowrap;
                    transition: opacity 0.2s;
                ">전송 ➤</button>
            </div>
        </div>
    `;

    // 모델 선택 변경 이벤트
    document.getElementById('aiModelSelect').addEventListener('change', function() {
        window.selectedAIModel = this.value;
    });
}

// 메시지 추가
function addMessage(role, content) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const isUser = role === 'user';
    const div = document.createElement('div');
    div.style.cssText = `
        display: flex;
        justify-content: ${isUser ? 'flex-end' : 'flex-start'};
        gap: 10px;
        align-items: flex-start;
    `;

    div.innerHTML = `
        ${!isUser ? '<div style="font-size: 1.5em; flex-shrink: 0;">🤖</div>' : ''}
        <div style="
            max-width: 75%;
            padding: 12px 16px;
            border-radius: ${isUser ? '15px 15px 4px 15px' : '15px 15px 15px 4px'};
            background: ${isUser ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white'};
            color: ${isUser ? 'white' : '#333'};
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            font-size: 0.95em;
            line-height: 1.6;
            white-space: pre-wrap;
            word-break: break-word;
        ">${content}</div>
        ${isUser ? '<div style="font-size: 1.5em; flex-shrink: 0;">👤</div>' : ''}
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// 로딩 메시지
function addLoadingMessage() {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.id = 'loadingMsg';
    div.style.cssText = 'display: flex; gap: 10px; align-items: center;';
    div.innerHTML = `
        <div style="font-size: 1.5em;">🤖</div>
        <div style="
            padding: 12px 16px;
            border-radius: 15px 15px 15px 4px;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            color: #666;
            display: flex;
            gap: 5px;
            align-items: center;
        ">
            <span>생각 중</span>
            <span style="animation: blink 1s infinite;">...</span>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// 메시지 전송
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const message = input.value.trim();
    if (!message) return;

    // UI 초기화
    input.value = '';
    input.style.height = '50px';
    sendBtn.disabled = true;
    sendBtn.textContent = '처리 중...';

    addMessage('user', message);
    addLoadingMessage();

    try {
        // 선택된 모델 반영
        const model = window.selectedAIModel || AI_MODEL;
        const response = await fetch('/ollama/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: buildSalesContext() },
                    ...chatHistory.slice(-10), // 최근 10개만
                    { role: 'user', content: message }
                ],
                stream: false
            })
        });

        document.getElementById('loadingMsg')?.remove();

        if (!response.ok) throw new Error('서버 오류');

        const data = await response.json();
        const aiMessage = data.message?.content || '응답을 받지 못했습니다.';
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: aiMessage });
        addMessage('assistant', aiMessage);

    } catch (err) {
        document.getElementById('loadingMsg')?.remove();
        addMessage('assistant', `❌ 오류가 발생했습니다: ${err.message}\n\nOllama 서버가 실행 중인지 확인해주세요.`);
    }

    sendBtn.disabled = false;
    sendBtn.textContent = '전송 ➤';
    input.focus();
}

// 빠른 질문
function quickAsk(question) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = question;
        sendMessage();
    }
}

// 대화 초기화
function clearChat() {
    chatHistory = [];
    const container = document.getElementById('chatMessages');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; font-size: 0.9em; padding: 20px;">
                💬 대화가 초기화되었습니다. 새로운 질문을 입력해주세요!
            </div>
        `;
    }
}

// Enter 키 처리
function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// 탭 전환 시 AI 채팅 렌더링
document.addEventListener('DOMContentLoaded', () => {
    // AI 탭 클릭 이벤트 감지
    const observer = new MutationObserver(() => {
        const aiTab = document.getElementById('aiTab');
        if (aiTab && aiTab.classList.contains('active') && !aiTab.innerHTML.trim()) {
            renderAIChat();
        }
    });

    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(el => observer.observe(el, { attributes: true, attributeFilter: ['class'] }));
});
