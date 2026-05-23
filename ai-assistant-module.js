// AI 매출 분석 어시스턴트 모듈
class AIAssistantModule {
    constructor(db, SQL) {
        this.db = db;
        this.SQL = SQL;
        this.apiKey = 'sk-c47d975549724aa69122b84db54dd4cb';
        this.apiUrl = 'https://yeosusquare.cloud/ollama/api/generate';
        this.model = 'exaone3.5:7.8b';
        this.chatHistory = [];
        this.isLoading = false;
        this.currentTable = 'data_(ACE)';
    }

    // 현재 DB에서 핵심 통계 요약 생성
    buildDataContext() {
        try {
            const ctx = [];

            // 테이블별 요약
            const tables = ['data_(ACE)', 'data_(ESSA)'];
            tables.forEach(tbl => {
                try {
                    const brand = tbl.includes('ACE') ? 'ACE' : 'ESSA';

                    // 전체 기간 매출 합계
                    const totalR = this.db.exec(`SELECT SUM(할인가), COUNT(*), SUM(수량) FROM "${tbl}"`);
                    if (totalR.length > 0 && totalR[0].values[0][0]) {
                        const [total, cnt, qty] = totalR[0].values[0];
                        ctx.push(`[${brand}] 전체 매출합계: ${Math.round(total).toLocaleString()}원, 거래건수: ${cnt}건, 판매수량: ${qty}개`);
                    }

                    // 연도별 매출
                    const yearR = this.db.exec(`SELECT YEAR, SUM(할인가), COUNT(*), SUM("MG") FROM "${tbl}" WHERE YEAR IS NOT NULL GROUP BY YEAR ORDER BY YEAR DESC LIMIT 3`);
                    if (yearR.length > 0) {
                        yearR[0].values.forEach(([yr, sum, cnt, mg]) => {
                            if (yr && sum) {
                                const mrate = (mg && sum > 0) ? ` 마진율 ${(mg/sum*100).toFixed(1)}%` : '';
                                ctx.push(`[${brand}] ${yr}년 매출: ${Math.round(sum).toLocaleString()}원 (${cnt}건)${mrate}`);
                            }
                        });
                    }

                    // 최근 월 매출 (최신 연도 기준)
                    const latestYearR = this.db.exec(`SELECT MAX(YEAR) FROM "${tbl}"`);
                    if (latestYearR.length > 0 && latestYearR[0].values[0][0]) {
                        const latestYear = latestYearR[0].values[0][0];
                        const monthR = this.db.exec(`SELECT MONTH, SUM(할인가), COUNT(*) FROM "${tbl}" WHERE YEAR=${latestYear} GROUP BY MONTH ORDER BY MONTH DESC LIMIT 3`);
                        if (monthR.length > 0) {
                            monthR[0].values.forEach(([mo, sum, cnt]) => {
                                if (mo && sum) ctx.push(`[${brand}] ${latestYear}년 ${mo}월 매출: ${Math.round(sum).toLocaleString()}원 (${cnt}건)`);
                            });
                        }
                    }

                    // 판매자별 매출 TOP3
                    const sellerR = this.db.exec(`SELECT 판매자, SUM(할인가), COUNT(*) FROM "${tbl}" WHERE 판매자 IS NOT NULL GROUP BY 판매자 ORDER BY SUM(할인가) DESC LIMIT 3`);
                    if (sellerR.length > 0) {
                        sellerR[0].values.forEach(([seller, sum, cnt]) => {
                            if (seller && sum) ctx.push(`[${brand}] 판매자 ${seller}: ${Math.round(sum).toLocaleString()}원 (${cnt}건)`);
                        });
                    }
                } catch(e) { /* 테이블 없으면 스킵 */ }
            });

            return ctx.length > 0 ? ctx.join('\n') : '데이터 없음';
        } catch(e) {
            return '데이터 로드 오류';
        }
    }

    // 필터 적용된 컨텍스트 (현재 선택된 조건 반영)
    buildFilteredContext(year, month, brand) {
        try {
            const tbl = brand === 'ACE' ? 'data_(ACE)' : 'data_(ESSA)';
            const ctx = [];
            let where = 'WHERE 1=1';
            if (year) where += ` AND YEAR=${year}`;
            if (month) where += ` AND MONTH=${month}`;

            const label = `${brand}${year ? ' ' + year + '년' : ''}${month ? ' ' + month + '월' : ''}`;

            const r = this.db.exec(`SELECT SUM(할인가), COUNT(*), SUM(수량), AVG(할인가) FROM "${tbl}" ${where}`);
            if (r.length > 0 && r[0].values[0][0]) {
                const [total, cnt, qty, avg] = r[0].values[0];
                ctx.push(`현재 조회 조건 [${label}]: 매출 ${Math.round(total).toLocaleString()}원, ${cnt}건, 수량 ${qty}개, 평균거래액 ${Math.round(avg).toLocaleString()}원`);
            }

            // 구매용도별
            const purposeR = this.db.exec(`SELECT 구매용도, SUM(할인가), COUNT(*) FROM "${tbl}" ${where} AND 구매용도 IS NOT NULL GROUP BY 구매용도 ORDER BY SUM(할인가) DESC LIMIT 5`);
            if (purposeR.length > 0) {
                purposeR[0].values.forEach(([p, s, c]) => {
                    if (p && s) ctx.push(`구매용도 [${p}]: ${Math.round(s).toLocaleString()}원 (${c}건)`);
                });
            }

            // 지역별 TOP3
            const regionR = this.db.exec(`SELECT 지역1, SUM(할인가), COUNT(*) FROM "${tbl}" ${where} AND 지역1 IS NOT NULL GROUP BY 지역1 ORDER BY SUM(할인가) DESC LIMIT 3`);
            if (regionR.length > 0) {
                regionR[0].values.forEach(([r2, s, c]) => {
                    if (r2 && s) ctx.push(`지역 [${r2}]: ${Math.round(s).toLocaleString()}원 (${c}건)`);
                });
            }

            // 마진 정보 (MG = 건당 마진액, 마진율 = SUM(MG)/SUM(할인가)*100)
            const mgR = this.db.exec(`SELECT SUM("MG"), SUM(할인가), COUNT(*) FROM "${tbl}" ${where} AND "MG" IS NOT NULL AND "MG" != 0`);
            if (mgR.length > 0 && mgR[0].values[0][0]) {
                const [mgSum, salesSum, cnt] = mgR[0].values[0];
                const marginRate = salesSum > 0 ? (mgSum / salesSum * 100).toFixed(1) : 0;
                ctx.push(`마진합계: ${Math.round(mgSum).toLocaleString()}원, 마진율: ${marginRate}% (마진있는 건수: ${cnt}건)`);
            }

            return ctx.join('\n');
        } catch(e) {
            return '';
        }
    }

    // 시스템 프롬프트 생성 - 필터 조건 반영
    buildSystemPrompt(brand, year, month) {
        const tbl = (brand === 'ESSA') ? 'data_(ESSA)' : 'data_(ACE)';
        const brandName = (brand === 'ESSA') ? 'ESSA(소파/가구)' : 'ACE(침대)';
        const periodLabel = `${year ? year + '년' : '전체 기간'} ${month ? month + '월' : '전체 월'}`;

        // 필터 조건 WHERE 절 구성
        let where = 'WHERE 1=1';
        if (year) where += ` AND YEAR=${year}`;
        if (month) where += ` AND MONTH=${month}`;

        const ctx = [];
        ctx.push(`=== 현재 분석 조건 ===`);
        ctx.push(`브랜드: ${brandName}`);
        ctx.push(`기간: ${periodLabel}`);
        ctx.push('');
        ctx.push(`=== 해당 조건의 실제 데이터 ===`);

        try {
            // 기본 집계
            const r = this.db.exec(`SELECT SUM(할인가), COUNT(*), SUM(수량), SUM("MG") FROM "${tbl}" ${where}`);
            if (r.length > 0 && r[0].values[0][0]) {
                const [sales, cnt, qty, mg] = r[0].values[0];
                const mrate = (mg && sales > 0) ? (mg/sales*100).toFixed(1) : 'N/A';
                ctx.push(`총 매출: ${Math.round(sales).toLocaleString()}원`);
                ctx.push(`거래 건수: ${cnt}건`);
                ctx.push(`판매 수량: ${qty}개`);
                ctx.push(`마진 합계: ${mg ? Math.round(mg).toLocaleString() : 'N/A'}원`);
                ctx.push(`마진율: ${mrate}%`);
                ctx.push(`평균 거래액: ${Math.round(sales/cnt).toLocaleString()}원`);
            } else {
                ctx.push('해당 조건의 데이터가 없습니다.');
            }

            // 월별 매출 (연도 선택 시)
            if (year && !month) {
                const mR = this.db.exec(`SELECT MONTH, SUM(할인가), COUNT(*), SUM("MG") FROM "${tbl}" ${where} GROUP BY MONTH ORDER BY MONTH`);
                if (mR.length > 0 && mR[0].values.length > 0) {
                    ctx.push('');
                    ctx.push(`[${year}년 월별 매출]`);
                    mR[0].values.forEach(([mo, s, c, mg]) => {
                        const mr = (mg && s > 0) ? ` 마진율 ${(mg/s*100).toFixed(1)}%` : '';
                        ctx.push(`  ${mo}월: ${Math.round(s).toLocaleString()}원 (${c}건)${mr}`);
                    });
                }
            }

            // 판매자별
            const sR = this.db.exec(`SELECT 판매자, SUM(할인가), COUNT(*), SUM("MG") FROM "${tbl}" ${where} AND 판매자 IS NOT NULL GROUP BY 판매자 ORDER BY SUM(할인가) DESC`);
            if (sR.length > 0 && sR[0].values.length > 0) {
                ctx.push('');
                ctx.push('[판매자별 실적]');
                sR[0].values.forEach(([seller, s, c, mg]) => {
                    const mr = (mg && s > 0) ? ` 마진율 ${(mg/s*100).toFixed(1)}%` : '';
                    ctx.push(`  ${seller}: ${Math.round(s).toLocaleString()}원 (${c}건)${mr}`);
                });
            }

            // 구매용도별
            const pR = this.db.exec(`SELECT 구매용도, SUM(할인가), COUNT(*) FROM "${tbl}" ${where} AND 구매용도 IS NOT NULL GROUP BY 구매용도 ORDER BY SUM(할인가) DESC`);
            if (pR.length > 0 && pR[0].values.length > 0) {
                ctx.push('');
                ctx.push('[구매용도별]');
                pR[0].values.forEach(([p, s, c]) => {
                    ctx.push(`  ${p}: ${Math.round(s).toLocaleString()}원 (${c}건)`);
                });
            }

            // 지역별 TOP5
            const rR = this.db.exec(`SELECT 지역1, SUM(할인가), COUNT(*) FROM "${tbl}" ${where} AND 지역1 IS NOT NULL GROUP BY 지역1 ORDER BY SUM(할인가) DESC LIMIT 5`);
            if (rR.length > 0 && rR[0].values.length > 0) {
                ctx.push('');
                ctx.push('[지역별 TOP5]');
                rR[0].values.forEach(([reg, s, c]) => {
                    ctx.push(`  ${reg}: ${Math.round(s).toLocaleString()}원 (${c}건)`);
                });
            }

            // 전년 동기 비교 (연도+월 선택 시)
            if (year && month) {
                const prevYear = parseInt(year) - 1;
                const prevR = this.db.exec(`SELECT SUM(할인가), COUNT(*), SUM("MG") FROM "${tbl}" WHERE YEAR=${prevYear} AND MONTH=${month}`);
                if (prevR.length > 0 && prevR[0].values[0][0]) {
                    const [ps, pc, pmg] = prevR[0].values[0];
                    const pmr = (pmg && ps > 0) ? ` 마진율 ${(pmg/ps*100).toFixed(1)}%` : '';
                    ctx.push('');
                    ctx.push(`[전년 동기 비교] ${prevYear}년 ${month}월: ${Math.round(ps).toLocaleString()}원 (${pc}건)${pmr}`);
                }
            }

        } catch(e) {
            ctx.push(`데이터 조회 오류: ${e.message}`);
        }

        return `당신은 침대/가구 판매 전문 매출 분석 AI 어시스턴트입니다.

${ctx.join('\n')}

[데이터 구조 안내]
- MG(마진액): 건당 실제 마진 금액
- 마진율 = SUM(MG) / SUM(할인가) × 100
- ACE: 침대 브랜드, ESSA: 소파/가구 브랜드

분석 시 준수사항:
- 위 데이터에 기반한 구체적인 수치를 제시하세요
- 반드시 한국어로 답변하세요
- 데이터에 없는 내용은 추측임을 명시하세요
- 간결하고 실용적으로 작성하세요`;
    }

    // Ollama API 호출
    async callOllama(userMessage) {
        // 현재 선택된 필터 읽기
        const brand = document.getElementById('aiCtxBrand')?.value || 'ACE';
        const year  = document.getElementById('aiCtxYear')?.value  || '';
        const month = document.getElementById('aiCtxMonth')?.value || '';
        const selectedModel = document.getElementById('aiCtxModel')?.value || this.model;

        // 브랜드 ALL이면 ACE+ESSA 각각 프롬프트 생성
        let systemPrompt;
        if (brand === 'ALL') {
            const acePrompt = this.buildSystemPrompt('ACE', year, month);
            const essaPrompt = this.buildSystemPrompt('ESSA', year, month);
            systemPrompt = acePrompt + '\n\n' + essaPrompt.split('===')[1] || essaPrompt;
        } else {
            systemPrompt = this.buildSystemPrompt(brand, year, month);
        }

        const fullPrompt = `${systemPrompt}\n\n사용자 질문: ${userMessage}`;

        const body = JSON.stringify({
            model: selectedModel,
            prompt: fullPrompt,
            stream: false,
            options: { temperature: 0.3, num_predict: 1024 }
        });

        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: body
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`API 오류: ${response.status} - ${err}`);
        }

        const data = await response.json();
        return data.response || '응답을 받지 못했습니다.';
    }

    render() {
        const container = document.getElementById('aiTab');
        if (!container) return;
        container.innerHTML = `
        <style>
            .ai-wrap { background: white; border-radius: 15px; padding: 24px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: calc(100vh - 220px); min-height: 500px; }
            .ai-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 2px solid #e9ecef; flex-shrink: 0; }
            .ai-header-icon { font-size: 2em; }
            .ai-header-title { font-size: 1.4em; font-weight: 700; color: #333; }
            .ai-header-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600; }
            .ai-context-bar { background: #f0f4ff; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; font-size: 0.9em; color: #555; display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
            .ai-context-bar select { padding: 6px 10px; border: 1px solid #c5cae9; border-radius: 6px; font-size: 0.9em; background: white; cursor: pointer; }
            .ai-context-bar label { font-weight: 600; color: #667eea; }            .ai-quick-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; flex-shrink: 0; }
            .ai-quick-btn { padding: 8px 14px; background: #f0f4ff; border: 1px solid #c5cae9; border-radius: 20px; font-size: 0.85em; cursor: pointer; color: #667eea; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
            .ai-quick-btn:hover { background: #667eea; color: white; border-color: #667eea; }
            .ai-messages { flex: 1; overflow-y: auto; padding: 8px 4px; display: flex; flex-direction: column; gap: 16px; }
            .ai-msg { display: flex; gap: 12px; align-items: flex-start; }
            .ai-msg.user { flex-direction: row-reverse; }
            .ai-msg-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1em; flex-shrink: 0; }
            .ai-msg.ai .ai-msg-avatar { background: linear-gradient(135deg, #667eea, #764ba2); }
            .ai-msg.user .ai-msg-avatar { background: linear-gradient(135deg, #43e97b, #38f9d7); }
            .ai-msg-bubble { max-width: 75%; padding: 12px 16px; border-radius: 16px; font-size: 0.95em; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
            .ai-msg.ai .ai-msg-bubble { background: #f8f9fa; color: #333; border-bottom-left-radius: 4px; }
            .ai-msg.user .ai-msg-bubble { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-bottom-right-radius: 4px; }
            .ai-msg-time { font-size: 0.75em; color: #aaa; margin-top: 4px; }
            .ai-typing { display: flex; gap: 5px; align-items: center; padding: 12px 16px; background: #f8f9fa; border-radius: 16px; border-bottom-left-radius: 4px; }
            .ai-typing span { width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: typing 1.2s infinite; }
            .ai-typing span:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
            .ai-input-area { display: flex; gap: 10px; margin-top: 16px; flex-shrink: 0; }
            .ai-input { flex: 1; padding: 14px 18px; border: 2px solid #e1e5e9; border-radius: 25px; font-size: 0.95em; outline: none; resize: none; font-family: inherit; transition: border-color 0.2s; max-height: 120px; overflow-y: auto; }
            .ai-input:focus { border-color: #667eea; }
            .ai-send-btn { width: 50px; height: 50px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2em; transition: transform 0.2s; flex-shrink: 0; align-self: flex-end; }
            .ai-send-btn:hover { transform: scale(1.1); }
            .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
            .ai-empty { text-align: center; padding: 60px 20px; color: #aaa; }
            .ai-empty-icon { font-size: 4em; margin-bottom: 16px; }
            .ai-empty-text { font-size: 1.1em; font-weight: 600; margin-bottom: 8px; color: #888; }
            .ai-empty-sub { font-size: 0.9em; }
            @media (max-width: 768px) {
                .ai-wrap { height: calc(100vh - 180px); padding: 16px; }
                .ai-msg-bubble { max-width: 88%; font-size: 0.9em; }
                .ai-quick-btns { gap: 6px; }
                .ai-quick-btn { font-size: 0.8em; padding: 6px 10px; }
            }
        </style>
        <div class="ai-wrap">
            <div class="ai-header">
                <div class="ai-header-icon">🤖</div>
                <div>
                    <div class="ai-header-title">AI 매출 분석 어시스턴트</div>
                </div>
                <div class="ai-header-badge">EXAONE 3.5</div>
                <button id="aiClearBtn" style="margin-left:auto;padding:6px 14px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;cursor:pointer;font-size:0.85em;color:#6c757d;">대화 초기화</button>
            </div>
            <div class="ai-context-bar">
                <label>📊 분석 기준:</label>
                <select id="aiCtxBrand"><option value="ACE">ACE</option><option value="ESSA">ESSA</option><option value="ALL">전체</option></select>
                <select id="aiCtxYear"><option value="">전체 기간</option></select>
                <select id="aiCtxMonth">
                    <option value="">전체 월</option>
                    <option value="1">1월</option><option value="2">2월</option><option value="3">3월</option>
                    <option value="4">4월</option><option value="5">5월</option><option value="6">6월</option>
                    <option value="7">7월</option><option value="8">8월</option><option value="9">9월</option>
                    <option value="10">10월</option><option value="11">11월</option><option value="12">12월</option>
                </select>
                <label style="margin-left:8px;">🤖 모델:</label>
                <select id="aiCtxModel">
                    <option value="exaone3.5:7.8b">EXAONE 3.5 (한국어 최적)</option>
                    <option value="deepseek-r1:8b">DeepSeek R1 (추론 특화)</option>
                    <option value="gemma2:9b">Gemma2 9B (균형)</option>
                    <option value="gemma2:2b">Gemma2 2B (빠름)</option>
                    <option value="llama3.2:3b">Llama 3.2 3B (빠름)</option>
                    <option value="phi3:mini">Phi3 Mini (경량)</option>
                    <option value="qwen2.5-coder:7b">Qwen2.5 Coder 7B</option>
                </select>
                <span id="aiCtxStatus" style="color:#667eea;font-weight:600;font-size:0.85em;">✅ 데이터 연결됨</span>
            </div>
            <div class="ai-quick-btns">
                <button class="ai-quick-btn" data-q="이번 달 매출 현황을 분석해줘">📈 매출 현황</button>
                <button class="ai-quick-btn" data-q="판매자별 실적을 비교 분석해줘">👤 판매자 분석</button>
                <button class="ai-quick-btn" data-q="지역별 판매 특성을 분석해줘">📍 지역 분석</button>
                <button class="ai-quick-btn" data-q="마진율이 낮은 원인을 분석하고 개선 방안을 제안해줘">💰 마진 분석</button>
                <button class="ai-quick-btn" data-q="전년 동기 대비 매출 변화를 분석해줘">📅 전년 비교</button>
                <button class="ai-quick-btn" data-q="매출 증대를 위한 전략을 제안해줘">💡 전략 제안</button>
            </div>
            <div class="ai-messages" id="aiMessages">
                <div class="ai-empty">
                    <div class="ai-empty-icon">💬</div>
                    <div class="ai-empty-text">무엇이든 물어보세요</div>
                    <div class="ai-empty-sub">위 빠른 질문 버튼을 클릭하거나 직접 입력하세요</div>
                </div>
            </div>
            <div class="ai-input-area">
                <textarea class="ai-input" id="aiInput" placeholder="매출 데이터에 대해 질문하세요..." rows="1"></textarea>
                <button class="ai-send-btn" id="aiSendBtn">➤</button>
            </div>
        </div>`;

        this.setupEventListeners();
        this.loadContextFilters();
    }

    loadContextFilters() {
        try {
            const yearSel = document.getElementById('aiCtxYear');
            if (!yearSel) return;
            const tables = ['data_(ACE)', 'data_(ESSA)'];
            const years = new Set();
            tables.forEach(tbl => {
                try {
                    const r = this.db.exec(`SELECT DISTINCT YEAR FROM "${tbl}" WHERE YEAR IS NOT NULL ORDER BY YEAR DESC`);
                    if (r.length > 0) r[0].values.forEach(([y]) => years.add(y));
                } catch(e) {}
            });
            Array.from(years).sort((a,b) => b-a).forEach(y => {
                yearSel.innerHTML += `<option value="${y}">${y}년</option>`;
            });
            // 현재 연도 기본 선택
            const now = new Date().getFullYear();
            if (years.has(now)) yearSel.value = now;
        } catch(e) {}
    }

    setupEventListeners() {
        // 전송 버튼
        document.getElementById('aiSendBtn').addEventListener('click', () => this.sendMessage());

        // Enter 키 (Shift+Enter는 줄바꿈)
        document.getElementById('aiInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 자동 높이 조절
        document.getElementById('aiInput').addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });

        // 빠른 질문 버튼
        document.querySelectorAll('.ai-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const q = btn.getAttribute('data-q');
                document.getElementById('aiInput').value = q;
                this.sendMessage();
            });
        });

        // 대화 초기화
        document.getElementById('aiClearBtn').addEventListener('click', () => {
            this.chatHistory = [];
            document.getElementById('aiMessages').innerHTML = `
                <div class="ai-empty">
                    <div class="ai-empty-icon">💬</div>
                    <div class="ai-empty-text">대화가 초기화되었습니다</div>
                    <div class="ai-empty-sub">새로운 질문을 입력하세요</div>
                </div>`;
        });

        // 모델 변경 시 배지 업데이트
        document.getElementById('aiCtxModel')?.addEventListener('change', (e) => {
            const badge = document.querySelector('.ai-header-badge');
            if (badge) {
                const labels = {
                    'exaone3.5:7.8b': 'EXAONE 3.5',
                    'deepseek-r1:8b': 'DeepSeek R1',
                    'gemma2:9b': 'Gemma2 9B',
                    'gemma2:2b': 'Gemma2 2B',
                    'llama3.2:3b': 'Llama 3.2',
                    'phi3:mini': 'Phi3 Mini',
                    'qwen2.5-coder:7b': 'Qwen2.5 Coder'
                };
                badge.textContent = labels[e.target.value] || e.target.value;
            }
        });
    }

    async sendMessage() {
        if (this.isLoading) return;
        const input = document.getElementById('aiInput');
        const msg = input.value.trim();
        if (!msg) return;

        input.value = '';
        input.style.height = 'auto';
        this.isLoading = true;

        const messagesEl = document.getElementById('aiMessages');

        // 빈 상태 제거
        const empty = messagesEl.querySelector('.ai-empty');
        if (empty) empty.remove();

        // 사용자 메시지 추가 (현재 분석 조건 표시)
        const brand = document.getElementById('aiCtxBrand')?.value || 'ACE';
        const year  = document.getElementById('aiCtxYear')?.value  || '';
        const month = document.getElementById('aiCtxMonth')?.value || '';
        const condLabel = `${brand} / ${year ? year+'년' : '전체'} / ${month ? month+'월' : '전체'}`;
        this.appendMessage('user', msg, condLabel);

        // 타이핑 인디케이터
        const typingId = 'typing-' + Date.now();
        messagesEl.innerHTML += `
            <div class="ai-msg ai" id="${typingId}">
                <div class="ai-msg-avatar">🤖</div>
                <div class="ai-typing"><span></span><span></span><span></span></div>
            </div>`;
        messagesEl.scrollTop = messagesEl.scrollHeight;

        document.getElementById('aiSendBtn').disabled = true;

        try {
            // 현재 컨텍스트 필터 읽기 (callOllama 내부에서 직접 읽음)
            const reply = await this.callOllama(msg);

            // 타이핑 제거 후 응답 추가
            document.getElementById(typingId)?.remove();
            this.appendMessage('ai', reply);

        } catch(e) {
            document.getElementById(typingId)?.remove();
            this.appendMessage('ai', `❌ 오류가 발생했습니다: ${e.message}\n\n잠시 후 다시 시도해주세요.`);
        }

        this.isLoading = false;
        document.getElementById('aiSendBtn').disabled = false;
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    appendMessage(role, content, condLabel = '') {
        const messagesEl = document.getElementById('aiMessages');
        const now = new Date().toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'});
        const isUser = role === 'user';
        const avatar = isUser ? '👤' : '🤖';
        const badge = (isUser && condLabel)
            ? `<div style="font-size:0.75em;color:#a78bfa;margin-bottom:4px;text-align:right;">📊 ${condLabel}</div>`
            : '';

        const div = document.createElement('div');
        div.className = `ai-msg ${role}`;
        div.innerHTML = `
            <div class="ai-msg-avatar">${avatar}</div>
            <div style="max-width:75%">
                ${badge}
                <div class="ai-msg-bubble">${this.escapeHtml(content)}</div>
                <div class="ai-msg-time" style="text-align:${isUser?'right':'left'}">${now}</div>
            </div>`;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }
}

window.AIAssistantModule = AIAssistantModule;
