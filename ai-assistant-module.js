// AI 매출 분석 어시스턴트 모듈 (v2 - 자연어 기반 동적 컨텍스트)
// 설계 핵심:
//  1) UI 필터 드롭다운 제거 → 모델 선택만 유지
//  2) 사용자 자연어 질문에서 엔티티(브랜드/연도/월/비교) 추출
//  3) 추출 결과로 SQL을 동적 실행해 필요한 데이터만 컨텍스트로 주입
//  4) 빠른 질문 버튼은 시점/브랜드가 자연어로 명시된 완전한 문장
//  5) 멀티턴 대화 지원
class AIAssistantModule {
    constructor(db, SQL) {
        this.db = db;
        this.SQL = SQL;
        this.apiKey = 'sk-c47d975549724aa69122b84db54dd4cb';
        this.apiUrl = 'https://yeosusquare.cloud/ollama/api/generate';
        this.model = 'exaone3.5:7.8b';
        this.chatHistory = [];   // 멀티턴 대화 누적
        this.isLoading = false;
        this._cachedSellers = null;
        this._cachedRegions = null;
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
            hasYoY: false,        // 전년 동기 비교 키워드
            hasMoM: false,        // 전월 비교
            hasTrend: false,      // 추이/흐름
            hasMargin: false,     // 마진 분석
            hasRanking: false,    // 순위/TOP/베스트
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
        if (ent.brands.length === 0) ent.brands = ['ACE', 'ESSA']; // 미지정 시 양쪽

        // 절대 연도
        const yMatch = t.match(/20\d{2}/g);
        if (yMatch) ent.years.push(...yMatch.map(Number));
        // 상대 연도
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

        // 판매자/지역 매칭 (DB에 저장된 실제 값과 부분 일치)
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
    // 2-A. 단일 (브랜드, 연도, 월) 집계 - 비교 사전 계산용
    //   ※ 건수는 실제 DB 컬럼(SUM(건수))이며 행 개수(COUNT(*))와 다름
    //     데이터 존재 여부는 COUNT(*)로 판단해 SUM이 NULL인 케이스와 구분
    // ─────────────────────────────────────────────────────────────
    queryMonth(tbl, year, month) {
        try {
            const r = this.db.exec(`SELECT COUNT(*) as rows, SUM(할인가) as sales, SUM(건수) as orders, SUM(수량) as qty, SUM("MG") as mg FROM "${tbl}" WHERE YEAR=${year} AND MONTH=${month}`);
            if (r.length > 0) {
                const [rows, sales, orders, qty, mg] = r[0].values[0];
                if (!rows || rows === 0) return null; // 행 자체가 없음
                const cnt = orders || 0;
                const salesNum = sales || 0;
                const avg = cnt > 0 ? salesNum / cnt : 0;
                return { sales: salesNum, cnt: cnt, qty: qty || 0, mg: mg || 0, avg: avg, rows: rows };
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
                return { sales: salesNum, cnt: cnt, qty: qty || 0, mg: mg || 0, avg: avg, rows: rows };
            }
        } catch (e) {
            console.warn('[AI] queryYear error', tbl, year, e);
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────
    // 2-B. 핵심 비교 블록 (YoY/MoM 사전 계산)
    //   - 모델이 산수를 하지 않도록 모든 증감을 JS에서 계산
    // ─────────────────────────────────────────────────────────────
    buildComparisonBlock(ent) {
        if (!ent.hasYoY && !ent.hasMoM) return '';

        const lines = ['========== 🔥 핵심 비교 결과 (사전 계산됨 — 이 수치를 그대로 사용) =========='];
        const brandList = ent.brands.length > 0 ? ent.brands : ['ACE', 'ESSA'];

        // 비교 기준 시점 결정
        // 연도+월 모두 명시된 경우: 해당 시점 기준
        // 연도만 명시: 연도 단위 비교
        // 월만 명시: 최신 연도 기준 + 그 월
        // 둘 다 미지정: 최신 데이터 기준 (현재 월)
        let baseYears = [...ent.years];
        let baseMonths = [...ent.months];

        if (baseYears.length === 0) {
            // 최신 연도 자동 선택
            const candidates = brandList.map(b => {
                const tbl = b === 'ESSA' ? 'data_(ESSA)' : 'data_(ACE)';
                try {
                    const r = this.db.exec(`SELECT MAX(YEAR) FROM "${tbl}"`);
                    return (r.length > 0 && r[0].values[0][0]) ? r[0].values[0][0] : null;
                } catch (e) { return null; }
            }).filter(Boolean);
            if (candidates.length > 0) baseYears = [Math.max(...candidates)];
        }
        if (baseMonths.length === 0 && ent.hasYoY) {
            // 연도 비교만 하는 경우 (월 전체)
            // baseMonths 빈 채로 두고 연도 단위 비교
        }

        let hasAnyComparison = false;

        for (const brand of brandList) {
            const tbl = brand === 'ESSA' ? 'data_(ESSA)' : 'data_(ACE)';
            const label = brand === 'ESSA' ? 'ESSA(소파/가구)' : 'ACE(침대)';

            // ─ 월 단위 비교 (특정 연도 + 특정 월)
            if (baseYears.length > 0 && baseMonths.length > 0) {
                for (const ty of baseYears) {
                    for (const tm of baseMonths) {
                        // 비교 대상 시점 결정
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

            // ─ 연도 단위 비교 (월 미지정, YoY)
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

    // ─────────────────────────────────────────────────────────────
    // 2-C. 보조 컨텍스트 빌드
    // ─────────────────────────────────────────────────────────────
    buildContext(ent) {
        const out = [];

        // 비교 모드면 전년/전월 자동 확장
        const targetYears = [...ent.years];
        if (ent.hasYoY) {
            ent.years.forEach(y => { if (!targetYears.includes(y - 1)) targetYears.push(y - 1); });
        }
        // 명시 연도 없으면 최근 2년 자동
        let useRecent = targetYears.length === 0;

        for (const brand of ent.brands) {
            const tbl = brand === 'ESSA' ? 'data_(ESSA)' : 'data_(ACE)';
            const label = brand === 'ESSA' ? 'ESSA(소파/가구)' : 'ACE(침대)';
            out.push(`\n========== ${label} ==========`);

            // 연도 범위 결정
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

            // ▶ 전체 요약 (항상 포함)
            try {
                const r = this.db.exec(`SELECT SUM(할인가), SUM(건수), SUM(수량), SUM("MG"), MIN(YEAR), MAX(YEAR) FROM "${tbl}"`);
                if (r.length > 0 && r[0].values[0][0]) {
                    const [s, c, q, mg, miy, mxy] = r[0].values[0];
                    const mr = (mg && s > 0) ? (mg / s * 100).toFixed(1) : 'N/A';
                    out.push(`▶ 전체 누적 (${miy}~${mxy}년)`);
                    out.push(`  매출 ${this.fmt(s)}원 / ${this.fmt(c)}건 / ${this.fmt(q)}개 / 마진율 ${mr}%`);
                }
            } catch (e) {}

            // ▶ 연도별 (전체 연도)
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

            // ▶ 월별 매출 (대상 연도)
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

            // ▶ 특정 월 핀포인트 (브랜드 × 연도 × 월 교차)
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

                    // 지정 월의 판매자별 상세
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

            // ▶ 판매자별 실적 (대상 연도 또는 전체)
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

            // ▶ 지역별 TOP10
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

            // ▶ 구매용도별
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

            // ▶ 특정 판매자/지역이 명시된 경우 추가 상세
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

    fmt(n) {
        if (n === null || n === undefined || isNaN(n)) return '-';
        return Math.round(n).toLocaleString();
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

        // 추출된 조건 요약 (모델 가이드용)
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
    // 4. Ollama API 호출
    // ─────────────────────────────────────────────────────────────
    async callOllama(userMessage) {
        const selectedModel = document.getElementById('aiCtxModel')?.value || this.model;
        const systemPrompt = this.buildSystemPrompt(userMessage);

        // 멀티턴: 직전 1~2턴만 포함 (컨텍스트 폭주 방지)
        let history = '';
        if (this.chatHistory.length > 0) {
            const recent = this.chatHistory.slice(-4);
            history = '\n\n[이전 대화 요약]\n' + recent.map(h => {
                const tag = h.role === 'user' ? '사용자' : 'AI';
                const c = h.content.length > 300 ? h.content.slice(0, 300) + '…' : h.content;
                return `${tag}: ${c}`;
            }).join('\n');
        }

        const fullPrompt = `${systemPrompt}${history}\n\n사용자 질문: ${userMessage}`;

        const body = JSON.stringify({
            model: selectedModel,
            prompt: fullPrompt,
            stream: false,
            options: { temperature: 0.1, num_predict: 1536, top_p: 0.9, repeat_penalty: 1.1 }
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

    // ─────────────────────────────────────────────────────────────
    // 5. UI 렌더링
    // ─────────────────────────────────────────────────────────────
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
            .ai-context-bar label { font-weight: 600; color: #667eea; }
            .ai-quick-btns { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; flex-shrink: 0; }
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
            .ai-detected { font-size: 0.75em; color: #888; margin-top: 4px; padding: 4px 8px; background: #f5f5f5; border-radius: 6px; display: inline-block; }
            .ai-typing { display: flex; gap: 5px; align-items: center; padding: 12px 16px; background: #f8f9fa; border-radius: 16px; border-bottom-left-radius: 4px; }
            .ai-typing span { width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: typing 1.2s infinite; }
            .ai-typing span:nth-child(2) { animation-delay: 0.2s; }
            .ai-typing span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typing { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
            .ai-input-area { display: flex; gap: 10px; margin-top: 16px; flex-shrink: 0; }
            .ai-input { flex: 1; padding: 14px 18px; border: 2px solid #e1e5e9; border-radius: 25px; font-size: 0.95em; outline: none; resize: none; font-family: inherit; transition: border-color 0.2s; max-height: 120px; overflow-y: auto; }
            .ai-input:focus { border-color: #667eea; }
            .ai-send-btn { width: 50px; height: 50px; background: linear-gradient(135deg, #667eea, #764ba2); border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2em; transition: transform 0.2s; flex-shrink: 0; align-self: flex-end; color: white; }
            .ai-send-btn:hover { transform: scale(1.1); }
            .ai-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
            .ai-empty { text-align: center; padding: 60px 20px; color: #aaa; }
            .ai-empty-icon { font-size: 4em; margin-bottom: 16px; }
            .ai-empty-text { font-size: 1.1em; font-weight: 600; margin-bottom: 8px; color: #888; }
            .ai-empty-sub { font-size: 0.9em; }
            .ai-tip { font-size: 0.8em; color: #888; margin-top: 4px; flex-basis: 100%; }
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
                <div class="ai-header-badge" id="aiModelBadge">EXAONE 3.5</div>
                <button id="aiClearBtn" style="margin-left:auto;padding:6px 14px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;cursor:pointer;font-size:0.85em;color:#6c757d;">대화 초기화</button>
            </div>
            <div class="ai-context-bar">
                <label>🤖 모델:</label>
                <select id="aiCtxModel">
                    <option value="exaone3.5:7.8b">EXAONE 3.5 7.8B (한국어 최적) ⭐</option>
                    <option value="gemma2:9b">Gemma2 9B (균형형)</option>
                    <option value="hermes3:8b">Hermes 3 8B (대화 특화)</option>
                    <option value="deepseek-r1:8b">DeepSeek R1 8B (추론 특화)</option>
                    <option value="qwen2.5-coder:7b">Qwen2.5 Coder 7B (분석/수식)</option>
                    <option value="qwen2.5:3b">Qwen2.5 3B (빠름)</option>
                    <option value="llama3.2:3b">Llama 3.2 3B (빠름)</option>
                    <option value="gemma2:2b">Gemma2 2B (경량)</option>
                    <option value="phi3:mini">Phi3 Mini (경량)</option>
                </select>
                <span id="aiCtxStatus" style="color:#667eea;font-weight:600;font-size:0.85em;margin-left:8px;">✅ 데이터 연결됨</span>
                <div class="ai-tip">💡 질문에 브랜드(ACE/ESSA), 연도, 월, "전년 비교" 등을 자연어로 적어주세요. AI가 알아서 인식합니다.</div>
            </div>
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
            <div class="ai-messages" id="aiMessages">
                <div class="ai-empty">
                    <div class="ai-empty-icon">💬</div>
                    <div class="ai-empty-text">자연어로 자유롭게 물어보세요</div>
                    <div class="ai-empty-sub">예) "ACE 2025년 6월 매출을 작년 같은 달과 비교해줘"<br>"ESSA 올해 월별 흐름과 마진율 추이"</div>
                </div>
            </div>
            <div class="ai-input-area">
                <textarea class="ai-input" id="aiInput" placeholder="자연어로 질문하세요. 예: ACE 2025년 6월 전년 동기 비교..." rows="1"></textarea>
                <button class="ai-send-btn" id="aiSendBtn">➤</button>
            </div>
        </div>`;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('aiSendBtn').addEventListener('click', () => this.sendMessage());

        document.getElementById('aiInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('aiInput').addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });

        document.querySelectorAll('.ai-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const q = btn.getAttribute('data-q');
                document.getElementById('aiInput').value = q;
                this.sendMessage();
            });
        });

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
            const labels = {
                'exaone3.5:7.8b': 'EXAONE 3.5',
                'gemma2:9b': 'Gemma2 9B',
                'hermes3:8b': 'Hermes 3',
                'deepseek-r1:8b': 'DeepSeek R1',
                'qwen2.5-coder:7b': 'Qwen2.5 Coder',
                'qwen2.5:3b': 'Qwen2.5 3B',
                'llama3.2:3b': 'Llama 3.2',
                'gemma2:2b': 'Gemma2 2B',
                'phi3:mini': 'Phi3 Mini'
            };
            const badge = document.getElementById('aiModelBadge');
            if (badge) badge.textContent = labels[e.target.value] || e.target.value;
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
        const empty = messagesEl.querySelector('.ai-empty');
        if (empty) empty.remove();

        // 자연어에서 추출된 조건 미리보기 (사용자 확인용)
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

        // 타이핑 인디케이터
        const typingId = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'ai-msg ai';
        typingDiv.id = typingId;
        typingDiv.innerHTML = `
            <div class="ai-msg-avatar">🤖</div>
            <div class="ai-typing"><span></span><span></span><span></span></div>`;
        messagesEl.appendChild(typingDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        document.getElementById('aiSendBtn').disabled = true;

        try {
            const reply = await this.callOllama(msg);
            document.getElementById(typingId)?.remove();
            this.appendMessage('ai', reply);

            // 멀티턴 대화 이력 누적
            this.chatHistory.push({ role: 'user', content: msg });
            this.chatHistory.push({ role: 'ai', content: reply });
            // 최대 8턴(16개 메시지)만 유지
            if (this.chatHistory.length > 16) {
                this.chatHistory = this.chatHistory.slice(-16);
            }
        } catch (e) {
            document.getElementById(typingId)?.remove();
            this.appendMessage('ai', `❌ 오류가 발생했습니다: ${e.message}\n\n잠시 후 다시 시도해주세요.`);
        }

        this.isLoading = false;
        document.getElementById('aiSendBtn').disabled = false;
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    appendMessage(role, content, detectedLabel = '') {
        const messagesEl = document.getElementById('aiMessages');
        const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        const isUser = role === 'user';
        const avatar = isUser ? '👤' : '🤖';
        const detectedHtml = (isUser && detectedLabel)
            ? `<div class="ai-detected" style="text-align:right;float:right;">${this.escapeHtml(detectedLabel)}</div><div style="clear:both;"></div>`
            : '';

        const div = document.createElement('div');
        div.className = `ai-msg ${role}`;
        div.innerHTML = `
            <div class="ai-msg-avatar">${avatar}</div>
            <div style="max-width:75%">
                ${detectedHtml}
                <div class="ai-msg-bubble">${this.escapeHtml(content)}</div>
                <div class="ai-msg-time" style="text-align:${isUser ? 'right' : 'left'}">${now}</div>
            </div>`;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
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
