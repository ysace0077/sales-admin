// Supabase → SQL.js 브릿지 레이어
// Supabase에서 데이터를 가져와 메모리 내 SQL.js DB에 로드
// 기존 모듈의 this.db.exec() 호출을 그대로 유지하기 위한 호환 레이어

const SUPABASE_CONFIG = {
    url: 'https://cepeweianvazyigbyyem.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcGV3ZWlhbnZhenlpZ2J5eWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODgzNTcsImV4cCI6MjA4ODI2NDM1N30.myJ1UMgzW-2bTQ2pqBIQoMApLeym-qVGS-zA7YM9UVY'
};

// Supabase 테이블명 → SQLite 테이블명 매핑
// Supabase: data_ACE, data_ESSA
// SQLite (기존 코드): "data_(ACE)", "data_(ESSA)"
const TABLE_MAP = {
    supabaseToSqlite: {
        'data_ACE': 'data_(ACE)',
        'data_ESSA': 'data_(ESSA)'
    },
    sqliteToSupabase: {
        'data_(ACE)': 'data_ACE',
        'data_(ESSA)': 'data_ESSA'
    }
};

class SupabaseDBLoader {
    constructor() {
        this.supabase = null;
        this.SQL = null;
        this.db = null;
    }

    async init(progressCallback) {
        const progress = progressCallback || (() => {});

        // 1. Supabase 클라이언트 초기화
        progress('Supabase 클라이언트 초기화 중...');
        this.supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

        // 2. SQL.js 초기화
        progress('SQL.js 엔진 초기화 중...');
        this.SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });

        // 3. 메모리 DB 생성
        this.db = new this.SQL.Database();

        // 4. Supabase에서 데이터 로드 → SQLite 테이블 생성
        await this.loadTable('data_ACE', progress);
        await this.loadTable('data_ESSA', progress);

        progress('데이터 로드 완료!');
        return { db: this.db, SQL: this.SQL };
    }

    async loadTable(supabaseTable, progress) {
        const sqliteTable = TABLE_MAP.supabaseToSqlite[supabaseTable];
        progress(`${supabaseTable} 데이터 로드 중...`);

        // Supabase에서 전체 데이터 가져오기 (페이지네이션)
        let allData = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await this.supabase
                .from(supabaseTable)
                .select('*')
                .range(from, from + pageSize - 1);

            if (error) {
                console.error(`${supabaseTable} 로드 오류:`, error);
                progress(`⚠️ ${supabaseTable} 로드 실패: ${error.message}`);
                return;
            }

            if (data && data.length > 0) {
                allData = allData.concat(data);
                from += pageSize;
                progress(`${supabaseTable}: ${allData.length}건 로드됨...`);
                if (data.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
        }

        if (allData.length === 0) {
            progress(`${supabaseTable}: 데이터 없음`);
            // 빈 테이블이라도 생성
            this.db.run(`CREATE TABLE IF NOT EXISTS "${sqliteTable}" (id INTEGER PRIMARY KEY)`);
            return;
        }

        progress(`${supabaseTable}: ${allData.length}건 → SQLite 변환 중...`);

        // 컬럼 추출 (id, created_at 제외)
        const excludeCols = new Set(['id', 'created_at']);
        const columns = Object.keys(allData[0]).filter(c => !excludeCols.has(c));

        // Supabase → SQLite 컬럼명 리매핑 (엑셀 원본명 복원)
        const colRenameMap = {
            'M_G': 'MG',
            'D_Cpercent': 'D_Cpercent'
        };

        // 숫자로 저장해야 하는 컬럼 (리매핑 후 이름 기준)
        const numericCols = new Set([
            'YEAR', 'MONTH', 'DAYS', '수량', '고객CT', '건수',
            '정상가', '할인가', '카드', '현금', '지역상품권', '카드형상품권',
            'QR결제', '잔금', '출고가', '공급가', '배송비', '카드수수료',
            '사은품비', 'MG', '합계', '섬섬페이', '네이버페이'
        ]);

        // SQLite 컬럼명 (리매핑 적용)
        const sqliteColumns = columns.map(c => colRenameMap[c] || c);

        // SQLite 테이블 생성 (리매핑된 컬럼명 사용)
        const colDefs = sqliteColumns.map(c => {
            return numericCols.has(c) ? `"${c}" REAL` : `"${c}" TEXT`;
        }).join(', ');
        this.db.run(`CREATE TABLE IF NOT EXISTS "${sqliteTable}" (${colDefs})`);

        // 데이터 삽입 (배치) - 원본 컬럼명으로 값 읽고, 리매핑된 컬럼명으로 저장
        const placeholders = sqliteColumns.map(() => '?').join(', ');
        const insertSQL = `INSERT INTO "${sqliteTable}" (${sqliteColumns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
        
        this.db.run('BEGIN TRANSACTION');
        try {
            for (const row of allData) {
                const values = columns.map((c, i) => {
                    const val = row[c];
                    const sqliteCol = sqliteColumns[i];
                    if (val === null || val === undefined) return null;
                    if (numericCols.has(sqliteCol)) {
                        // 문자열인 경우 콤마 제거 후 숫자 변환
                        let cleaned = String(val).replace(/,/g, '').trim();
                        if (cleaned === '' || cleaned === 'None' || cleaned === 'null' || cleaned === 'nan' || cleaned === 'NaN') return null;
                        const num = parseFloat(cleaned);
                        return isNaN(num) ? null : num;
                    }
                    return String(val);
                });
                this.db.run(insertSQL, values);
            }
            this.db.run('COMMIT');
        } catch (e) {
            this.db.run('ROLLBACK');
            console.error(`${supabaseTable} 삽입 오류:`, e);
            progress(`⚠️ ${supabaseTable} 삽입 실패: ${e.message}`);
        }

        // 실제 컬럼명 확인 로그
        const actualColumns = Object.keys(allData[0]);
        console.log(`[${supabaseTable}] 전체 컬럼명:`, actualColumns);
        const mgRelated = actualColumns.filter(c => c.toUpperCase().includes('MG') || c.includes('마진') || c.includes('margin'));
        console.log(`[${supabaseTable}] MG 관련 컬럼:`, mgRelated);
        
        // MG 컬럼 디버깅
        if (allData.length > 0 && allData[0].hasOwnProperty('MG')) {
            const mgSamples = allData.slice(0, 20).map(r => r['MG']);
            console.log(`[${supabaseTable}] MG 원본 샘플(20건):`, mgSamples);
            const mgNonNull = allData.filter(r => r['MG'] !== null && r['MG'] !== undefined && r['MG'] !== '' && r['MG'] !== 'None').length;
            console.log(`[${supabaseTable}] MG 유효 데이터: ${mgNonNull}/${allData.length}건`);
        } else {
            console.log(`[${supabaseTable}] ⚠ MG 컬럼이 데이터에 존재하지 않음!`);
        }

        progress(`✅ ${supabaseTable}: ${allData.length}건 로드 완료`);
    }
}

// 전역 인스턴스
window.SupabaseDBLoader = SupabaseDBLoader;
