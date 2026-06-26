// AI 매출 분석 어시스턴트 모듈 (v4 - Open WebUI 연동 최적화)
// 설계 핵심:
//  1) Open WebUI의 Ollama 프록시 경로(/ollama/api) 사용
//  2) 동일 출처(yeosusquare.cloud) 호출로 CORS 문제 완전 해결
//  3) 사용자 자연어 질문에서 엔티티(브랜드/연도/월/비교) 추출
//  4) 추출 결과로 SQL을 동적 실행해 필요한 데이터만 컨텍스트로 주입
//  5) 스트리밍 응답 + 멀티턴 대화 지원

class AIAssistantModule {
    constructor(db, SQL) {
        this.db = db;
        this.SQL = SQL;
        // ✅ Open WebUI의 Ollama 프록시 API 경로 (CORS 문제 없음)
        // 주의: "yeosuquare"가 아니라 "yeosusquare"입니다!
        this.ollamaBaseUrl = 'https://yeosusquare.cloud/ollama/api';
        this.defaultModel = 'exaone3.5:7.8b';
        this.chatHistory = [];
        this.isLoading = false;
        this._cachedSellers = null;
        this._cachedRegions = null;
        this.ollamaConnected = false;
        this.availableModels = [];
    }

    // ─────────────────────────────────────────────────────────────
    // 1. 자연어에서 분석 조건(엔티티) 추출
    // ─────────────────────────────────────────────────────────────
    extractEntities(text) {
        const ent = {
            brands: [],
            years: [],
            months: [],
            sellers: [],
            regions: [],
            hasYoY: false,
            hasMoM: false,
            hasTrend: false,
            hasMargin: false,
            hasRanking: false,
        };
        const t = text || '';
        const now = new Date();
        const curY = now.getFullYear();
        const curM = now.getMonth() + 1;

        // 브랜드
        if (/\bACE\b|에이스|침대/i.test(t)) ent.brands.push('ACE');
        if (/\bESSA\b|에싸|에사|소파|가구/i.test(t)) ent.brands.push('ESSA');
        if (/양\s*브랜드|두\s*브랜드|전체\s*브랜드|모든\s*브랜드|both/i.test(t)) {
            ent.brands = ['ACE', 'ESSA'];
        }
        if (ent.brands.length === 0) ent.brands = ['ACE', 'ESSA'];

        // 절대 연도
        const yMatch = t.match(/20\d{2}/g);
        if (yMatch) ent.years.push(...yMatch.map(Number));
        if (/올해|금년|이번\s*해/.test(t)) ent.years.push(curY);
        if (/작년|지난\s*해|전년(?!\s*동)/.test(t)) ent.years.push(curY - 1);
        if (/재작년/.test(t)) ent.years.push(curY - 2);

        // 월
        const mMatch = t.match(/(\d{1,2})\s*월/g);
        if (mMatch) {
            mMatch.forEach(m => {
                const num = parseInt(m);
                if (num >= 1 && num <= 12) ent.months.push(num);
            });
        }
        if (/이번\s*달|금월|이달/.test(t)) ent.months.push(curM);
        if (/지난\s*달|전월/.test(t)) ent.months.push(curM === 1 ? 12 : curM - 1);

        // 비교/분석 키워드
        if (/전년\s*동(기|월|기간)|작년\s*같은|YoY|전년\s*대비|작년\s*대비/i.test(t)) ent.hasYoY = true;
        if (/전월\s*대비|MoM|지난\s*달\s*대비/i.test(t)) ent.hasMoM = true;
        if (/추이|흐름|트렌드|변화|증감|성장/.test(t)) ent.hasTrend = true;
        if (/마진|수익|이익률|마진율/.test(t)) ent.hasMargin = true;
        if (/TOP|베스트|상위|순위|랭킹|많이/i.test(t)) ent.hasRanking = true;

        // 중복 제거
        ent.years = [...new Set(ent.years)].sort((a, b) => a - b);
        ent.months = [...new Set(ent.months)].sort((a, b) => a - b);

        // 판매자 매칭
        try {
            if (!this._cachedSellers) {
                const sellers = new Set();
                ['data_(ACE)', 'data_(ESSA)'].forEach(tbl => {
                    try {
                        const r = this.db.exec(`SELECT DISTINCT 판매자 FROM "${tbl}" WHERE 판매자 IS NOT NULL`);
                        if (r.length > 0) r[0].values.forEach(([s]) => s && sellers.add(s));
                    } catch (e) {}
                });
                this._cachedSellers = [...sellers];
            }
            this._cachedSellers.forEach(s => {
                if (s && t.includes(s)) ent.sellers.push(s);
            });
        } catch (e) {}

        // 지역 매칭
        try {
            if (!this._cachedRegions) {
                const regions = new Set();
                ['data_(ACE)', 'data_(ESSA)'].forEach(tbl => {
                    try {
                        const r = this.db.exec(`SELECT DISTINCT 지역1 FROM "${tbl}" WHERE 지역1 IS NOT NULL`);
                        if (r.length > 0) r[0].values.forEach(([s]) => s && regions.add(s));
                    } catch (e) {}
                });
                this._cachedRegions = [...regions];
            }
            this._cachedRegions.forEach(rg => {
                if (rg && t.includes(rg)) ent.regions.push(rg);
            });
        } catch (e) {}

        return ent;
    }

    // ─────────────────────────────────────────────────────────────
    // 2-A. 단일 (브랜드, 연도, 월) 집계
    // ─────────────────────────────────────────────────────────────
    queryMonth(tbl, year, month) {
        try {
            const r = this.db.exec(`SELECT COUNT(*) as rows, SUM(할인가) as sales, SUM(건수) as orders, SUM(수량) as qty, SUM("MG") as mg FROM "${tbl}" WHERE YEAR=${year} AND MONTH=${month}`);
            if (r.length > 0) {
                const [rows, sales, orders, qty, mg] = r[0].values[0];
                if (!rows || rows === 0) return null;
                const cnt = orders || 0;
                const salesNum = sales || 0;
                const avg = cnt > 0 ? salesNum / cnt : 0;
                return { sales: salesNum, cnt, qty: qty || 0, mg: mg || 0, avg, rows };
            }
        } catch (e) {
            console.warn('[AI] queryMonth error', tbl, year, month, e);
        }
        return null;
    }

    queryYear(tbl, year) {
        try {
            const r = this.db.exec(`SELECT COUNT(*) as rows, SUM(할인가) as sales, SUM(건수) as orders, SUM(수량) as qty, SUM("MG") as mg FROM "${tbl}" WHERE YEAR=${year}`);
            if (r.length > 0) {
                const [rows, sales, orders, qty, mg] = r[0].values[0];
                if (!rows || rows === 0) return null;
                const cnt = orders || 0;
                const salesNum = sales || 0;
                const avg = cnt > 0 ? salesNum / cnt : 0;
                return { sales: salesNum, cnt, qty: qty || 0, mg: mg || 0, avg, rows };
            }
        } catch (e) {
            console.warn('[AI] queryYear error', tbl, year, e);
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────
    // 2-B. 핵심 비교 블록 (YoY/MoM 사전 계산)
    // ─────────────────────────────────────────────────────────────
    buildComparisonBlock(ent) {
        if (!ent.hasYoY && !ent.hasMoM) return '';

        const lines = ['========== 🔥 핵심 비교 결과 (사전 계산됨 — 이 수치를 그대로 사용) =========='];
        const brandList = ent.brands.length > 0 ? ent.brands : ['ACE', 'ESSA'];

        let baseYears = [...ent.years];
        let baseMonths = [...ent.months];

        if (baseYears.length === 0) {
            const candidates = brandList.map(b => {
                const tbl = b === 'ESSA' ? 'data_(ESSA)' : 'data_(ACE)';
                try {
                    const r = this.db.exec(`SELECT MAX(YEAR) FROM "${tbl}"`);
                    return (r.length > 0 && r[0].values[0][0]) ? r[0].values[0][0] : null;
                } catch (e) { return null; }
            }).filter(Boolean);
            if (candidates.length > 0) baseYears = [Math.max(...candidates)];
        }

        let hasAnyComparison = false;

        for (const brand of brandList) {
            const tbl = brand === 'ESSA' ? 'data_(ESSA)' : 'data_(ACE)';
            const label = brand === 'ESSA' ? 'ESSA(소파/가구)' : 'ACE(침대)';

            if (baseYears.length > 0 && baseMonths.length > 0) {
                for (const ty of baseYears) {
                    for (const tm of baseMonths) {
                        let cmpY = ty, cmpM = tm, cmpTag = '';
                        if (ent.hasYoY) { cmpY = ty - 1; cmpTag = '전년 동월'; }
                        else if (ent.hasMoM) {
                            if (tm === 1) { cmpY = ty - 1; cmpM = 12; }
                            else { cmpM = tm - 1; }
                            cmpTag = '전월';
                        }

                        const cur = this.queryMonth(tbl, ty, tm);
                        const prev = this.queryMonth(tbl, cmpY, cmpM);

                        lines.push(`\n[${label}] ${ty}년 ${tm}월 vs ${cmpY}년 ${cmpM}월 (${cmpTag} 비교)`);

                        if (!cur && !prev) {
                            lines.push(`  ⚠ 양쪽 시점 모두 데이터 없음`);
                            hasAnyComparison = true;
                            continue;
                        }
                        if (!cur) {
                            lines.push(`  ⚠ 당기(${ty}-${tm}) 데이터 없음`);
                            if (prev) lines.push(`  전년 매출: ${this.fmt(prev.sales)}원 / ${this.fmt(prev.cnt)}건`);
                            hasAnyComparison = true;
                            continue;
                        }
                        if (!prev) {
                            lines.push(`  당기(${ty}-${tm}): 매출 ${this.fmt(cur.sales)}원 / ${this.fmt(cur.cnt)}건 / 수량 ${this.fmt(cur.qty)}개`);
                            lines.push(`  ⚠ 전년(${cmpY}-${cmpM}) 데이터 없음 → 비교 불가`);
                            hasAnyComparison = true;
                            continue;
                        }

                        const dSales = cur.sales - prev.sales;
                        const pSales = prev.sales > 0 ? (dSales / prev.sales * 100) : null;
                        const dCnt = cur.cnt - prev.cnt;
                        const pCnt = prev.cnt > 0 ? (dCnt / prev.cnt * 100) : null;
                        const dQty = cur.qty - prev.qty;
                        const curMr = cur.sales > 0 ? (cur.mg / cur.sales * 100) : 0;
                        const prevMr = prev.sales > 0 ? (prev.mg / prev.sales * 100) : 0;
                        const curAvg = cur.cnt > 0 ? (cur.sales / cur.cnt) : 0;
                        const prevAvg = prev.cnt > 0 ? (prev.sales / prev.cnt) : 0;
                        const dAvg = curAvg - prevAvg;
                        const pAvg = prevAvg > 0 ? (dAvg / prevAvg * 100) : null;

                        lines.push(`  당기(${ty}-${tm}): 매출 ${this.fmt(cur.sales)}원 / ${this.fmt(cur.cnt)}건 / 수량 ${this.fmt(cur.qty)}개 / 마진율 ${curMr.toFixed(1)}% / 평균거래 ${this.fmt(curAvg)}원`);
                        lines.push(`  전기(${cmpY}-${cmpM}): 매출 ${this.fmt(prev.sales)}원 / ${this.fmt(prev.cnt)}건 / 수량 ${this.fmt(prev.qty)}개 / 마진율 ${prevMr.toFixed(1)}% / 평균거래 ${this.fmt(prevAvg)}원`);
                        lines.push(`  ▶ 매출 증감: ${this.signedFmt(dSales)}원 ${pSales !== null ? '(' + this.signedPct(pSales) + ')' : ''}`);
                        lines.push(`  ▶ 건수 증감: ${this.signedFmt(dCnt)}건 ${pCnt !== null ? '(' + this.signedPct(pCnt) + ')' : ''}`);
                        lines.push(`  ▶ 수량 증감: ${this.signedFmt(dQty)}개`);
                        lines.push(`  ▶ 마진율 변화: ${this.signedNum((curMr - prevMr).toFixed(1))}%p`);
                        lines.push(`  ▶ 평균거래액 증감: ${this.signedFmt(dAvg)}원 ${pAvg !== null ? '(' + this.signedPct(pAvg) + ')' : ''}`);
                        hasAnyComparison = true;
                    }
                }
            }

            if (baseYears.length > 0 && baseMonths.length === 0 && ent.hasYoY) {
                for (const ty of baseYears) {
                    const cmpY = ty - 1;
                    const cur = this.queryYear(tbl, ty);
                    const prev = this.queryYear(tbl, cmpY);

                    lines.push(`\n[${label}] ${ty}년 vs ${cmpY}년 (연도 전체 비교)`);

                    if (!cur && !prev) {
                        lines.push(`  ⚠ 양쪽 연도 모두 데이터 없음`);
                        hasAnyComparison = true;
                        continue;
                    }
                    if (!cur || !prev) {
                        lines.push(`  ⚠ 한쪽 연도 데이터 없음 → 비교 불가`);
                        if (cur) lines.push(`  ${ty}년: 매출 ${this.fmt(cur.sales)}원 / ${this.fmt(cur.cnt)}건`);
                        if (prev) lines.push(`  ${cmpY}년: 매출 ${this.fmt(prev.sales)}원 / ${this.fmt(prev.cnt)}건`);
                        hasAnyComparison = true;
                        continue;
                    }

                    const dSales = cur.sales - prev.sales;
                    const pSales = prev.sales > 0 ? (dSales / prev.sales * 100) : null;
                    const dCnt = cur.cnt - prev.cnt;
                    const pCnt = prev.cnt > 0 ? (dCnt / prev.cnt * 100) : null;
                    const curMr = cur.sales > 0 ? (cur.mg / cur.sales * 100) : 0;
                    const prevMr = prev.sales > 0 ? (prev.mg / prev.sales * 100) : 0;

                    lines.push(`  ${ty}년: 매출 ${this.fmt(cur.sales)}원 / ${this.fmt(cur.cnt)}건 / 수량 ${this.fmt(cur.qty)}개 / 마진율 ${curMr.toFixed(1)}%`);
                    lines.push(`  ${cmpY}년: 매출 ${this.fmt(prev.sales)}원 / ${this.fmt(prev.cnt)}건 / 수량 ${this.fmt(prev.qty)}개 / 마진율 ${prevMr.toFixed(1)}%`);
                    lines.push(`  ▶ 매출 증감: ${this.signedFmt(dSales)}원 ${pSales !== null ? '(' + this.signedPct(pSales) + ')' : ''}`);
                    lines.push(`  ▶ 건수 증감: ${this.signedFmt(dCnt)}건 ${pCnt !== null ? '(' + this.signedPct(pCnt) + ')' : ''}`);
                    lines.push(`  ▶ 마진율 변화: ${this.signedNum((curMr - prevMr).toFixed(1))}%p`);
                    hasAnyComparison = true;
                }
            }
        }

        if (!hasAnyComparison) return '';
        return lines.join('\n');
    }

    signedFmt(n) {
        const sign = n >= 0 ? '+' : '';
        return sign + this.fmt(n);
    }

    signedNum(n) {
        const num = Number(n);
        return num >= 0 ? '+' + num : String(num);
    }

    signedPct(p) {
        return (p >= 0 ? '+' : '') + p.toFixed(1) + '%';
    }

    fmt(n) {
        if (n === null || n === undefined || isNaN(n)) return '-';
        return Math.round(n).toLocaleString();
    }

    // ─────────────────────────────────────────────────────────────
    // 2-C. 보조 컨텍스트 빌드
    // ─────────────────────────────────────────────────────────────
    buildContext(ent) {
        const out = [];

        const targetYears = [...ent.years];
        if (ent.hasYoY) {
            ent.years.forEach(y => { if (!targetYears.includes(y - 1)) targetYears.push(y - 1); });
        }
        let useRecent = targetYears.length === 0;

        for (const brand of ent.brands) {
            const tbl = brand === 'ESSA' ? 'data_(ESSA)' : 'data_(ACE)';
            const label = brand === 'ESSA' ? 'ESSA(소파/가구)' : 'ACE(침대)';
            out.push(`\n========== ${label} ==========`);

            let yearWhere = '';
            let yearList = [];
            try {
                if (useRecent) {
                    const maxR = this.db.exec(`SELECT MAX(YEAR) FROM "${tbl}"`);
                    if (maxR.length > 0 && maxR[0].values[0][0]) {
                        const mx = maxR[0].values[0][0];
                        yearList = [mx - 1, mx];
                        yearWhere = `WHERE YEAR IN (${yearList.join(',')})`;
                    }
                } else {
                    yearList = targetYears;
                    yearWhere = `WHERE YEAR IN (${yearList.join(',')})`;
                }
            } catch (e) {}

            try {
                const r = this.db.exec(`SELECT SUM(할인가), SUM(건수), SUM(수량), SUM("MG"), MIN(YEAR), MAX(YEAR) FROM "${tbl}"`);
                if (r.length > 0 && r[0].values[0][0]) {
                    const [s, c, q, mg, miy, mxy] = r[0].values[0];
                    const mr = (mg && s > 0) ? (mg / s * 100).toFixed(1) : 'N/A';
                    out.push(`▶ 전체 누적 (${miy}~${mxy}년)`);
                    out.push(`  매출 ${this.fmt(s)}원 / ${this.fmt(c)}건 / ${this.fmt(q)}개 / 마진율 ${mr}%`);
                }
            } catch (e) {}

            try {
                const r = this.db.exec(`SELECT YEAR, SUM(할인가), SUM(건수), SUM("MG") FROM "${tbl}" WHERE YEAR IS NOT NULL GROUP BY YEAR ORDER BY YEAR`);
                if (r.length > 0 && r[0].values.length > 0) {
                    out.push(`▶ 연도별 매출`);
                    r[0].values.forEach(([y, s, c, mg]) => {
                        const mr = (mg && s > 0) ? (mg / s * 100).toFixed(1) : 'N/A';
                        out.push(`  ${y}년: ${this.fmt(s)}원 (${this.fmt(c)}건, 마진율 ${mr}%)`);
                    });
                }
            } catch (e) {}

            if (yearWhere) {
                try {
                    const r = this.db.exec(`SELECT YEAR, MONTH, SUM(할인가), SUM(건수), SUM("MG") FROM "${tbl}" ${yearWhere} AND MONTH IS NOT NULL GROUP BY YEAR, MONTH ORDER BY YEAR, MONTH`);
                    if (r.length > 0 && r[0].values.length > 0) {
                        out.push(`▶ ${yearList.join(', ')}년 월별 매출`);
                        r[0].values.forEach(([y, mo, s, c, mg]) => {
                            const mr = (mg && s > 0) ? (mg / s * 100).toFixed(1) : 'N/A';
                            out.push(`  ${y}년 ${mo}월: ${this.fmt(s)}원 (${this.fmt(c)}건, 마진율 ${mr}%)`);
                        });
                    }
                } catch (e) {}
            }

            if (ent.months.length > 0 && yearList.length > 0) {
                const yL = yearList.join(',');
                const mL = ent.months.join(',');
                try {
                    const r = this.db.exec(`SELECT YEAR, MONTH, SUM(할인가), SUM(건수), SUM(수량), SUM("MG") FROM "${tbl}" WHERE YEAR IN (${yL}) AND MONTH IN (${mL}) GROUP BY YEAR, MONTH ORDER BY YEAR, MONTH`);
                    if (r.length > 0 && r[0].values.length > 0) {
                        out.push(`▶ 지정 월 상세 (${ent.months.join(',')}월)`);
                        r[0].values.forEach(([y, mo, s, c, q, mg]) => {
                            const mr = (mg && s > 0) ? (mg / s * 100).toFixed(1) : 'N/A';
                            const avg = c > 0 ? s / c : 0;
                            out.push(`  ${y}년 ${mo}월: 매출 ${this.fmt(s)}원, ${this.fmt(c)}건, ${this.fmt(q)}개, 평균거래 ${this.fmt(avg)}원, 마진율 ${mr}%`);
                        });
                    }

                    const sR = this.db.exec(`SELECT YEAR, MONTH, 판매자, SUM(할인가), SUM(건수), SUM("MG") FROM "${tbl}" WHERE YEAR IN (${yL}) AND MONTH IN (${mL}) AND 판매자 IS NOT NULL GROUP BY YEAR, MONTH, 판매자 ORDER BY YEAR, MONTH, SUM(할인가) DESC`);
                    if (sR.length > 0 && sR[0].values.length > 0) {
                        out.push(`▶ 지정 월의 판매자별`);
                        sR[0].values.forEach(([y, mo, s, sum, c, mg]) => {
                            const mr = (mg && sum > 0) ? (mg / sum * 100).toFixed(1) : 'N/A';
                            out.push(`  ${y}년 ${mo}월 [${s}]: ${this.fmt(sum)}원 (${this.fmt(c)}건, 마진율 ${mr}%)`);
                        });
                    }
                } catch (e) {}
            }

            try {
                const where = yearWhere || 'WHERE 1=1';
                const r = this.db.exec(`SELECT 판매자, SUM(할인가), SUM(건수), SUM("MG") FROM "${tbl}" ${where} AND 판매자 IS NOT NULL GROUP BY 판매자 ORDER BY SUM(할인가) DESC LIMIT 10`);
                if (r.length > 0 && r[0].values.length > 0) {
                    out.push(`▶ 판매자별 실적${useRecent ? ' (최근 2년)' : ''}`);
                    r[0].values.forEach(([s, sum, c, mg]) => {
                        const mr = (mg && sum > 0) ? (mg / sum * 100).toFixed(1) : 'N/A';
                        out.push(`  ${s}: ${this.fmt(sum)}원 (${this.fmt(c)}건, 마진율 ${mr}%)`);
                    });
                }
            } catch (e) {}

            try {
                const where = yearWhere || 'WHERE 1=1';
                const r = this.db.exec(`SELECT 지역1, SUM(할인가), SUM(건수) FROM "${tbl}" ${where} AND 지역1 IS NOT NULL GROUP BY 지역1 ORDER BY SUM(할인가) DESC LIMIT 10`);
                if (r.length > 0 && r[0].values.length > 0) {
                    out.push(`▶ 지역별 TOP10${useRecent ? ' (최근 2년)' : ''}`);
                    r[0].values.forEach(([rg, s, c]) => {
                        out.push(`  ${rg}: ${this.fmt(s)}원 (${this.fmt(c)}건)`);
                    });
                }
            } catch (e) {}

            try {
                const where = yearWhere || 'WHERE 1=1';
                const r = this.db.exec(`SELECT 구매용도, SUM(할인가), SUM(건수) FROM "${tbl}" ${where} AND 구매용도 IS NOT NULL GROUP BY 구매용도 ORDER BY SUM(할인가) DESC`);
                if (r.length > 0 && r[0].values.length > 0) {
                    out.push(`▶ 구매용도별${useRecent ? ' (최근 2년)' : ''}`);
                    r[0].values.forEach(([p, s, c]) => {
                        out.push(`  ${p}: ${this.fmt(s)}원 (${this.fmt(c)}건)`);
                    });
                }
            } catch (e) {}

            if (ent.sellers.length > 0) {
                const list = ent.sellers.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
                try {
                    const r = this.db.exec(`SELECT 판매자, YEAR, SUM(할인가), SUM(건수), SUM("MG") FROM "${tbl}" WHERE 판매자 IN (${list}) GROUP BY 판매자, YEAR ORDER BY 판매자, YEAR`);
                    if (r.length > 0 && r[0].values.length > 0) {
                        out.push(`▶ 지정 판매자 연도별`);
                        r[0].values.forEach(([s, y, sum, c, mg]) => {
                            const mr = (mg && sum > 0) ? (mg / sum * 100).toFixed(1) : 'N/A';
                            out.push(`  [${s}] ${y}년: ${this.fmt(sum)}원 (${this.fmt(c)}건, 마진율 ${mr}%)`);
                        });
                    }
                } catch (e) {}
            }

            if (ent.regions.length > 0) {
                const list = ent.regions.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
                try {
                    const r = this.db.exec(`SELECT 지역1, YEAR, SUM(할인가), SUM(건수) FROM "${tbl}" WHERE 지역1 IN (${list}) GROUP BY 지역1, YEAR ORDER BY 지역1, YEAR`);
                    if (r.length > 0 && r[0].values.length > 0) {
                        out.push(`▶ 지정 지역 연도별`);
                        r[0].values.forEach(([rg, y, s, c]) => {
                            out.push(`  [${rg}] ${y}년: ${this.fmt(s)}원 (${this.fmt(c)}건)`);
                        });
                    }
                } catch (e) {}
            }
        }

        return out.join('\n');
    }

    // ─────────────────────────────────────────────────────────────
    // 3. 시스템 프롬프트 생성
    // ─────────────────────────────────────────────────────────────
    buildSystemPrompt(userMessage) {
        const ent = this.extractEntities(userMessage);
        const cmpBlock = this.buildComparisonBlock(ent);
        const ctx = this.buildContext(ent);
        const today = new Date();
        const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

        const detected = [];
        if (ent.brands.length > 0) detected.push(`브랜드=${ent.brands.join(',')}`);
        if (ent.years.length > 0) detected.push(`연도=${ent.years.join(',')}`);
        if (ent.months.length > 0) detected.push(`월=${ent.months.join(',')}`);
        if (ent.sellers.length > 0) detected.push(`판매자=${ent.sellers.join(',')}`);
        if (ent.regions.length > 0) detected.push(`지역=${ent.regions.join(',')}`);
        if (ent.hasYoY) detected.push('전년동기비교');
        if (ent.hasMoM) detected.push('전월비교');
        if (ent.hasTrend) detected.push('추이분석');
        if (ent.hasMargin) detected.push('마진분석');
        const detectedStr = detected.length > 0 ? detected.join(' / ') : '특정조건없음';

        const cmpSection = cmpBlock
            ? `\n${cmpBlock}\n\n⚠ 비교 질문이므로 위 [핵심 비교 결과] 블록의 수치를 그대로 사용하세요. 직접 계산하거나 추정하지 마세요.\n`
            : '';

        return `당신은 침대(ACE)/가구(ESSA) 판매 매출 분석 전문 AI 어시스턴트입니다. 오늘은 ${todayStr}입니다.

[데이터 구조]
- ACE: 침대 브랜드, ESSA: 소파/가구 브랜드
- 주요 컬럼: YEAR, MONTH, 할인가(매출액), 건수(거래건수), 수량, MG(건당 마진액), 판매자, 지역1, 구매용도
- ⚠ "건수"는 별도 컬럼이며 SUM(건수)로 집계됩니다 (행 개수가 아님)
- 마진율 = SUM(MG) / SUM(할인가) × 100
- 평균거래액 = SUM(할인가) / SUM(건수)

[질문에서 감지한 조건]
${detectedStr}
${cmpSection}
[감지된 조건에 맞춰 미리 집계한 데이터]
${ctx}

[★ 답변 규칙 - 반드시 준수 ★]
1. 위 [핵심 비교 결과]와 [집계 데이터]에 명시된 수치만 사용하세요. 데이터에 없는 수치는 절대 추정·생성하지 마세요.
2. 절대 직접 계산(덧셈·뺄셈·곱셈·나눗셈)하지 마세요. 증감액·증감률·마진율은 [핵심 비교 결과] 블록에 이미 계산되어 있으니 그 값을 그대로 인용하세요.
3. 데이터가 "데이터 없음"으로 표시된 경우 "해당 시점의 데이터가 데이터베이스에 없습니다"라고만 답하세요. 추정값을 만들어내지 마세요.
4. 한국어로 간결하고 실용적으로 작성하세요. 핵심 수치는 일반 텍스트로 명시하세요(불필요한 굵게 강조 금지).
5. 답변 마지막에 한 줄로 핵심 인사이트 또는 다음 분석 추천을 덧붙이세요.
6. 위에 제공되지 않은 비교 시점이 있다면 "해당 시점은 사전 집계 범위 밖입니다"라고 명시하세요.`;
    }

    // ─────────────────────────────────────────────────────────────
    // 4-A. Ollama 연결 상태 확인 (Open WebUI 프록시)
    // ─────────────────────────────────────────────────────────────
    async checkOllamaStatus() {
        try {
            const r = await fetch(`${this.ollamaBaseUrl}/tags`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });
            if (r.ok) {
                const data = await r.json();
                this.ollamaConnected = true;
                this.availableModels = (data.models || []).map(m => m.name);
                console.log(`✅ Ollama 연결 성공: ${this.ollamaBaseUrl}`);
                return this.availableModels;
            }
        } catch (e) {
            console.warn('[AI] 연결 실패:', e.message);
        }
        this.ollamaConnected = false;
        this.availableModels = ['exaone3.5:7.8b', 'qwen2.5:7b', 'qwen2.5:3b'];
        console.warn('⚠️ Ollama 연결 실패. fallback 모드로 동작합니다.');
        return this.availableModels;
    }

    // ─────────────────────────────────────────────────────────────
    // 4-B. Ollama API 호출 (스트리밍)
    // ─────────────────────────────────────────────────────────────
    async callOllama(userMessage, onChunk) {
        const selectedModel = document.getElementById('aiCtxModel')?.value || this.defaultModel;
        const systemPrompt = this.buildSystemPrompt(userMessage);

        const messages = [{ role: 'system', content: systemPrompt }];
        if (this.chatHistory.length > 0) {
            this.chatHistory.slice(-4).forEach(h => {
                const role = h.role === 'user' ? 'user' : 'assistant';
                const c = h.content.length > 600 ? h.content.slice(0, 600) + '…' : h.content;
                messages.push({ role, content: c });
            });
        }
        messages.push({ role: 'user', content: userMessage });

        const response = await fetch(`${this.ollamaBaseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedModel,
                messages,
                stream: true,
                options: { temperature: 0.1, top_p: 0.9, num_predict: 2048 }
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Ollama API 오류 (${response.status}): ${err.slice(0, 200)}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.trim());
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    const chunk = json.message?.content || '';
                    if (chunk) {
                        fullText += chunk;
                        if (onChunk) onChunk(fullText);
                    }
                    if (json.done) return fullText;
                } catch (e) {}
            }
        }
        return fullText || '응답을 받지 못했습니다.';
    }

    // ─────────────────────────────────────────────────────────────
    // 5. UI 렌더링
    // ─────────────────────────────────────────────────────────────
    async render() {
        const container = document.getElementById('aiTab');
        if (!container) return;

        const ollamaModels = await this.checkOllamaStatus();

        const connBadge = this.ollamaConnected
            ? `<span style="background:#d4edda;color:#155724;padding:4px 10px;border-radius:12px;font-size:0.8em;font-weight:600;">🟢 연결됨 (${this.ollamaBaseUrl})</span>`
            : `<span style="background:#f8d7da;color:#721c24;padding:4px 10px;border-radius:12px;font-size:0.8em;font-weight:600;">🔴 연결 안됨 (fallback 모드)</span>`;

        const fallbackModels = ['exaone3.5:7.8b', 'qwen2.5:7b', 'qwen2.5:3b', 'qwen2.5-coder:7b'];
        const modelList = ollamaModels.length > 0 ? ollamaModels : fallbackModels;
        const modelOptions = modelList.map(m => {
            const isDefault = m === this.defaultModel || m.startsWith('exaone3.5');
            return `<option value="${m}" ${isDefault ? 'selected' : ''}>${m}${isDefault ? ' ⭐' : ''}</option>`;
        }).join('');

        container.innerHTML = `
        <style>
            .ai-wrap { background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); display: flex; flex-direction: column; height: calc(100vh - 220px); min-height: 600px; }
            .ai-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid #e9ecef; flex-shrink: 0; flex-wrap: wrap; }
            .ai-header-icon { font-size: 2em; }
            .ai-header-title { font-size: 1.4em; font-weight: 700; color: #333; flex-grow: 1; }
            .ai-header-badge { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 600; }
            .ai-control-bar { background: #f0f4ff; border-radius: 10px; padding: 10px 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; flex-wrap: wrap; font-size: 0.9em; }
            .ai-control-bar label { font-weight: 600; color: #667eea; white-space: nowrap; }
            .ai-control-bar select { padding: 6px 10px; border: 1px solid #c5cae9; border-radius: 6px; background: white; cursor: pointer; font-size: 0.9em; min-width: 180px; }
            .ai-control-bar select:disabled { opacity: 0.5; cursor: not-allowed; }
            .ai-server-info { font-size: 0.8em; color: #888; margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            .ai-quick-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; flex-shrink: 0; }
            .ai-quick-btn { padding: 7px 12px; background: #f0f4ff; border: 1px solid #c5cae9; border-radius: 20px; font-size: 0.85em; cursor: pointer; color: #667eea; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
            .ai-quick-btn:hover { background: #667eea; color: white; border-color: #667eea; }
            .ai-main-area { flex: 1; display: flex; flex-direction: column; min-height: 0; }
            .ai-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 16px; background: #fafbfc; border-radius: 10px; border: 1px solid #e9ecef; }
            .ai-msg { display: flex; gap: 12px; align-items: flex-start; max-width: 92%; }
            .ai-msg.user { flex-direction: row-reverse; margin-left: auto; }
            .ai-msg.ai { margin-right: auto; }
            .ai-msg-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1em; flex-shrink: 0; }
            .ai-msg.ai .ai-msg-avatar { background: linear-gradient(135deg, #667eea, #764ba2); }
            .ai-msg.user .ai-msg-avatar { background: linear-gradient(135deg, #43e97b, #38f9d7); }
            .ai-msg-content { flex: 1; }
            .ai-msg-bubble { padding: 12px 16px; border-radius: 16px; font-size: 0.95em; line-height: 1.75; word-break: break-word; }
            .ai-msg.ai .ai-msg-bubble { background: white; color: #333; border: 1px solid #e9ecef; border-bottom-left-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            .ai-msg.user .ai-msg-bubble { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-bottom-right-radius: 4px; }
            .ai-msg-time { font-size: 0.75em; color: #aaa; margin-top: 4px; }
            .ai-detected { font-size: 0.75em; color: #888; margin-bottom: 4px; padding: 3px 8px; background: #f5f5f5; border-radius: 6px; display: inline-block; }
            .ai-typing { display: flex; gap: 5px; align-items: center; padding: 12px 16px; background: white; border-radius: 16px; border-bottom-left-radius: 4px; border: 1px solid #e9ecef; }
            .ai-typing span { width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: typing 1.2s infinite; }
            .ai-typing span:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
            .ai-input-area { display: flex; gap: 10px; margin-top: 12px; flex-shrink: 0; align-items: flex-end; }
            .ai-input { flex: 1; padding: 12px 16px; border: 2px solid #e1e5e9; border-radius: 20px; font-size: 0.95em; outline: none; resize: none; font-family: inherit; transition: border-color 0.2s; max-height: 120px; overflow-y: auto; }
            .ai-input:focus { border-color: #667eea; }
            .ai-send-btn { width: 46px; height: 46px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2em; transition: transform 0.2s; flex-shrink: 0; color: white; }
            .ai-send-btn:hover { transform: scale(1.05); }
            .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
            .ai-empty { text-align: center; padding: 60px 20px; color: #aaa; }
            .ai-empty-icon { font-size: 4em; margin-bottom: 16px; }
            .ai-empty-text { font-size: 1.1em; font-weight: 600; margin-bottom: 8px; color: #888; }
            .ai-empty-sub { font-size: 0.9em; line-height: 1.6; }
            .ai-offline-warn { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 10px 14px; font-size: 0.85em; color: #856404; margin-bottom: 12px; flex-shrink: 0; }
            @media (max-width: 768px) {
                .ai-wrap { height: calc(100vh - 180px); padding: 16px; }
                .ai-msg { max-width: 96%; }
                .ai-msg-bubble { font-size: 0.9em; }
                .ai-quick-btns { gap: 6px; }
                .ai-quick-btn { font-size: 0.8em; padding: 6px 10px; }
            }
        </style>
        <div class="ai-wrap">
            <div class="ai-header">
                <div class="ai-header-icon">🤖</div>
                <div class="ai-header-title">AI 매출 분석 어시스턴트</div>
                <div class="ai-header-badge" id="aiModelBadge">${this.defaultModel}</div>
                <button id="aiClearBtn" style="padding:6px 14px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;cursor:pointer;font-size:0.85em;color:#6c757d;">대화 초기화</button>
            </div>

            <div class="ai-control-bar">
                <label>🖥️ 모델:</label>
                <select id="aiCtxModel">
                    ${modelOptions}
                </select>
                <div class="ai-server-info">
                    <span>서버: ${this.ollamaBaseUrl}</span>
                    ${connBadge}
                    <button id="ollamaRefreshBtn" style="padding:4px 10px;background:white;border:1px solid #c5cae9;border-radius:6px;cursor:pointer;font-size:0.85em;">새로고침</button>
                </div>
                <div style="flex-basis:100%;font-size:0.8em;color:#888;margin-top:4px;">
                    💡 질문에 브랜드(ACE/ESSA), 연도, 월, "전년 비교" 등을 자연어로 적어주세요.
                </div>
            </div>

            ${!this.ollamaConnected ? `
            <div class="ai-offline-warn">
                ⚠️ Ollama 서버(${this.ollamaBaseUrl})에 연결할 수 없습니다.
                <br>🔧 fallback 모드로 일부 모델을 표시합니다. [새로고침]을 눌러 재시도하세요.
            </div>` : ''}

            <div class="ai-quick-btns">
                <button class="ai-quick-btn" data-q="ACE 2025년 6월 매출을 전년 동기와 비교 분석해줘">📊 ACE 6월 전년비교</button>
                <button class="ai-quick-btn" data-q="ESSA 올해 월별 매출 추이를 분석해줘">📈 ESSA 올해 추이</button>
                <button class="ai-quick-btn" data-q="ACE와 ESSA의 최근 2년 마진율을 비교 분석해줘">💰 양 브랜드 마진비교</button>
                <button class="ai-quick-btn" data-q="ACE 판매자별 실적 차이를 분석하고 상위 판매자의 강점을 추정해줘">👤 판매자 분석</button>
                <button class="ai-quick-btn" data-q="ACE 지역별 매출 TOP5와 그 특성을 분석해줘">📍 지역 TOP5</button>
                <button class="ai-quick-btn" data-q="ESSA 구매용도별 매출 비중과 시사점을 분석해줘">🛋️ 구매용도 분석</button>
                <button class="ai-quick-btn" data-q="양 브랜드 모두 작년 대비 올해 성장률을 분석해줘">🚀 성장률 비교</button>
                <button class="ai-quick-btn" data-q="매출 증대를 위한 구체적 전략을 제안해줘">💡 전략 제안</button>
            </div>

            <div class="ai-main-area">
                <div class="ai-messages" id="aiMessages">
                    <div class="ai-empty">
                        <div class="ai-empty-icon">💬</div>
                        <div class="ai-empty-text">자연어로 자유롭게 물어보세요</div>
                        <div class="ai-empty-sub">
                            예) "ACE 2025년 6월 매출을 작년 같은 달과 비교해줘"<br>
                            "ESSA 올해 월별 흐름과 마진율 추이"<br>
                            "판매자별 실적 TOP10 분석해줘"
                        </div>
                    </div>
                </div>
            </div>

            <div class="ai-input-area">
                <textarea class="ai-input" id="aiInput" placeholder="자연어로 질문하세요. (Shift+Enter: 줄바꿈)" rows="1"></textarea>
                <button class="ai-send-btn" id="aiSendBtn">➤</button>
            </div>
        </div>`;

        this.setupEventListeners();
    }

    // ─────────────────────────────────────────────────────────────
    // 6. 이벤트 리스너 설정
    // ─────────────────────────────────────────────────────────────
    setupEventListeners() {
        document.getElementById('aiSendBtn')?.addEventListener('click', () => this.sendMessage());

        document.getElementById('aiInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('aiInput')?.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });

        document.querySelectorAll('.ai-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const q = btn.getAttribute('data-q');
                const input = document.getElementById('aiInput');
                if (input) { input.value = q; }
                this.sendMessage();
            });
        });

        document.getElementById('aiClearBtn')?.addEventListener('click', () => {
            this.chatHistory = [];
            const messagesEl = document.getElementById('aiMessages');
            if (messagesEl) {
                messagesEl.innerHTML = `
                    <div class="ai-empty">
                        <div class="ai-empty-icon">💬</div>
                        <div class="ai-empty-text">대화가 초기화되었습니다</div>
                        <div class="ai-empty-sub">새로운 질문을 입력하세요</div>
                    </div>`;
            }
        });

        document.getElementById('aiCtxModel')?.addEventListener('change', (e) => {
            const badge = document.getElementById('aiModelBadge');
            if (badge) badge.textContent = e.target.value;
        });

        document.getElementById('ollamaRefreshBtn')?.addEventListener('click', async () => {
            const btn = document.getElementById('ollamaRefreshBtn');
            if (btn) { btn.textContent = '확인 중...'; btn.disabled = true; }
            await this.render();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 7. 메시지 전송 처리
    // ─────────────────────────────────────────────────────────────
    async sendMessage() {
        if (this.isLoading) return;

        const input = document.getElementById('aiInput');
        const msg = input?.value.trim();
        if (!msg) return;

        input.value = '';
        input.style.height = 'auto';
        this.isLoading = true;

        const messagesEl = document.getElementById('aiMessages');
        const empty = messagesEl?.querySelector('.ai-empty');
        if (empty) empty.remove();

        const ent = this.extractEntities(msg);
        const detected = [];
        if (ent.brands.length === 2) detected.push('양 브랜드');
        else if (ent.brands.length > 0) detected.push(ent.brands.join(','));
        if (ent.years.length > 0) detected.push(ent.years.join(',') + '년');
        if (ent.months.length > 0) detected.push(ent.months.join(',') + '월');
        if (ent.hasYoY) detected.push('전년비교');
        if (ent.hasMoM) detected.push('전월비교');
        const detectedLabel = detected.length > 0 ? `🔍 ${detected.join(' / ')}` : '';

        this.appendMessage('user', msg, detectedLabel);

        const typingId = 'typing-' + Date.now();
        const streamDiv = document.createElement('div');
        streamDiv.className = 'ai-msg ai';
        streamDiv.id = typingId;
        streamDiv.innerHTML = `
            <div class="ai-msg-avatar">🤖</div>
            <div class="ai-msg-content">
                <div class="ai-typing"><span></span><span></span><span></span></div>
            </div>`;
        messagesEl.appendChild(streamDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        const sendBtn = document.getElementById('aiSendBtn');
        if (sendBtn) sendBtn.disabled = true;

        try {
            let streamStarted = false;
            const bubbleId = `${typingId}-bubble`;

            const reply = await this.callOllama(msg, (text) => {
                const el = document.getElementById(typingId);
                if (el && !streamStarted) {
                    streamStarted = true;
                    el.querySelector('.ai-msg-content').innerHTML =
                        `<div class="ai-msg-bubble" id="${bubbleId}" style="white-space:pre-wrap;"></div>`;
                }
                const bubbleEl = document.getElementById(bubbleId);
                if (bubbleEl) bubbleEl.textContent = text;
                messagesEl.scrollTop = messagesEl.scrollHeight;
            });

            document.getElementById(typingId)?.remove();
            this.appendMessage('ai', reply);

            this.chatHistory.push({ role: 'user', content: msg });
            this.chatHistory.push({ role: 'ai', content: reply });
            if (this.chatHistory.length > 16) this.chatHistory = this.chatHistory.slice(-16);

        } catch (e) {
            document.getElementById(typingId)?.remove();
            this.appendMessage('ai', `❌ 오류: ${e.message}\n\n💡 [새로고침] 버튼을 눌러 재시도하세요.`);
            if (e.message.includes('fetch') || e.message.includes('Failed')) {
                this.ollamaConnected = false;
            }
        }

        this.isLoading = false;
        if (sendBtn) sendBtn.disabled = false;
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // ─────────────────────────────────────────────────────────────
    // 8. 메시지 렌더링 유틸
    // ─────────────────────────────────────────────────────────────
    appendMessage(role, content, detectedLabel = '') {
        const messagesEl = document.getElementById('aiMessages');
        if (!messagesEl) return;
        const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const isUser = role === 'user';
        const avatar = isUser ? '👤' : '🤖';
        const detectedHtml = (isUser && detectedLabel)
            ? `<div class="ai-detected">${this.escapeHtml(detectedLabel)}</div>`
            : '';

        const div = document.createElement('div');
        div.className = `ai-msg ${role}`;
        div.innerHTML = `
            <div class="ai-msg-avatar">${avatar}</div>
            <div class="ai-msg-content">
                ${detectedHtml}
                <div class="ai-msg-bubble">${this.formatMessage(content)}</div>
                <div class="ai-msg-time">${now}</div>
            </div>`;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    formatMessage(text) {
        let html = this.escapeHtml(text);
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');
        html = html.replace(/```(.+?)```/gs, '<code style="display:block;background:#f5f5f5;padding:8px;border-radius:4px;margin:4px 0;white-space:pre-wrap;">$1</code>');
        html = html.replace(/`(.+?)`/g, '<code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;">$1</code>');
        html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:#667eea;text-decoration:underline;">$1</a>');
        return html;
    }

    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }
}

window.AIAssistantModule = AIAssistantModule;