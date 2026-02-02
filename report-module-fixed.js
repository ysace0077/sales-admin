// 매출 리포트 모듈 (수정 버전)
class ReportModule {
    constructor(db, SQL) {
        this.db = db;
        this.SQL = SQL;
        this.charts = {};
        this.currentTable = "data_(ACE)";
    }
    
    // 모바일 최적화된 차트 옵션 생성
    getMobileOptimizedOptions(baseOptions = {}) {
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        
        const mobileOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: isMobile ? 'bottom' : 'top',
                    labels: {
                        font: {
                            size: isMobile ? 10 : 12
                        },
                        padding: isMobile ? 10 : 20,
                        usePointStyle: true,
                        boxWidth: isMobile ? 8 : 12
                    }
                },
                tooltip: {
                    titleFont: {
                        size: isMobile ? 11 : 14
                    },
                    bodyFont: {
                        size: isMobile ? 10 : 12
                    },
                    padding: isMobile ? 8 : 12
                }
            },
            scales: {
                x: {
                    ticks: {
                        font: {
                            size: isMobile ? 9 : 11
                        },
                        maxRotation: isMobile ? 45 : 0,
                        minRotation: isMobile ? 45 : 0
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: isMobile ? 9 : 11
                        }
                    }
                }
            }
        };
        
        // 기본 옵션과 모바일 옵션 병합
        return this.deepMerge(baseOptions, mobileOptions);
    }
    
    // 객체 깊은 병합 함수
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    render() {
        const container = document.getElementById('reportTab');
        if (!container) {
            console.error('reportTab 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        container.innerHTML = this.getHTML();
        this.setupEventListeners();
        this.loadFilters();
        this.loadData();
        
        // 윈도우 리사이즈 이벤트 추가 (모바일 최적화)
        window.addEventListener('resize', () => {
            this.debounce(() => {
                this.updateChartsForMobile();
            }, 300);
        });
    }
    
    // 디바운스 함수
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // 모바일 환경에 맞게 차트 업데이트
    updateChartsForMobile() {
        Object.keys(this.charts).forEach(chartKey => {
            if (this.charts[chartKey]) {
                const chart = this.charts[chartKey];
                const isMobile = window.innerWidth <= 768;
                
                // 범례 위치 업데이트
                if (chart.options.plugins && chart.options.plugins.legend) {
                    chart.options.plugins.legend.position = isMobile ? 'bottom' : 'top';
                    chart.options.plugins.legend.labels.font.size = isMobile ? 10 : 12;
                    chart.options.plugins.legend.labels.padding = isMobile ? 10 : 20;
                }
                
                // X축 라벨 회전 업데이트
                if (chart.options.scales && chart.options.scales.x && chart.options.scales.x.ticks) {
                    chart.options.scales.x.ticks.maxRotation = isMobile ? 45 : 0;
                    chart.options.scales.x.ticks.minRotation = isMobile ? 45 : 0;
                    chart.options.scales.x.ticks.font.size = isMobile ? 9 : 11;
                }
                
                // Y축 폰트 크기 업데이트
                if (chart.options.scales && chart.options.scales.y && chart.options.scales.y.ticks) {
                    chart.options.scales.y.ticks.font.size = isMobile ? 9 : 11;
                }
                
                chart.update();
            }
        });
    }
    
    getHTML() {
        return `
            <style>
                .report-tab-container { display: flex; gap: 10px; margin-bottom: 20px; }
                .report-tab { flex: 1; padding: 15px; text-align: center; cursor: pointer; border-radius: 10px; font-weight: 600; transition: all 0.3s; }
                .report-tab.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                .report-tab:not(.active) { background: #f8f9fa; color: #6c757d; }
                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .stat-card { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); position: relative; }
                .stat-icon { font-size: 2.5em; margin-bottom: 10px; }
                .stat-label { color: #888; font-size: 0.9em; margin-bottom: 10px; text-transform: uppercase; }
                .stat-value { color: #333; font-size: 2em; font-weight: bold; }
                .stat-change { position: absolute; top: 20px; right: 20px; padding: 5px 10px; border-radius: 20px; font-size: 0.8em; font-weight: bold; }
                .stat-change.positive { background: #e6f7ee; color: #00a854; }
                .stat-change.negative { background: #fdeeee; color: #f5222d; }
                .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .chart-card { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); height: 400px; }
                .chart-title { color: #333; font-size: 1.3em; margin-bottom: 20px; font-weight: 600; }
                .chart-container { height: 320px; position: relative; }
                
                /* 모바일 최적화 */
                @media (max-width: 768px) {
                    .charts-grid { 
                        grid-template-columns: 1fr; 
                        gap: 15px; 
                        margin-bottom: 20px; 
                    }
                    .chart-card { 
                        padding: 15px; 
                        height: 350px; 
                        margin-bottom: 15px;
                    }
                    .chart-title { 
                        font-size: 1.1em; 
                        margin-bottom: 15px; 
                        text-align: center;
                    }
                    .chart-container { 
                        height: 280px; 
                    }
                }
                
                @media (max-width: 480px) {
                    .chart-card { 
                        padding: 12px; 
                        height: 320px; 
                    }
                    .chart-title { 
                        font-size: 1em; 
                        margin-bottom: 12px; 
                    }
                    .chart-container { 
                        height: 260px; 
                    }
                }
            </style>
            
            <div style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                <div class="report-tab-container">
                    <div class="report-tab active" data-table="data_(ACE)">ACE 판매 데이터</div>
                    <div class="report-tab" data-table="data_(ESSA)">ESSA 판매 데이터</div>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: center; font-weight: 600; color: #1976d2;" id="dataSourceInfo">
                    현재 데이터: ACE 판매 데이터
                </div>
                
                <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 20px; color: #333; font-size: 1.1em;">🔍 검색 조건</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 0.95em;">년도</label>
                            <select id="yearFilter" style="width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 0.95em; background: white; cursor: pointer;">
                                <option value="">전체</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 0.95em;">월</label>
                            <select id="monthFilter" style="width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 0.95em; background: white; cursor: pointer;">
                                <option value="">전체</option>
                                ${Array.from({length: 12}, (_, i) => `<option value="${i+1}">${i+1}월</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 0.95em;">구매용도</label>
                            <select id="purposeFilter" style="width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 0.95em; background: white; cursor: pointer;">
                                <option value="">전체</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; font-size: 0.95em;">판매자</label>
                            <select id="sellerFilter" style="width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 0.95em; background: white; cursor: pointer;">
                                <option value="">전체</option>
                            </select>
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
                        <button id="applyFilter" style="padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95em; transition: transform 0.2s;">필터 적용</button>
                        <button id="resetFilter" style="padding: 12px 30px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95em; transition: transform 0.2s;">초기화</button>
                        <button id="exportExcel" style="padding: 12px 30px; background: #43e97b; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95em; transition: transform 0.2s;">Excel 내보내기</button>
                    </div>
                    
                    <!-- 모바일 최적화 CSS -->
                    <style>
                        @media (max-width: 768px) {
                            .filter-section {
                                padding: 15px !important;
                            }
                            .filter-section h3 {
                                font-size: 1em !important;
                                margin-bottom: 15px !important;
                            }
                            .filter-section > div:first-of-type {
                                grid-template-columns: repeat(2, 1fr) !important;
                                gap: 12px !important;
                            }
                            .filter-section select {
                                padding: 10px !important;
                                font-size: 0.9em !important;
                            }
                            .filter-section > div:last-of-type {
                                flex-direction: column !important;
                                gap: 8px !important;
                            }
                            .filter-section button {
                                padding: 10px 20px !important;
                                font-size: 0.9em !important;
                            }
                        }
                        
                        @media (max-width: 480px) {
                            .filter-section > div:first-of-type {
                                grid-template-columns: 1fr !important;
                            }
                        }
                    </style>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-label">총 매출</div>
                        <div class="stat-value" id="totalSales">-</div>
                        <div class="stat-change" id="totalSalesChange">-</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-label">월평균 매출</div>
                        <div class="stat-value" id="avgMonthlySales">-</div>
                        <div class="stat-change" id="avgMonthlySalesChange">-</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🛒</div>
                        <div class="stat-label">총 거래 건수</div>
                        <div class="stat-value" id="totalOrders">-</div>
                        <div class="stat-change" id="totalOrdersChange">-</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📦</div>
                        <div class="stat-label">총 판매 수량</div>
                        <div class="stat-value" id="totalQuantity">-</div>
                        <div class="stat-change" id="totalQuantityChange">-</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-label">평균 거래액</div>
                        <div class="stat-value" id="avgSales">-</div>
                        <div class="stat-change" id="avgSalesChange">-</div>
                    </div>
                </div>
                
                <div class="charts-grid">
                    <div class="chart-card">
                        <h3 class="chart-title">월별 매출 추이</h3>
                        <div class="chart-container"><canvas id="monthlySalesChart"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">월별 판매 건수 추이</h3>
                        <div class="chart-container"><canvas id="monthlyOrdersChart"></canvas></div>
                    </div>
                </div>
                
                <div class="charts-grid">
                    <div class="chart-card">
                        <h3 class="chart-title">구매용도별 매출 비중</h3>
                        <div class="chart-container"><canvas id="purposeChart"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">사이즈별 매출 비중</h3>
                        <div class="chart-container"><canvas id="sizeChart"></canvas></div>
                    </div>
                </div>
                
                <div class="charts-grid">
                    <div class="chart-card">
                        <h3 class="chart-title">지역별 판매 비중 (시/군/구)</h3>
                        <div class="chart-container"><canvas id="region2Chart"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">지역별 판매 비중 (읍/면/동)</h3>
                        <div class="chart-container"><canvas id="region3Chart"></canvas></div>
                    </div>
                </div>
                
                <div id="aceCharts" style="display: block;">
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">등급별 판매 비중</h3>
                            <div class="chart-container"><canvas id="gradeChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">판매자별 매출 실적</h3>
                            <div class="chart-container"><canvas id="aceSellerChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">등급별 매출액 비교</h3>
                            <div class="chart-container"><canvas id="aceMaterialSalesChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">등급별 판매수량 비교</h3>
                            <div class="chart-container"><canvas id="aceMaterialQuantityChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">등급별 판매수량 (1인용)</h3>
                            <div class="chart-container"><canvas id="singleBedGradeChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">등급별 판매수량 (2인용)</h3>
                            <div class="chart-container"><canvas id="doubleBedGradeChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">프레임 상품별 판매수량</h3>
                            <div class="chart-container"><canvas id="frameProductChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">프레임 색상별 판매수량</h3>
                            <div class="chart-container"><canvas id="frameColorChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">프레임 1인용 판매수량 (DS, SS, DD)</h3>
                            <div class="chart-container"><canvas id="frameSingleChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">프레임 2인용 판매수량 (LQ, K3, LK)</h3>
                            <div class="chart-container"><canvas id="frameDoubleChart"></canvas></div>
                        </div>
                    </div>
                </div>
                
                <div id="essaCharts" style="display: none;">
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">연령대별 매출 분석</h3>
                            <div class="chart-container"><canvas id="ageSalesChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">판매자별 매출 실적</h3>
                            <div class="chart-container"><canvas id="essaSellerChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">소재별 매출액 비교</h3>
                            <div class="chart-container"><canvas id="essaMaterialSalesChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">소재별 판매수량 비교</h3>
                            <div class="chart-container"><canvas id="essaMaterialQuantityChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">상품별 판매수량 분석</h3>
                            <div class="chart-container"><canvas id="productQuantityChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">색상별 판매수량 분석</h3>
                            <div class="chart-container"><canvas id="colorQuantityChart"></canvas></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        document.querySelectorAll('.report-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentTable = e.target.getAttribute('data-table');
                document.getElementById('dataSourceInfo').textContent = 
                    `현재 데이터: ${this.currentTable === 'data_(ACE)' ? 'ACE 판매 데이터' : 'ESSA 판매 데이터'}`;
                
                document.getElementById('aceCharts').style.display = this.currentTable === 'data_(ACE)' ? 'block' : 'none';
                document.getElementById('essaCharts').style.display = this.currentTable === 'data_(ESSA)' ? 'block' : 'none';
                
                this.loadFilters();
                this.loadData();
            });
        });
        
        document.getElementById('applyFilter').addEventListener('click', () => this.loadData());
        document.getElementById('resetFilter').addEventListener('click', () => {
            // 현재 년도로 리셋
            const now = new Date();
            const currentSystemYear = now.getFullYear();
            
            const yearSelect = document.getElementById('yearFilter');
            const yearOptions = Array.from(yearSelect.options).map(opt => parseInt(opt.value)).filter(v => !isNaN(v));
            
            // 현재 년도가 데이터에 있으면 선택, 없으면 최신 년도
            if (yearOptions.includes(currentSystemYear)) {
                yearSelect.value = currentSystemYear;
            } else if (yearOptions.length > 0) {
                yearSelect.value = Math.max(...yearOptions);
            } else {
                yearSelect.value = '';
            }
            
            document.getElementById('monthFilter').value = '';
            document.getElementById('purposeFilter').value = '';
            document.getElementById('sellerFilter').value = '';
            this.loadData();
        });
        document.getElementById('exportExcel').addEventListener('click', () => this.exportToExcel());
    }
    
    loadFilters() {
        try {
            // 현재 시점의 년도 가져오기
            const now = new Date();
            const currentSystemYear = now.getFullYear();
            
            const yearResult = this.db.exec(`SELECT DISTINCT YEAR FROM "${this.currentTable}" ORDER BY YEAR DESC`);
            const yearSelect = document.getElementById('yearFilter');
            const previousSelectedYear = yearSelect.value; // 이전 선택값 저장
            yearSelect.innerHTML = '<option value="">전체</option>';
            
            let availableYears = [];
            if (yearResult.length > 0) {
                yearResult[0].values.forEach(([year]) => {
                    availableYears.push(year);
                    yearSelect.innerHTML += `<option value="${year}">${year}년</option>`;
                });
                
                // 디폴트 값 설정 로직
                if (previousSelectedYear) {
                    // 이전에 선택한 값이 있으면 유지
                    yearSelect.value = previousSelectedYear;
                } else {
                    // 처음 로드 시: 현재 년도가 데이터에 있으면 선택, 없으면 최신 년도
                    if (availableYears.includes(currentSystemYear)) {
                        yearSelect.value = currentSystemYear;
                    } else if (availableYears.length > 0) {
                        yearSelect.value = availableYears[0]; // 최신 년도
                    }
                }
            }
            
            const sellerResult = this.db.exec(`SELECT DISTINCT 판매자 FROM "${this.currentTable}" WHERE 판매자 IS NOT NULL AND 판매자 != '' ORDER BY 판매자`);
            const sellerSelect = document.getElementById('sellerFilter');
            const currentSeller = sellerSelect.value;
            sellerSelect.innerHTML = '<option value="">전체</option>';
            if (sellerResult.length > 0) {
                sellerResult[0].values.forEach(([seller]) => {
                    if (seller) sellerSelect.innerHTML += `<option value="${seller}">${seller}</option>`;
                });
            }
            sellerSelect.value = currentSeller;
            
            // 구매용도 필터 추가
            const purposeResult = this.db.exec(`SELECT DISTINCT 구매용도 FROM "${this.currentTable}" WHERE 구매용도 IS NOT NULL AND 구매용도 != '' ORDER BY 구매용도`);
            const purposeSelect = document.getElementById('purposeFilter');
            const currentPurpose = purposeSelect.value;
            purposeSelect.innerHTML = '<option value="">전체</option>';
            if (purposeResult.length > 0) {
                purposeResult[0].values.forEach(([purpose]) => {
                    if (purpose) purposeSelect.innerHTML += `<option value="${purpose}">${purpose}</option>`;
                });
            }
            purposeSelect.value = currentPurpose;
        } catch (error) {
            console.error('필터 로드 오류:', error);
        }
    }
    
    getFilterCondition() {
        const year = document.getElementById('yearFilter').value;
        const month = document.getElementById('monthFilter').value;
        const purpose = document.getElementById('purposeFilter').value;
        const seller = document.getElementById('sellerFilter').value;
        
        let condition = '';
        if (year) condition += ` AND YEAR = ${year}`;
        if (month) condition += ` AND MONTH = ${month}`;
        if (purpose) condition += ` AND 구매용도 = '${purpose}'`;
        if (seller) condition += ` AND 판매자 = '${seller}'`;
        
        return condition;
    }
    
    loadData() {
        try {
            const filter = this.getFilterCondition();
            const currentYear = document.getElementById('yearFilter').value;
            const prevYear = currentYear ? parseInt(currentYear) - 1 : null;
            
            this.updateStats(filter, prevYear);
            this.loadMonthlySalesChart(filter, prevYear);
            this.loadMonthlyOrdersChart(filter, prevYear);
            this.loadPurposeChart(filter, prevYear);
            this.loadSizeChart(filter, prevYear);
            this.loadRegion2Chart(filter, prevYear);
            this.loadRegion3Chart(filter, prevYear);
            
            if (this.currentTable === 'data_(ACE)') {
                this.loadGradeChart(filter, prevYear);
                this.loadAceSellerChart(filter, prevYear);
                this.loadAceMaterialDetailCharts(filter, prevYear);
                this.loadBedSizeGradeCharts(filter, prevYear);
                this.loadFrameAnalysisCharts(filter, prevYear);
                this.loadFrameSizeCharts(filter, prevYear); // 프레임 1인용/2인용 차트 추가
            } else {
                this.loadAgeCharts(filter, prevYear);
                this.loadEssaSellerChart(filter, prevYear);
                this.loadEssaMaterialDetailCharts(filter, prevYear);
                this.loadProductColorCharts(filter, prevYear);
            }
        } catch (error) {
            console.error('데이터 로드 오류:', error);
        }
    }
    
    updateStats(filter, prevYear) {
        try {
            const currentYear = document.getElementById('yearFilter').value;
            const selectedMonth = document.getElementById('monthFilter').value;
            
            const currentQuery = `
                SELECT 
                    SUM(건수) as totalOrders,
                    SUM(할인가) as totalSales,
                    SUM(수량) as totalQuantity
                FROM "${this.currentTable}"
                WHERE 1=1 ${filter}
            `;
            const currentResult = this.db.exec(currentQuery);
            
            if (currentResult.length === 0) return;
            
            const currentStats = currentResult[0].values[0];
            const currentAvgSales = currentStats[0] > 0 ? currentStats[1] / currentStats[0] : 0;
            
            // 월평균 매출 계산
            let currentMonthlyAvg = 0;
            let prevMonthlyAvg = 0;
            
            // 현재 조건에서의 월평균 매출 계산
            const currentMonthsQuery = `
                SELECT DISTINCT YEAR, MONTH 
                FROM "${this.currentTable}" 
                WHERE 1=1 ${filter} AND 할인가 > 0
                ORDER BY YEAR, MONTH
            `;
            const currentMonthsResult = this.db.exec(currentMonthsQuery);
            
            let currentMonthCount = 0;
            if (currentMonthsResult.length > 0) {
                // 실제 매출이 발생한 월 수 카운팅
                currentMonthCount = currentMonthsResult[0].values.length;
            }
            
            currentMonthlyAvg = currentMonthCount > 0 ? currentStats[1] / currentMonthCount : 0;
            
            let prevStats = [0, 0, 0];
            let prevAvgSales = 0;
            
            if (prevYear) {
                const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const prevQuery = `
                    SELECT 
                        SUM(건수) as totalOrders,
                        SUM(할인가) as totalSales,
                        SUM(수량) as totalQuantity
                    FROM "${this.currentTable}"
                    WHERE 1=1 ${prevFilter}
                `;
                const prevResult = this.db.exec(prevQuery);
                if (prevResult.length > 0) {
                    prevStats = prevResult[0].values[0];
                    prevAvgSales = prevStats[0] > 0 ? prevStats[1] / prevStats[0] : 0;
                    
                    // 이전 년도의 월평균 매출 계산
                    const prevMonthsQuery = `
                        SELECT DISTINCT YEAR, MONTH 
                        FROM "${this.currentTable}" 
                        WHERE 1=1 ${prevFilter} AND 할인가 > 0
                        ORDER BY YEAR, MONTH
                    `;
                    const prevMonthsResult = this.db.exec(prevMonthsQuery);
                    
                    let prevMonthCount = 0;
                    if (prevMonthsResult.length > 0) {
                        // 실제 매출이 발생한 월 수 카운팅
                        prevMonthCount = prevMonthsResult[0].values.length;
                    }
                    
                    prevMonthlyAvg = prevMonthCount > 0 ? prevStats[1] / prevMonthCount : 0;
                }
            }
            
            const calcChange = (current, previous) => {
                if (previous === 0) return 0;
                return ((current - previous) / previous) * 100;
            };
            
            document.getElementById('totalSales').textContent = '₩' + Math.round(currentStats[1]).toLocaleString();
            document.getElementById('totalOrders').textContent = Math.round(currentStats[0]).toLocaleString() + '건';
            document.getElementById('totalQuantity').textContent = Math.round(currentStats[2]).toLocaleString() + '개';
            document.getElementById('avgSales').textContent = '₩' + Math.round(currentAvgSales).toLocaleString();
            document.getElementById('avgMonthlySales').textContent = '₩' + Math.round(currentMonthlyAvg).toLocaleString();
            
            this.updateChangeIndicator('totalSalesChange', calcChange(currentStats[1], prevStats[1]));
            this.updateChangeIndicator('totalOrdersChange', calcChange(currentStats[0], prevStats[0]));
            this.updateChangeIndicator('totalQuantityChange', calcChange(currentStats[2], prevStats[2]));
            this.updateChangeIndicator('avgSalesChange', calcChange(currentAvgSales, prevAvgSales));
            this.updateChangeIndicator('avgMonthlySalesChange', calcChange(currentMonthlyAvg, prevMonthlyAvg));
        } catch (error) {
            console.error('통계 업데이트 오류:', error);
        }
    }
    
    updateChangeIndicator(elementId, change) {
        const element = document.getElementById(elementId);
        if (change === 0) {
            element.textContent = '0%';
            element.className = 'stat-change';
        } else {
            const isPositive = change > 0;
            element.textContent = (isPositive ? '+' : '') + change.toFixed(1) + '%';
            element.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
        }
    }
    
    loadMonthlySalesChart(filter, prevYear) {
        try {
            const currentYear = document.getElementById('yearFilter').value;
            const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
            const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
            
            // 년도: 전체, 월: 전체인 경우 범례 숨김
            const hideYearLegend = !currentYear;
            
            const currentQuery = `SELECT MONTH, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 1=1 ${filter} GROUP BY MONTH ORDER BY MONTH`;
            const currentResult = this.db.exec(currentQuery);
            
            let prevResult = [];
            if (prevYear && !hideYearLegend) {
                const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const prevQuery = `SELECT MONTH, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 1=1 ${prevFilter} GROUP BY MONTH ORDER BY MONTH`;
                const prevResultObj = this.db.exec(prevQuery);
                prevResult = prevResultObj.length > 0 ? prevResultObj[0].values : [];
            }
            
            const currentData = Array(12).fill(0);
            const prevData = Array(12).fill(0);
            
            if (currentResult.length > 0) {
                currentResult[0].values.forEach(row => {
                    const month = parseInt(row[0]);
                    if (month >= 1 && month <= 12) currentData[month-1] = row[1];
                });
            }
            
            if (!hideYearLegend) {
                prevResult.forEach(row => {
                    const month = parseInt(row[0]);
                    if (month >= 1 && month <= 12) prevData[month-1] = row[1];
                });
            }
            
            if (this.charts.monthlySales) this.charts.monthlySales.destroy();
            const ctx = document.getElementById('monthlySalesChart');
            
            const datasets = [];
            
            if (!hideYearLegend && prevYear) {
                datasets.push({
                    label: `${prevYearShort}년`,
                    data: prevData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                });
            }
            
            datasets.push({
                label: hideYearLegend ? '매출' : `${currentYearShort}년`,
                data: currentData,
                borderColor: '#ff6384',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.4
            });
            
            this.charts.monthlySales = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: !hideYearLegend } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
                }
            });
        } catch (error) {
            console.error('월별 매출 차트 오류:', error);
        }
    }
    
    loadMonthlyOrdersChart(filter, prevYear) {
        try {
            const currentYear = document.getElementById('yearFilter').value;
            const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
            const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
            
            const currentQuery = `SELECT MONTH, SUM(건수) as orders FROM "${this.currentTable}" WHERE 1=1 ${filter} GROUP BY MONTH ORDER BY MONTH`;
            const currentResult = this.db.exec(currentQuery);
            
            let prevResult = [];
            if (prevYear) {
                const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const prevQuery = `SELECT MONTH, SUM(건수) as orders FROM "${this.currentTable}" WHERE 1=1 ${prevFilter} GROUP BY MONTH ORDER BY MONTH`;
                const prevResultObj = this.db.exec(prevQuery);
                prevResult = prevResultObj.length > 0 ? prevResultObj[0].values : [];
            }
            
            const currentData = Array(12).fill(0);
            const prevData = Array(12).fill(0);
            
            if (currentResult.length > 0) {
                currentResult[0].values.forEach(row => {
                    const month = parseInt(row[0]);
                    if (month >= 1 && month <= 12) currentData[month-1] = row[1];
                });
            }
            
            prevResult.forEach(row => {
                const month = parseInt(row[0]);
                if (month >= 1 && month <= 12) prevData[month-1] = row[1];
            });
            
            if (this.charts.monthlyOrders) this.charts.monthlyOrders.destroy();
            const ctx = document.getElementById('monthlyOrdersChart');
            this.charts.monthlyOrders = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                    datasets: [{
                        label: `${prevYearShort}년`,
                        data: prevData,
                        borderColor: '#36a2eb',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4
                    }, {
                        label: `${currentYearShort}년`,
                        data: currentData,
                        borderColor: '#4bc0c0',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '건' } } }
                }
            });
        } catch (error) {
            console.error('월별 판매 건수 차트 오류:', error);
        }
    }
    
    exportToExcel() {
        try {
            const filter = this.getFilterCondition();
            const query = `SELECT * FROM "${this.currentTable}" WHERE 1=1 ${filter}`;
            const result = this.db.exec(query);
            
            if (result.length > 0) {
                const ws = XLSX.utils.aoa_to_sheet([result[0].columns, ...result[0].values]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "매출데이터");
                XLSX.writeFile(wb, `매출리포트_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else {
                alert('내보낼 데이터가 없습니다.');
            }
        } catch (error) {
            console.error('Excel 내보내기 오류:', error);
            alert('Excel 내보내기 중 오류가 발생했습니다.');
        }
    }
}
