// 통합 매출 관리 시스템 v2 - Supabase 연동 버전
class IntegratedSalesApp {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.currentTab = 'report';
        this.reportModule = null;
        this.customerModule = null;
        this.calendarModule = null;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 통합 매출 관리 시스템 v2 (Supabase) 초기화');
        
        // Supabase에서 데이터 로드
        await this.loadFromSupabase();
        
        // 탭 전환 설정
        this.setupTabs();
    }
    
    async loadFromSupabase() {
        const loadingProgress = document.getElementById('loadingProgress');
        const loadingArea = document.getElementById('loadingArea');
        
        try {
            const loader = new SupabaseDBLoader();
            const { db, SQL } = await loader.init((msg) => {
                console.log(msg);
                if (loadingProgress) loadingProgress.textContent = msg;
            });
            
            this.db = db;
            this.SQL = SQL;
            
            console.log('✅ Supabase 데이터 로드 완료');
            
            // 로딩 영역 숨기고 탭 표시
            loadingArea.style.display = 'none';
            document.getElementById('mainTabs').style.display = 'flex';
            
            // 현재 활성 탭 초기화
            this.loadCurrentTab();
            
        } catch (error) {
            console.error('❌ 데이터 로드 실패:', error);
            if (loadingProgress) {
                loadingProgress.innerHTML = `<span style="color: #dc3545;">❌ 데이터 로드 실패: ${error.message}</span><br><br><button onclick="location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">다시 시도</button>`;
            }
        }
    }
    
    setupTabs() {
        const tabs = document.querySelectorAll('.main-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }
    
    switchTab(tabName) {
            console.log('🔄 탭 전환:', tabName);

            document.querySelectorAll('.main-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.getAttribute('data-tab') === tabName) {
                    tab.classList.add('active');
                }
            });

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName + 'Tab').classList.add('active');

            this.currentTab = tabName;

            // display 전환 후 브라우저 레이아웃 계산을 기다린 뒤 렌더링
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.loadCurrentTab();
                });
            });
        }

    
    loadCurrentTab() {
        if (!this.db) return;
        
        switch(this.currentTab) {
            case 'report':
                this.loadReportModule();
                break;
            case 'customer':
                this.loadCustomerModule();
                break;
            case 'calendar':
                this.loadCalendarModule();
                break;
        }
    }
    
    loadReportModule() {
        if (!this.reportModule) {
            this.reportModule = new ReportModule(this.db, this.SQL);
            this.reportModule.render();
        } else {
            // 이미 렌더링된 경우 차트 리사이즈만 수행
            this.resizeAllCharts(this.reportModule.charts);
        }
    }
    
    loadCustomerModule() {
        if (!this.customerModule) {
            this.customerModule = new CustomerModule(this.db, this.SQL);
        }
        this.customerModule.render();
    }
    
    loadCalendarModule() {
        if (!this.calendarModule) {
            this.calendarModule = new CalendarModule(this.db, this.SQL);
            this.calendarModule.render();
        } else {
            this.calendarModule.render();
        }
        window.calendarModule = this.calendarModule;
    }
    
    resizeAllCharts(charts) {
        if (!charts) return;
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new IntegratedSalesApp();
});
