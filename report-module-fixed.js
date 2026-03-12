// 매출 리포트 모듈 (수정 버전)
class ReportModule {
    constructor(db, SQL) {
        this.db = db;
        this.SQL = SQL;
        this.charts = {};
        this.currentTable = "data_(ACE)";
        this.yoyMode = false;
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
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; align-items: center;">
                        <button id="applyFilter" style="flex: 1; min-width: 120px; max-width: 200px; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95em; transition: transform 0.2s;">필터 적용</button>
                        <button id="resetFilter" style="flex: 1; min-width: 120px; max-width: 200px; padding: 12px 30px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.95em; transition: transform 0.2s;">초기화</button>
                        <button id="yoyToggle" style="flex: 1; min-width: 120px; max-width: 200px; padding: 12px 30px; background: #dee2e6; color: #adb5bd; border: none; border-radius: 8px; font-weight: 600; cursor: not-allowed; font-size: 0.95em; transition: all 0.3s; opacity: 0.6;" disabled>📊 전년 대비</button>
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
                        <h3 class="chart-title">1. 월별 매출 추이</h3>
                        <div class="chart-container"><canvas id="monthlySalesChart"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">2. 월별 판매 건수 추이</h3>
                        <div class="chart-container"><canvas id="monthlyOrdersChart"></canvas></div>
                    </div>
                </div>
                
                <div class="charts-grid">
                    <div class="chart-card">
                        <h3 class="chart-title">3. 구매용도별 매출 비중</h3>
                        <div class="chart-container"><canvas id="purposeChart"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">4. 사이즈별 매출 비중</h3>
                        <div class="chart-container"><canvas id="sizeChart"></canvas></div>
                    </div>
                </div>
                
                <div class="charts-grid">
                    <div class="chart-card">
                        <h3 class="chart-title">5. 지역별 판매 비중 (시/군/구)</h3>
                        <div class="chart-container"><canvas id="region2Chart"></canvas></div>
                    </div>
                    <div class="chart-card">
                        <h3 class="chart-title">6. 지역별 판매 비중 (읍/면/동)</h3>
                        <div class="chart-container"><canvas id="region3Chart"></canvas></div>
                    </div>
                </div>
                
                <div id="aceCharts" style="display: block;">
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">7. 등급별 판매 비중</h3>
                            <div class="chart-container"><canvas id="gradeChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">8. 판매자별 매출 실적</h3>
                            <div class="chart-container"><canvas id="aceSellerChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">9. 등급별 매출액 비교</h3>
                            <div class="chart-container"><canvas id="aceMaterialSalesChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">10. 등급별 판매수량 비교</h3>
                            <div class="chart-container"><canvas id="aceMaterialQuantityChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">11. 등급별 판매수량 (1인용)</h3>
                            <div class="chart-container"><canvas id="singleBedGradeChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">12. 등급별 판매수량 (2인용)</h3>
                            <div class="chart-container"><canvas id="doubleBedGradeChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">13. 프레임 상품별 판매수량</h3>
                            <div class="chart-container"><canvas id="frameProductChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">14. 프레임 색상별 판매수량</h3>
                            <div class="chart-container"><canvas id="frameColorChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">15. 프레임 1인용 판매수량 (DS, SS, DD)</h3>
                            <div class="chart-container"><canvas id="frameSingleChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">16. 프레임 2인용 판매수량 (LQ, K3, LK)</h3>
                            <div class="chart-container"><canvas id="frameDoubleChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">17. 연계품목 판매 수량</h3>
                            <div class="chart-container"><canvas id="relatedItemQuantityChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">18. 월별 할인율 추이</h3>
                            <div class="chart-container"><canvas id="discountRateChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">19. 월별 마진액 추이</h3>
                            <div class="chart-container"><canvas id="marginChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">20. 월별 마진율 추이</h3>
                            <div class="chart-container"><canvas id="marginRateChart"></canvas></div>
                        </div>
                    </div>
                </div>
                
                <div id="essaCharts" style="display: none;">
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">7. 연령대별 매출 분석</h3>
                            <div class="chart-container"><canvas id="ageSalesChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">8. 판매자별 매출 실적</h3>
                            <div class="chart-container"><canvas id="essaSellerChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">9. 소재별 매출액 비교</h3>
                            <div class="chart-container"><canvas id="essaMaterialSalesChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">10. 소재별 판매수량 비교</h3>
                            <div class="chart-container"><canvas id="essaMaterialQuantityChart"></canvas></div>
                        </div>
                    </div>
                    
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">11. 상품별 판매수량 분석</h3>
                            <div class="chart-container"><canvas id="productQuantityChart"></canvas></div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">12. 색상별 판매수량 분석</h3>
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
            this.yoyMode = false;
            this.updateYoyButton();
            this.loadData();
        });
        
        // 년도/월 변경 시 전년 대비 버튼 활성화 상태 업데이트
        document.getElementById('yearFilter').addEventListener('change', () => this.updateYoyButton());
        document.getElementById('monthFilter').addEventListener('change', () => this.updateYoyButton());
        
        // 전년 대비 토글
        document.getElementById('yoyToggle').addEventListener('click', () => {
            this.yoyMode = !this.yoyMode;
            this.updateYoyButton();
            this.loadData();
        });

    }
    
    updateYoyButton() {
        const btn = document.getElementById('yoyToggle');
        const year = document.getElementById('yearFilter').value;
        const month = document.getElementById('monthFilter').value;
        const canActivate = year && month;
        
        if (!canActivate) {
            this.yoyMode = false;
            btn.disabled = true;
            btn.style.background = '#dee2e6';
            btn.style.color = '#adb5bd';
            btn.style.cursor = 'not-allowed';
            btn.style.opacity = '0.6';
        } else if (this.yoyMode) {
            btn.disabled = false;
            btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            btn.style.color = 'white';
            btn.style.cursor = 'pointer';
            btn.style.opacity = '1';
        } else {
            btn.disabled = false;
            btn.style.background = '#e9ecef';
            btn.style.color = '#495057';
            btn.style.cursor = 'pointer';
            btn.style.opacity = '1';
        }
    }
    
    loadFilters() {
        try {
            // 현재 시점의 년도 가져오기
            const now = new Date();
            const currentSystemYear = now.getFullYear();
            
            // 모든 필터의 현재 선택값 저장
            const yearSelect = document.getElementById('yearFilter');
            const monthSelect = document.getElementById('monthFilter');
            const purposeSelect = document.getElementById('purposeFilter');
            const sellerSelect = document.getElementById('sellerFilter');
            
            const previousSelectedYear = yearSelect.value;
            const previousSelectedMonth = monthSelect.value;
            const previousSelectedPurpose = purposeSelect.value;
            const previousSelectedSeller = sellerSelect.value;
            
            // 년도 필터 로드
            const yearResult = this.db.exec(`SELECT DISTINCT YEAR FROM "${this.currentTable}" ORDER BY YEAR DESC`);
            yearSelect.innerHTML = '<option value="">전체</option>';
            
            let availableYears = [];
            if (yearResult.length > 0) {
                yearResult[0].values.forEach(([year]) => {
                    availableYears.push(year);
                    yearSelect.innerHTML += `<option value="${year}">${year}년</option>`;
                });
                
                // 디폴트 값 설정 로직
                if (previousSelectedYear !== null && previousSelectedYear !== undefined) {
                    // 이전에 선택한 값이 있으면 유지 (빈 문자열 "" 포함)
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
            
            // 월 필터 유지
            monthSelect.value = previousSelectedMonth;
            
            // 판매자 필터 로드
            const sellerResult = this.db.exec(`SELECT DISTINCT 판매자 FROM "${this.currentTable}" WHERE 판매자 IS NOT NULL AND 판매자 != '' ORDER BY 판매자`);
            sellerSelect.innerHTML = '<option value="">전체</option>';
            if (sellerResult.length > 0) {
                sellerResult[0].values.forEach(([seller]) => {
                    if (seller) sellerSelect.innerHTML += `<option value="${seller}">${seller}</option>`;
                });
            }
            sellerSelect.value = previousSelectedSeller;
            
            // 구매용도 필터 로드
            const purposeResult = this.db.exec(`SELECT DISTINCT 구매용도 FROM "${this.currentTable}" WHERE 구매용도 IS NOT NULL AND 구매용도 != '' ORDER BY 구매용도`);
            purposeSelect.innerHTML = '<option value="">전체</option>';
            if (purposeResult.length > 0) {
                purposeResult[0].values.forEach(([purpose]) => {
                    if (purpose) purposeSelect.innerHTML += `<option value="${purpose}">${purpose}</option>`;
                });
            }
            purposeSelect.value = previousSelectedPurpose;
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
        if (year) {
            if (this.yoyMode && month) {
                // 전년 대비 모드: 1월~선택월 누계
                condition += ` AND YEAR = ${year} AND MONTH <= ${month}`;
            } else {
                condition += ` AND YEAR = ${year}`;
                if (month) condition += ` AND MONTH = ${month}`;
            }
        } else {
            if (month) condition += ` AND MONTH = ${month}`;
        }
        if (purpose) condition += ` AND 구매용도 = '${purpose}'`;
        if (seller) condition += ` AND 판매자 = '${seller}'`;
        
        return condition;
    }
    
    loadData() {
        try {
            const filter = this.getFilterCondition();
            const currentYear = document.getElementById('yearFilter').value;
            const currentMonth = document.getElementById('monthFilter').value;
            const prevYear = currentYear ? parseInt(currentYear) - 1 : null;
            
            // 전년 대비 모드 정보를 전달
            this._yoyInfo = null;
            if (this.yoyMode && currentYear && currentMonth) {
                this._yoyInfo = { currentYear: parseInt(currentYear), prevYear, month: parseInt(currentMonth) };
            }
            
            this.updateStats(filter, prevYear);
            
            // 데이터 소스 정보 업데이트
            const dataSourceEl = document.getElementById('dataSourceInfo');
            const tableName = this.currentTable === 'data_(ACE)' ? 'ACE 판매 데이터' : 'ESSA 판매 데이터';
            if (this.yoyMode && currentYear && currentMonth) {
                dataSourceEl.textContent = `현재 데이터: ${tableName} | 📊 전년 대비 모드 (${currentYear}년 1~${currentMonth}월 누계 vs ${prevYear}년 1~${currentMonth}월 누계)`;
                dataSourceEl.style.background = '#fce4ec';
                dataSourceEl.style.color = '#c62828';
            } else {
                dataSourceEl.textContent = `현재 데이터: ${tableName}`;
                dataSourceEl.style.background = '#e3f2fd';
                dataSourceEl.style.color = '#1976d2';
            }
            
            this.loadMonthlySalesChart(filter, prevYear);
            this.loadMonthlyOrdersChart(filter, prevYear);
            this.loadPurposeChart(filter, prevYear);
            this.loadSizeChart(filter, prevYear);
            this.loadRegion2Chart(filter, prevYear);
            this.loadRegion3Chart(filter, prevYear);
            
            if (this.currentTable === 'data_(ACE)') {
                try { this.loadGradeChart(filter, prevYear); } catch(e) { console.error('7번 등급 차트 오류:', e); }
                try { this.loadAceSellerChart(filter, prevYear); } catch(e) { console.error('8번 판매자 차트 오류:', e); }
                try { this.loadAceMaterialDetailCharts(filter, prevYear); } catch(e) { console.error('9-10번 등급별 차트 오류:', e); }
                try { this.loadBedSizeGradeCharts(filter, prevYear); } catch(e) { console.error('11-12번 침대 차트 오류:', e); }
                try { this.loadFrameAnalysisCharts(filter, prevYear); } catch(e) { console.error('13-14번 프레임 차트 오류:', e); }
                try { this.loadFrameSizeCharts(filter, prevYear); } catch(e) { console.error('15-16번 프레임 사이즈 차트 오류:', e); }
                try { this.loadRelatedItemCharts(filter, prevYear); } catch(e) { console.error('17번 연계품목 차트 오류:', e); }
                try { this.loadDiscountRateChart(filter, prevYear); } catch(e) { console.error('18번 할인율 차트 오류:', e); }
                try { this.loadMarginChart(filter, prevYear); } catch(e) { console.error('19번 마진액 차트 오류:', e); }
                try { this.loadMarginRateChart(filter, prevYear); } catch(e) { console.error('20번 마진율 차트 오류:', e); }
            } else {
                try { this.loadAgeCharts(filter, prevYear); } catch(e) { console.error('연령대 차트 오류:', e); }
                try { this.loadEssaSellerChart(filter, prevYear); } catch(e) { console.error('ESSA 판매자 차트 오류:', e); }
                try { this.loadEssaMaterialDetailCharts(filter, prevYear); } catch(e) { console.error('ESSA 소재 차트 오류:', e); }
                try { this.loadProductColorCharts(filter, prevYear); } catch(e) { console.error('상품/색상 차트 오류:', e); }
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
            const selectedSeller = document.getElementById('sellerFilter').value;
            
            // 년도: 전체, 월: 전체인 경우 범례 숨김
            const hideYearLegend = !currentYear;
            
            // 판매자가 선택된 경우
            if (selectedSeller) {
                // 1. 선택 판매자 현재년도 데이터
                const sellerCurrentQuery = `SELECT MONTH, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 1=1 ${filter} GROUP BY MONTH ORDER BY MONTH`;
                const sellerCurrentResult = this.db.exec(sellerCurrentQuery);
                
                // 2. 선택 판매자 전년도 데이터
                let sellerPrevResult = [];
                if (prevYear && !hideYearLegend) {
                    const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                    const sellerPrevQuery = `SELECT MONTH, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 1=1 ${prevFilter} GROUP BY MONTH ORDER BY MONTH`;
                    const sellerPrevResultObj = this.db.exec(sellerPrevQuery);
                    sellerPrevResult = sellerPrevResultObj.length > 0 ? sellerPrevResultObj[0].values : [];
                }
                
                // 3. 전체 판매자 현재년도 데이터 (판매자 필터 제외)
                const filterWithoutSeller = filter.replace(` AND 판매자 = '${selectedSeller}'`, '');
                const allCurrentQuery = `SELECT MONTH, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 1=1 ${filterWithoutSeller} GROUP BY MONTH ORDER BY MONTH`;
                const allCurrentResult = this.db.exec(allCurrentQuery);
                
                // 4. 전체 판매자 전년도 데이터
                let allPrevResult = [];
                if (prevYear && !hideYearLegend) {
                    const prevFilterWithoutSeller = filterWithoutSeller.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                    const allPrevQuery = `SELECT MONTH, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 1=1 ${prevFilterWithoutSeller} GROUP BY MONTH ORDER BY MONTH`;
                    const allPrevResultObj = this.db.exec(allPrevQuery);
                    allPrevResult = allPrevResultObj.length > 0 ? allPrevResultObj[0].values : [];
                }
                
                // 데이터 배열 생성
                const sellerCurrentData = Array(12).fill(0);
                const sellerPrevData = Array(12).fill(0);
                const allCurrentData = Array(12).fill(0);
                const allPrevData = Array(12).fill(0);
                
                if (sellerCurrentResult.length > 0) {
                    sellerCurrentResult[0].values.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) sellerCurrentData[month-1] = row[1];
                    });
                }
                
                if (!hideYearLegend) {
                    sellerPrevResult.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) sellerPrevData[month-1] = row[1];
                    });
                }
                
                if (allCurrentResult.length > 0) {
                    allCurrentResult[0].values.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) allCurrentData[month-1] = row[1];
                    });
                }
                
                if (!hideYearLegend) {
                    allPrevResult.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) allPrevData[month-1] = row[1];
                    });
                }
                
                if (this.charts.monthlySales) this.charts.monthlySales.destroy();
                const ctx = document.getElementById('monthlySalesChart');
                
                const datasets = [];
                
                if (!hideYearLegend && prevYear) {
                    // 전체 판매자 전년도
                    datasets.push({
                        label: `전체 ${prevYearShort}년`,
                        data: allPrevData,
                        borderColor: '#b0bec5',
                        backgroundColor: 'rgba(176, 190, 197, 0.1)',
                        borderDash: [5, 5],
                        tension: 0.4
                    });
                }
                
                // 전체 판매자 현재년도
                datasets.push({
                    label: hideYearLegend ? '전체' : `전체 ${currentYearShort}년`,
                    data: allCurrentData,
                    borderColor: '#ffb74d',
                    backgroundColor: 'rgba(255, 183, 77, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                });
                
                if (!hideYearLegend && prevYear) {
                    // 선택 판매자 전년도
                    datasets.push({
                        label: `${selectedSeller} ${prevYearShort}년`,
                        data: sellerPrevData,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4
                    });
                }
                
                // 선택 판매자 현재년도
                datasets.push({
                    label: hideYearLegend ? selectedSeller : `${selectedSeller} ${currentYearShort}년`,
                    data: sellerCurrentData,
                    borderColor: '#ff6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.4,
                    borderWidth: 3
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
                        plugins: { legend: { display: true } },
                        scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
                    }
                });
            } else {
                // 판매자 미선택 시 기존 로직
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
            }
        } catch (error) {
            console.error('월별 매출 차트 오류:', error);
        }
    }
    
    loadMonthlyOrdersChart(filter, prevYear) {
        try {
            const currentYear = document.getElementById('yearFilter').value;
            const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
            const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
            const selectedSeller = document.getElementById('sellerFilter').value;
            
            // 년도: 전체, 월: 전체인 경우 범례 숨김
            const hideYearLegend = !currentYear;
            
            // 판매자가 선택된 경우
            if (selectedSeller) {
                // 1. 선택 판매자 현재년도 데이터
                const sellerCurrentQuery = `SELECT MONTH, SUM(건수) as orders FROM "${this.currentTable}" WHERE 1=1 ${filter} GROUP BY MONTH ORDER BY MONTH`;
                const sellerCurrentResult = this.db.exec(sellerCurrentQuery);
                
                // 2. 선택 판매자 전년도 데이터
                let sellerPrevResult = [];
                if (prevYear && !hideYearLegend) {
                    const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                    const sellerPrevQuery = `SELECT MONTH, SUM(건수) as orders FROM "${this.currentTable}" WHERE 1=1 ${prevFilter} GROUP BY MONTH ORDER BY MONTH`;
                    const sellerPrevResultObj = this.db.exec(sellerPrevQuery);
                    sellerPrevResult = sellerPrevResultObj.length > 0 ? sellerPrevResultObj[0].values : [];
                }
                
                // 3. 전체 판매자 현재년도 데이터
                const filterWithoutSeller = filter.replace(` AND 판매자 = '${selectedSeller}'`, '');
                const allCurrentQuery = `SELECT MONTH, SUM(건수) as orders FROM "${this.currentTable}" WHERE 1=1 ${filterWithoutSeller} GROUP BY MONTH ORDER BY MONTH`;
                const allCurrentResult = this.db.exec(allCurrentQuery);
                
                // 4. 전체 판매자 전년도 데이터
                let allPrevResult = [];
                if (prevYear && !hideYearLegend) {
                    const prevFilterWithoutSeller = filterWithoutSeller.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                    const allPrevQuery = `SELECT MONTH, SUM(건수) as orders FROM "${this.currentTable}" WHERE 1=1 ${prevFilterWithoutSeller} GROUP BY MONTH ORDER BY MONTH`;
                    const allPrevResultObj = this.db.exec(allPrevQuery);
                    allPrevResult = allPrevResultObj.length > 0 ? allPrevResultObj[0].values : [];
                }
                
                // 데이터 배열 생성
                const sellerCurrentData = Array(12).fill(0);
                const sellerPrevData = Array(12).fill(0);
                const allCurrentData = Array(12).fill(0);
                const allPrevData = Array(12).fill(0);
                
                if (sellerCurrentResult.length > 0) {
                    sellerCurrentResult[0].values.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) sellerCurrentData[month-1] = row[1];
                    });
                }
                
                if (!hideYearLegend) {
                    sellerPrevResult.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) sellerPrevData[month-1] = row[1];
                    });
                }
                
                if (allCurrentResult.length > 0) {
                    allCurrentResult[0].values.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) allCurrentData[month-1] = row[1];
                    });
                }
                
                if (!hideYearLegend) {
                    allPrevResult.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) allPrevData[month-1] = row[1];
                    });
                }
                
                if (this.charts.monthlyOrders) this.charts.monthlyOrders.destroy();
                const ctx = document.getElementById('monthlyOrdersChart');
                
                const datasets = [];
                
                if (!hideYearLegend && prevYear) {
                    // 전체 판매자 전년도
                    datasets.push({
                        label: `전체 ${prevYearShort}년`,
                        data: allPrevData,
                        borderColor: '#b0bec5',
                        backgroundColor: 'rgba(176, 190, 197, 0.1)',
                        borderDash: [5, 5],
                        tension: 0.4
                    });
                }
                
                // 전체 판매자 현재년도
                datasets.push({
                    label: hideYearLegend ? '전체' : `전체 ${currentYearShort}년`,
                    data: allCurrentData,
                    borderColor: '#ffb74d',
                    backgroundColor: 'rgba(255, 183, 77, 0.1)',
                    borderDash: [5, 5],
                    tension: 0.4
                });
                
                if (!hideYearLegend && prevYear) {
                    // 선택 판매자 전년도
                    datasets.push({
                        label: `${selectedSeller} ${prevYearShort}년`,
                        data: sellerPrevData,
                        borderColor: '#36a2eb',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4
                    });
                }
                
                // 선택 판매자 현재년도
                datasets.push({
                    label: hideYearLegend ? selectedSeller : `${selectedSeller} ${currentYearShort}년`,
                    data: sellerCurrentData,
                    borderColor: '#4bc0c0',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4,
                    borderWidth: 3
                });
                
                this.charts.monthlyOrders = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: true } },
                        scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '건' } } }
                    }
                });
            } else {
                // 판매자 미선택 시 기존 로직
                const currentQuery = `SELECT MONTH, SUM(건수) as orders FROM "${this.currentTable}" WHERE 1=1 ${filter} GROUP BY MONTH ORDER BY MONTH`;
                const currentResult = this.db.exec(currentQuery);
                
                let prevResult = [];
                if (prevYear && !hideYearLegend) {
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
                
                if (!hideYearLegend) {
                    prevResult.forEach(row => {
                        const month = parseInt(row[0]);
                        if (month >= 1 && month <= 12) prevData[month-1] = row[1];
                    });
                }
                
                if (this.charts.monthlyOrders) this.charts.monthlyOrders.destroy();
                const ctx = document.getElementById('monthlyOrdersChart');
                
                const datasets = [];
                
                if (!hideYearLegend && prevYear) {
                    datasets.push({
                        label: `${prevYearShort}년`,
                        data: prevData,
                        borderColor: '#36a2eb',
                        backgroundColor: 'rgba(54, 162, 235, 0.1)',
                        tension: 0.4
                    });
                }
                
                datasets.push({
                    label: hideYearLegend ? '판매 건수' : `${currentYearShort}년`,
                    data: currentData,
                    borderColor: '#4bc0c0',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4
                });
                
                this.charts.monthlyOrders = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: !hideYearLegend } },
                        scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '건' } } }
                    }
                });
            }
        } catch (error) {
            console.error('월별 판매 건수 차트 오류:', error);
        }
    }
    
}
