<<<<<<< HEAD
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
=======
// 통합 매출 관리 시스템 - 메인 애플리케이션
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
        console.log('🚀 통합 매출 관리 시스템 초기화');
        
        // SQL.js 초기화
        await this.initSQL();
        
        // 파일 업로드 설정
        this.setupFileUpload();
        
        // 탭 전환 설정
        this.setupTabs();
    }
    
    async initSQL() {
        try {
            this.SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            console.log('✅ SQL.js 초기화 완료');
        } catch (error) {
            console.error('❌ SQL.js 초기화 실패:', error);
            this.showStatus('error', 'SQL.js 라이브러리 로드 실패');
        }
    }
    
    setupFileUpload() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        
        // 클릭으로 파일 선택
        dropZone.addEventListener('click', () => fileInput.click());
        
        // 파일 선택 이벤트
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleFile(e.target.files[0]);
            }
        });
        
        // 드래그 앤 드롭
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.background = 'rgba(102, 126, 234, 0.2)';
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.background = 'rgba(102, 126, 234, 0.05)';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.background = 'rgba(102, 126, 234, 0.05)';
            
            if (e.dataTransfer.files[0]) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });
    }
    
    async handleFile(file) {
        console.log('📁 파일 선택:', file.name);
        
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.textContent = `선택된 파일: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        
        this.showStatus('info', '데이터베이스 파일을 로드하는 중...');
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const uInt8Array = new Uint8Array(e.target.result);
                this.db = new this.SQL.Database(uInt8Array);
                
                console.log('✅ 데이터베이스 로드 완료');
                this.showStatus('success', '데이터베이스 로드 완료! 탭을 선택하여 데이터를 확인하세요.');
                
                // 업로드 영역 숨기고 탭 표시
                document.getElementById('uploadArea').style.display = 'none';
                document.getElementById('mainTabs').style.display = 'flex';
                
                // 현재 활성 탭 초기화
                this.loadCurrentTab();
                
            } catch (error) {
                console.error('❌ 데이터베이스 로드 실패:', error);
                this.showStatus('error', '데이터베이스 로드 실패: ' + error.message);
            }
        };
        
        reader.onerror = () => {
            this.showStatus('error', '파일 읽기 오류');
        };
        
        reader.readAsArrayBuffer(file);
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
        
        // 탭 버튼 활성화
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('data-tab') === tabName) {
                tab.classList.add('active');
            }
        });
        
        // 탭 컨텐츠 표시
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');
        
        this.currentTab = tabName;
        this.loadCurrentTab();
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
        console.log('📊 매출 리포트 모듈 로드');
        
        if (!this.reportModule) {
            this.reportModule = new ReportModule(this.db, this.SQL);
        }
        this.reportModule.render();
    }
    
    loadCustomerModule() {
        console.log('👥 고객 조회 모듈 로드');
        
        if (!this.customerModule) {
            this.customerModule = new CustomerModule(this.db, this.SQL);
        }
        this.customerModule.render();
    }
    
    loadCalendarModule() {
        console.log('📅 매출 캘린더 모듈 로드');
        
        if (!this.calendarModule) {
            this.calendarModule = new CalendarModule(this.db, this.SQL);
        }
        this.calendarModule.render();
        
        // 전역 접근을 위해 window 객체에 할당
        window.calendarModule = this.calendarModule;
    }
    
    showStatus(type, message) {
        const uploadArea = document.getElementById('uploadArea');
        let statusDiv = uploadArea.querySelector('.status');
        
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.className = 'status';
            uploadArea.appendChild(statusDiv);
        }
        
        statusDiv.className = `status ${type}`;
        statusDiv.textContent = message;
    }
}

// 페이지 로드 시 앱 초기화
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new IntegratedSalesApp();
});
>>>>>>> 30e6afcb005d23f8a4f95f92b4c0c39aa4b9643e
