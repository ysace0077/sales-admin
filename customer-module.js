// 고객 조회 모듈 (customer_viewer 기반)
class CustomerModule {
    constructor(db, SQL) {
        this.db = db;
        this.SQL = SQL;
        this.currentTab = 'ACE';
        this.currentPage = 1;
        this.pageSize = 50;
        this.searchResults = [];
        this.filtersLoaded = false; // 필터 로드 상태 추적
        this.filterCache = {}; // 필터 데이터 캐시
    }
    
    render() {
        const container = document.getElementById('customerTab');
        container.innerHTML = `
            <style>
                .customer-card-label {
                    font-weight: 700;
                    color: #495057;
                    white-space: nowrap;
                    margin-right: 8px;
                }
                .customer-card-row {
                    margin-bottom: 8px;
                    display: flex;
                    flex-wrap: nowrap;
                    align-items: baseline;
                }
                .customer-card-value {
                    overflow-wrap: break-word;
                    word-break: break-word;
                    min-width: 0;
                    flex: 1;
                }
                @media (max-width: 600px) {
                    #customerResults {
                        padding: 8px !important;
                        gap: 10px !important;
                        grid-template-columns: 1fr !important;
                    }
                    #customerResults > div {
                        padding: 14px !important;
                        border-radius: 12px !important;
                    }
                }
            </style>
            <div style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                <div style="display: flex; gap: 10px; margin-bottom: 20px; justify-content: center;">
                    <button class="customer-tab active" data-tab="ACE" style="padding: 15px 40px; border: none; border-radius: 10px; font-size: 1.1em; font-weight: 600; cursor: pointer; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        ACE
                    </button>
                    <button class="customer-tab" data-tab="ESSA" style="padding: 15px 40px; border: none; border-radius: 10px; font-size: 1.1em; font-weight: 600; cursor: pointer; background: #f8f9fa; color: #6c757d;">
                        ESSA
                    </button>
                </div>
                
                <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 20px; color: #333;">🔍 검색 조건</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">년도</label>
                            <select id="customerYear" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;">
                                <option value="">전체</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">월</label>
                            <select id="customerMonth" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;">
                                <option value="">전체</option>
                                ${Array.from({length: 12}, (_, i) => `<option value="${i+1}">${i+1}월</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">고객명</label>
                            <input type="text" id="customerName" placeholder="고객명 입력" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 0.95em;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">지역</label>
                            <select id="customerRegion" style="width: 100%; padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px;">
                                <option value="">전체</option>
                            </select>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                        <button id="customerSearch" style="flex: 1; min-width: 120px; max-width: 200px; padding: 12px 30px; background: #667eea; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">검색 실행</button>
                        <button id="customerReset" style="flex: 1; min-width: 120px; max-width: 200px; padding: 12px 30px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">초기화</button>
                    </div>
                </div>
                
                <div style="background: white; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); overflow: hidden;">
                    <div style="padding: 20px; border-bottom: 2px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa;">
                        <h3 style="color: #333;">📋 검색 결과 <span id="customerResultCount" style="font-size: 0.8em; color: #6c757d;"></span></h3>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <button id="customerPrev" style="padding: 8px 15px; border: 2px solid #e1e5e9; background: white; border-radius: 8px; cursor: pointer; font-weight: 600;">◀</button>
                            <span id="customerPageInfo" style="font-weight: 600; color: #333;">1 페이지</span>
                            <button id="customerNext" style="padding: 8px 15px; border: 2px solid #e1e5e9; background: white; border-radius: 8px; cursor: pointer; font-weight: 600;">▶</button>
                        </div>
                    </div>
                    <div id="customerResults" style="padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(400px, 100%), 1fr)); gap: 20px; background: #f8f9fa;">
                        <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px; color: #6c757d;">
                            <div style="font-size: 4em; margin-bottom: 20px; opacity: 0.4;">📇</div>
                            <div style="font-size: 1.2em; font-weight: 600;">데이터를 검색해주세요</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        // 탭이 활성화될 때만 필터 로드 (지연 로딩)
        if (!this.filtersLoaded) {
            this.loadFilters();
            this.filtersLoaded = true;
        }
    }
    
    setupEventListeners() {
        // 탭 전환
        document.querySelectorAll('.customer-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // 이미 활성화된 탭이면 무시
                if (e.target.getAttribute('data-tab') === this.currentTab) {
                    return;
                }
                
                document.querySelectorAll('.customer-tab').forEach(t => {
                    t.style.background = '#f8f9fa';
                    t.style.color = '#6c757d';
                });
                e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                e.target.style.color = 'white';
                
                this.currentTab = e.target.getAttribute('data-tab');
                
                // 검색 결과 초기화
                this.searchResults = [];
                this.currentPage = 1;
                this.renderResults();
                
                // 비동기로 필터 로드 (UI 블로킹 방지)
                setTimeout(() => {
                    if (!this.filterCache[this.currentTab]) {
                        this.loadFilters();
                    } else {
                        this.restoreFiltersFromCache();
                    }
                }, 0);
            });
        });
        
        // 검색 버튼
        document.getElementById('customerSearch').addEventListener('click', () => this.search());
        
        // 년도/월 변경 시 동적 필터링
        document.getElementById('customerYear').addEventListener('change', () => this.updateDependentFilters());
        document.getElementById('customerMonth').addEventListener('change', () => this.updateDependentFilters());
        document.getElementById('customerReset').addEventListener('click', () => {
            // 전체로 리셋
            document.getElementById('customerYear').value = '';
            document.getElementById('customerMonth').value = '';
            document.getElementById('customerName').value = '';
            document.getElementById('customerRegion').value = '';
            this.searchResults = [];
            this.currentPage = 1;
            this.renderResults();
        });

        
        // 페이지네이션
        document.getElementById('customerPrev').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderResults();
            }
        });
        document.getElementById('customerNext').addEventListener('click', () => {
            const totalPages = Math.ceil(this.searchResults.length / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderResults();
            }
        });
    }
    
    loadFilters() {
        try {
            const tableName = `data_(${this.currentTab})`;
            
            // 캐시 확인
            if (this.filterCache[this.currentTab]) {
                this.restoreFiltersFromCache();
                return;
            }
            
            // 현재 날짜 가져오기
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1; // 0-11 -> 1-12
            
            // 배치 쿼리로 모든 필터 데이터를 한 번에 가져오기
            const batchQuery = `
                SELECT DISTINCT YEAR FROM "${tableName}" WHERE YEAR IS NOT NULL ORDER BY YEAR DESC;
                SELECT DISTINCT 고객명 FROM "${tableName}" WHERE 고객명 IS NOT NULL AND 고객명 != '' ORDER BY 고객명 LIMIT 500;
                SELECT DISTINCT 지역1 FROM "${tableName}" WHERE 지역1 IS NOT NULL AND 지역1 != '' ORDER BY 지역1;
            `;
            
            // 년도 데이터
            const yearResult = this.db.exec(`SELECT DISTINCT YEAR FROM "${tableName}" WHERE YEAR IS NOT NULL ORDER BY YEAR DESC`);
            const yearSelect = document.getElementById('customerYear');
            yearSelect.innerHTML = '<option value="">전체</option>';
            let yearOptions = [];
            if (yearResult.length > 0) {
                yearResult[0].values.forEach(([year]) => {
                    yearOptions.push(year);
                    yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
                });
            }
            
            // 고객명은 입력 방식이므로 별도 로드 불필요
            let nameOptions = [];
            
            // 지역 데이터 (지역2로 변경)
            const regionResult = this.db.exec(`SELECT DISTINCT 지역2 FROM "${tableName}" WHERE 지역2 IS NOT NULL AND 지역2 != '' ORDER BY 지역2`);
            const regionSelect = document.getElementById('customerRegion');
            regionSelect.innerHTML = '<option value="">전체</option>';
            let regionOptions = [];
            if (regionResult.length > 0) {
                regionResult[0].values.forEach(([region]) => {
                    if (region) {
                        regionOptions.push(region);
                        regionSelect.innerHTML += `<option value="${region}">${region}</option>`;
                    }
                });
            }
            
            // 캐시 저장
            this.filterCache[this.currentTab] = {
                years: yearOptions,
                names: nameOptions,
                regions: regionOptions,
                allData: [] // 전체 데이터도 캐시에 저장
            };
            
            // 전체 데이터 캐시 (동적 필터링용)
            const allDataResult = this.db.exec(`SELECT * FROM "${tableName}"`);
            if (allDataResult.length > 0) {
                const columns = allDataResult[0].columns;
                const rows = allDataResult[0].values;
                this.filterCache[this.currentTab].allData = rows.map(row => {
                    const obj = {};
                    columns.forEach((col, idx) => {
                        obj[col] = row[idx];
                    });
                    return obj;
                });
            }
            
            // 디폴트 값 설정: 전체
            yearSelect.value = '';
            document.getElementById('customerMonth').value = '';
            
        } catch (error) {
            console.error('필터 로드 오류:', error);
        }
    }
    
    restoreFiltersFromCache() {
        try {
            const cache = this.filterCache[this.currentTab];
            if (!cache) return;
            
            // 현재 날짜 가져오기
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1;
            
            // 년도
            const yearSelect = document.getElementById('customerYear');
            yearSelect.innerHTML = '<option value="">전체</option>';
            cache.years.forEach(year => {
                yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
            });
            
            // 고객명은 입력 방식이므로 초기화만
            document.getElementById('customerName').value = '';
            
            // 지역
            const regionSelect = document.getElementById('customerRegion');
            regionSelect.innerHTML = '<option value="">전체</option>';
            cache.regions.forEach(region => {
                regionSelect.innerHTML += `<option value="${region}">${region}</option>`;
            });
            
            // 디폴트 값 설정: 전체
            yearSelect.value = '';
            document.getElementById('customerMonth').value = '';
            
            // 년도/월 변경에 따른 종속 필터 업데이트
            this.updateDependentFilters();
            
        } catch (error) {
            console.error('캐시 복원 오류:', error);
        }
    }
    
    updateDependentFilters() {
        try {
            const cache = this.filterCache[this.currentTab];
            if (!cache || !cache.allData) return;
            
            const selectedYear = document.getElementById('customerYear').value;
            const selectedMonth = document.getElementById('customerMonth').value;
            
            // 선택된 년도/월에 따라 데이터 필터링
            let filteredData = cache.allData;
            
            if (selectedYear) {
                filteredData = filteredData.filter(row => row['YEAR'] == selectedYear);
            }
            if (selectedMonth) {
                filteredData = filteredData.filter(row => row['MONTH'] == selectedMonth);
            }
            
            // 고객명은 입력 방식이므로 종속 필터 업데이트 불필요
            
            // 지역 업데이트 (지역2 기준)
            const regions = new Set();
            filteredData.forEach(row => {
                if (row['지역2'] && row['지역2'] !== '') {
                    regions.add(row['지역2']);
                }
            });
            
            const regionSelect = document.getElementById('customerRegion');
            const currentRegion = regionSelect.value;
            regionSelect.innerHTML = '<option value="">전체</option>';
            Array.from(regions).sort().forEach(region => {
                regionSelect.innerHTML += `<option value="${region}">${region}</option>`;
            });
            
            // 이전 선택값이 새 목록에 있으면 유지
            if (currentRegion && regions.has(currentRegion)) {
                regionSelect.value = currentRegion;
            }
            
        } catch (error) {
            console.error('종속 필터 업데이트 오류:', error);
        }
    }
    
    search() {
        try {
            const tableName = `data_(${this.currentTab})`;
            const year = document.getElementById('customerYear').value;
            const month = document.getElementById('customerMonth').value;
            const name = document.getElementById('customerName').value;
            const region = document.getElementById('customerRegion').value;
            
            let query = `SELECT * FROM "${tableName}" WHERE 1=1`;
            if (year) query += ` AND YEAR = ${year}`;
            if (month) query += ` AND MONTH = ${month}`;
            if (name) query += ` AND 고객명 LIKE '%${name}%'`;
            if (region) query += ` AND 지역2 = '${region}'`;
            
            const result = this.db.exec(query);
            
            if (result.length > 0) {
                const { columns, values } = result[0];
                this.searchResults = values.map(row => {
                    const obj = {};
                    columns.forEach((col, idx) => {
                        obj[col] = row[idx];
                    });
                    return obj;
                });
            } else {
                this.searchResults = [];
            }
            
            this.currentPage = 1;
            this.renderResults();
        } catch (error) {
            console.error('검색 오류:', error);
        }
    }
    
    renderResults() {
        const container = document.getElementById('customerResults');
        const countSpan = document.getElementById('customerResultCount');
        const pageInfo = document.getElementById('customerPageInfo');
        
        if (this.searchResults.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px; color: #6c757d;">
                    <div style="font-size: 4em; margin-bottom: 20px; opacity: 0.4;">📇</div>
                    <div style="font-size: 1.2em; font-weight: 600;">검색 결과가 없습니다</div>
                </div>
            `;
            countSpan.textContent = '';
            pageInfo.textContent = '1 페이지';
            return;
        }
        
        const totalPages = Math.ceil(this.searchResults.length / this.pageSize);
        const start = (this.currentPage - 1) * this.pageSize;
        const end = Math.min(start + this.pageSize, this.searchResults.length);
        const pageData = this.searchResults.slice(start, end);
        
        countSpan.textContent = `(${this.searchResults.length}건)`;
        pageInfo.textContent = `${this.currentPage} / ${totalPages} 페이지`;
        
        // 고객별로 그룹화
        const customerGroups = this.groupByCustomer(pageData);
        
        container.innerHTML = customerGroups.map(group => this.createCustomerCard(group)).join('');
    }
    
    groupByCustomer(data) {
        const groups = new Map();
        
        data.forEach((row, index) => {
            const customerName = row['고객명'] || '알 수 없음';
            const key = customerName;
            
            if (!groups.has(key)) {
                groups.set(key, {
                    customerName,
                    records: []
                });
            }
            
            groups.get(key).records.push({
                ...row,
                index: ((this.currentPage - 1) * this.pageSize) + index + 1
            });
        });
        
        return Array.from(groups.values());
    }
    
    createCustomerCard(group) {
        const { customerName, records } = group;
        
        // 판매일 기준으로 서브그룹화 (날짜순 정렬)
        const dateGroups = new Map();
        records.forEach(record => {
            const saleDate = record['판매일'] || '미정';
            if (!dateGroups.has(saleDate)) {
                dateGroups.set(saleDate, []);
            }
            dateGroups.get(saleDate).push(record);
        });
        
        // 날짜순 정렬
        const sortedDateKeys = Array.from(dateGroups.keys()).sort((a, b) => {
            if (a === '미정') return 1;
            if (b === '미정') return -1;
            return String(a).localeCompare(String(b));
        });
        
        const isMultiDate = sortedDateKeys.length > 1;
        
        let cardHTML = `
            <div style="background: white; border: none; border-radius: 16px; padding: 24px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); border-left: 5px solid #667eea; overflow-wrap: break-word; word-break: break-word;">
                <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e9ecef;">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <div style="font-size: 1.3em; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                            ${records[0].index}.
                        </div>
                        <div style="font-size: 1.2em; font-weight: 700; color: #212529;">
                            ${customerName}
                        </div>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.95em; line-height: 1.6;">
        `;
        
        sortedDateKeys.forEach((dateKey, dateIndex) => {
            const dateRecords = dateGroups.get(dateKey);
            const firstRecord = dateRecords[0];
            
            // 복수 날짜인 경우 구분선 및 번호 표기
            if (isMultiDate) {
                if (dateIndex > 0) {
                    cardHTML += `<div style="margin: 16px 0; border-top: 3px solid #667eea; padding-top: 16px; opacity: 0.4;"></div>`;
                }
            }
            
            // 위치 정보
            const locationInfo = this.extractLocationInfo(firstRecord);
            if (locationInfo) {
                cardHTML += `
                    <div style="margin-bottom: 8px;">
                        <span style="font-size: 0.85em; color: #6c757d; padding: 6px 12px; background: #e9ecef; border-radius: 8px; font-weight: 600;">${locationInfo}</span>
                    </div>
                `;
            }
            
            // 판매일 정보
            if (firstRecord['판매일']) {
                const formattedDate = this.formatDateWithDay(firstRecord['판매일']);
                cardHTML += `
                    <div class="customer-card-row">
                        <span class="customer-card-label">판매일:</span>
                        <span class="customer-card-value" style="color: #212529; font-weight: 500;">${formattedDate}</span>
                    </div>
                `;
            }
            
            // 판매자 정보
            if (firstRecord['판매자']) {
                cardHTML += `
                    <div class="customer-card-row">
                        <span class="customer-card-label">판매자:</span>
                        <span class="customer-card-value" style="color: #212529; font-weight: 600;">${firstRecord['판매자']}</span>
                    </div>
                `;
            }
            
            // 배송일 정보
            if (firstRecord['배송일'] || firstRecord['배송예정일']) {
                const deliveryDate = firstRecord['배송일'] || firstRecord['배송예정일'] || '미정';
                const formattedDeliveryDate = deliveryDate === '미정' ? '미정' : this.formatDateWithDay(deliveryDate);
                cardHTML += `
                    <div class="customer-card-row" style="margin-bottom: 12px;">
                        <span class="customer-card-label">배송일:</span>
                        <span class="customer-card-value" style="color: #212529; font-weight: 500;">${formattedDeliveryDate}</span>
                    </div>
                `;
            }
            
            // 해당 날짜의 각 상품별 정보
            dateRecords.forEach((record, index) => {
                if (index > 0) {
                    cardHTML += `<div style="margin: 12px 0; border-top: 1px solid #e9ecef; padding-top: 12px;"></div>`;
                }
                
                // 상품 정보 조합 (타입 정보 포함: -T, -E, -N, -C, -A)
                const productParts = [];
                if (record['상품명']) {
                    let productName = record['상품명'];
                    const typeValue = record['타입'];
                    if (typeValue && String(typeValue).trim() !== '') {
                        productName += '-' + String(typeValue).trim();
                    }
                    productParts.push(productName);
                }
                if (record['규격']) productParts.push(record['규격']);
                if (record['등급'] && this.currentTab === 'ACE') productParts.push(record['등급']);
                if (record['소재'] && this.currentTab === 'ESSA') productParts.push(record['소재']);
                if (record['색상']) productParts.push(record['색상']);
                if (record['수량']) productParts.push(`${record['수량']}개`);
                
                const productInfo = productParts.join(' / ');
                
                if (productInfo) {
                    cardHTML += `
                        <div style="margin-bottom: 8px;">
                            <span class="customer-card-label">상품:</span><br>
                            <span style="color: #667eea; font-weight: 600;">▶${productInfo}</span>
                        </div>
                    `;
                }
                
                // 구매용도
                if (record['구매용도']) {
                    cardHTML += `
                        <div class="customer-card-row">
                            <span class="customer-card-label">구매용도:</span>
                            <span class="customer-card-value" style="color: #212529; font-weight: 500;">${record['구매용도']}</span>
                        </div>
                    `;
                }
                
                // 금액 정보
                if (record['할인가'] || record['출고가']) {
                    const amount = record['할인가'] || record['출고가'];
                    const isDiscounted = record['할인가'] ? true : false;
                    
                    cardHTML += `
                        <div class="customer-card-row">
                            <span class="customer-card-label">금액:</span>
                            <span class="customer-card-value" style="color: #10b981; font-weight: 700; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">
                                ${parseInt(amount).toLocaleString()}원${isDiscounted ? ' <span style="color: #ef4444; font-weight: 600;">(할인가)</span>' : ''}
                            </span>
                        </div>
                    `;
                }
                
                // 결제 정보
                const paymentInfo = this.getPaymentInfo(record);
                if (paymentInfo) {
                    cardHTML += `
                        <div class="customer-card-row">
                            <span class="customer-card-label">결제:</span>
                            <span class="customer-card-value" style="color: #212529; font-weight: 500;">${paymentInfo}</span>
                        </div>
                    `;
                }
                
                // 할인율
                const discountRate = this.getDiscountRate(record);
                if (discountRate) {
                    cardHTML += `
                        <div class="customer-card-row">
                            <span class="customer-card-label">할인율:</span>
                            <span class="customer-card-value" style="color: #f97316; font-weight: 700; font-family: 'SF Mono', Monaco, 'Courier New', monospace;">${discountRate}</span>
                        </div>
                    `;
                }
            });
        });
        
        cardHTML += `
                </div>
            </div>
        `;
        
        return cardHTML;
    }
    
    getDiscountRate(record) {
        // 할인가와 정상가 필드 확인
        const discountPrice = record['할인가'] || record['출고가'];
        const regularPrice = record['정상가'] || record['정가'] || record['원가'];
        
        // 할인가와 정상가가 모두 있어야 계산 가능
        if (!discountPrice || !regularPrice) return null;
        
        const discountNum = parseFloat(discountPrice);
        const regularNum = parseFloat(regularPrice);
        
        // 유효한 숫자가 아니거나 정상가가 0이면 계산 불가
        if (isNaN(discountNum) || isNaN(regularNum) || regularNum === 0) return null;
        
        // (할인가/정상가) - 1 수식 적용
        const discountRate = (discountNum / regularNum) - 1;
        
        // 퍼센트로 변환하고 소수점 1자리까지 표시
        const percentage = discountRate * 100;
        
        // -16.0% 형식으로 포맷팅
        return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`;
    }
    
    getPaymentInfo(record) {
        const paymentMethods = [];
        
        // 카드 결제
        if (record['카드'] && record['카드'] !== '0' && record['카드'] !== 0) {
            paymentMethods.push(`카드 ${parseInt(record['카드']).toLocaleString()}원`);
        }
        
        // 현금 결제
        if (record['현금'] && record['현금'] !== '0' && record['현금'] !== 0) {
            paymentMethods.push(`현금 ${parseInt(record['현금']).toLocaleString()}원`);
        }
        
        // QR 결제
        if (record['QR결제'] && record['QR결제'] !== '0' && record['QR결제'] !== 0) {
            paymentMethods.push(`QR ${parseInt(record['QR결제']).toLocaleString()}원`);
        }
        
        // 상품권
        if (record['지역상품권'] && record['지역상품권'] !== '0' && record['지역상품권'] !== 0) {
            paymentMethods.push(`상품권 ${parseInt(record['지역상품권']).toLocaleString()}원`);
        }
        
        return paymentMethods.join(' + ') || null;
    }
    
    formatDateWithDay(dateValue) {
        if (!dateValue) return '-';
        
        try {
            let date;
            const dateStr = String(dateValue);
            
            // YYYY-MM-DD 형식
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                date = new Date(dateStr);
            }
            // YYYYMMDD 형식
            else if (dateStr.match(/^\d{8}$/)) {
                const year = dateStr.slice(0, 4);
                const month = dateStr.slice(4, 6);
                const day = dateStr.slice(6, 8);
                date = new Date(`${year}-${month}-${day}`);
            }
            // 기타 형식
            else {
                date = new Date(dateStr);
            }
            
            if (isNaN(date.getTime())) {
                return dateStr;
            }
            
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const dayName = dayNames[date.getDay()];
            
            return `${year}년 ${month}월 ${day}일(${dayName})`;
        } catch (error) {
            return dateStr;
        }
    }
    
    extractLocationInfo(record) {
        const parts = [];
        if (record['지역1']) parts.push(record['지역1']);
        if (record['지역2']) parts.push(record['지역2']);
        if (record['지역3']) parts.push(record['지역3']);
        return parts.join(' ');
    }
    
    getRepurchaseInfo(customerName, records) {
        // 간단한 재구매 체크 (실제로는 전체 데이터에서 확인해야 함)
        return {
            isRepurchase: records.length > 1,
            purchaseCount: records.length
        };
    }
    
    formatDate(dateValue) {
        if (!dateValue) return '-';
        
        // 다양한 날짜 형식 처리
        const dateStr = String(dateValue);
        
        // YYYY-MM-DD 형식
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }
        
        // YYYYMMDD 형식
        if (dateStr.match(/^\d{8}$/)) {
            return `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
        }
        
        // 기타 형식은 그대로 반환
        return dateStr;
    }
    
}
