// 매출 캘린더 모듈 (sales_calendar 기반)
class CalendarModule {
    constructor(db, SQL) {
        this.db = db;
        this.SQL = SQL;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth() + 1;
        this.currentCompany = '';
        this.currentSeller = '';
        this.salesData = [];
    }
    
    render() {
        const container = document.getElementById('calendarTab');
        container.innerHTML = `
            <div style="background: white; border-radius: 15px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333; font-size: 0.9em;">년도</label>
                                <select id="calendarYear" style="padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px; min-width: 100px;">
                                    ${Array.from({length: 6}, (_, i) => {
                                        const year = new Date().getFullYear() - 3 + i;
                                        return `<option value="${year}" ${year === this.currentYear ? 'selected' : ''}>${year}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333; font-size: 0.9em;">월</label>
                                <select id="calendarMonth" style="padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px; min-width: 100px;">
                                    ${Array.from({length: 12}, (_, i) => `<option value="${i+1}" ${i+1 === this.currentMonth ? 'selected' : ''}>${i+1}월</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333; font-size: 0.9em;">브랜드</label>
                                <select id="calendarCompany" style="padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px; min-width: 100px;">
                                    <option value="">전체</option>
                                    <option value="ACE">ACE</option>
                                    <option value="ESSA">ESSA</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333; font-size: 0.9em;">판매자</label>
                                <select id="calendarSeller" style="padding: 10px; border: 2px solid #e1e5e9; border-radius: 8px; min-width: 120px;">
                                    <option value="">전체</option>
                                </select>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <div style="text-align: center; padding: 0 15px; border-right: 2px solid #e9ecef;">
                                <div style="font-size: 0.8em; color: #6c757d; margin-bottom: 5px; font-weight: 600;">일간 평균</div>
                                <div id="dailyAvg" style="font-size: 1.1em; font-weight: 700; color: #28a745;">0원</div>
                            </div>
                            <div style="text-align: center; padding: 0 15px;">
                                <div style="font-size: 0.8em; color: #6c757d; margin-bottom: 5px; font-weight: 600;">월간 매출</div>
                                <div id="monthlySales" style="font-size: 1.1em; font-weight: 700; color: #28a745;">0원</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <button id="calendarPrev" style="padding: 12px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">◀ 이전</button>
                    <div id="currentMonth" style="font-size: 1.8em; font-weight: 700; color: #333;"></div>
                    <button id="calendarNext" style="padding: 12px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">다음 ▶</button>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <thead>
                        <tr>
                            ${['월', '화', '수', '목', '금', '토', '일'].map(day => 
                                `<th style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; text-align: center; font-weight: 600; border: 1px solid #e0e6ed;">${day}</th>`
                            ).join('')}
                        </tr>
                    </thead>
                    <tbody id="calendarBody">
                    </tbody>
                </table>
                
                <!-- 일별 판매 내역 카드뷰 -->
                <div id="dailySalesDetails" style="display: none; margin-top: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
                        <h3 id="dailySalesTitle" style="color: #333; font-size: 1.4em; font-weight: 600; margin: 0;"></h3>
                        <button id="closeDailySales" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">닫기</button>
                    </div>
                    <div id="dailySalesCards" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; background: #f8f9fa; padding: 20px; border-radius: 10px;">
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.loadSellers();
        this.loadCalendar();
    }
    
    setupEventListeners() {
        document.getElementById('calendarYear').addEventListener('change', (e) => {
            this.currentYear = parseInt(e.target.value);
            this.loadCalendar();
        });
        
        document.getElementById('calendarMonth').addEventListener('change', (e) => {
            this.currentMonth = parseInt(e.target.value);
            this.loadCalendar();
        });
        
        document.getElementById('calendarCompany').addEventListener('change', (e) => {
            this.currentCompany = e.target.value;
            this.currentSeller = '';
            document.getElementById('calendarSeller').value = '';
            this.loadSellers();
            this.loadCalendar();
        });
        
        document.getElementById('calendarSeller').addEventListener('change', (e) => {
            this.currentSeller = e.target.value;
            this.loadCalendar();
        });
        
        document.getElementById('calendarPrev').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 1) {
                this.currentMonth = 12;
                this.currentYear--;
            }
            document.getElementById('calendarYear').value = this.currentYear;
            document.getElementById('calendarMonth').value = this.currentMonth;
            this.loadCalendar();
        });
        
        document.getElementById('calendarNext').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 12) {
                this.currentMonth = 1;
                this.currentYear++;
            }
            document.getElementById('calendarYear').value = this.currentYear;
            document.getElementById('calendarMonth').value = this.currentMonth;
            this.loadCalendar();
        });
        
        // 일별 판매 내역 닫기 버튼
        document.getElementById('closeDailySales').addEventListener('click', () => {
            document.getElementById('dailySalesDetails').style.display = 'none';
        });
    }
    
    loadSellers() {
        try {
            const sellerSelect = document.getElementById('calendarSeller');
            sellerSelect.innerHTML = '<option value="">전체</option>';
            
            if (this.currentCompany) {
                const tableName = `data_(${this.currentCompany})`;
                const result = this.db.exec(`SELECT DISTINCT 판매자 FROM "${tableName}" ORDER BY 판매자`);
                
                if (result.length > 0) {
                    result[0].values.forEach(([seller]) => {
                        if (seller) sellerSelect.innerHTML += `<option value="${seller}">${seller}</option>`;
                    });
                }
            } else {
                // 전체 브랜드의 판매자
                ['ACE', 'ESSA'].forEach(company => {
                    try {
                        const tableName = `data_(${company})`;
                        const result = this.db.exec(`SELECT DISTINCT 판매자 FROM "${tableName}" ORDER BY 판매자`);
                        
                        if (result.length > 0) {
                            result[0].values.forEach(([seller]) => {
                                if (seller) sellerSelect.innerHTML += `<option value="${seller}">${seller}</option>`;
                            });
                        }
                    } catch (e) {}
                });
            }
        } catch (error) {
            console.error('판매자 로드 오류:', error);
        }
    }
    
    loadCalendar() {
        try {
            // 현재 월 표시
            document.getElementById('currentMonth').textContent = `${this.currentYear}년 ${this.currentMonth}월`;
            
            // 매출 데이터 로드
            this.loadSalesData();
            
            // 캘린더 렌더링
            this.renderCalendar();
            
            // 통계 업데이트
            this.updateStats();
        } catch (error) {
            console.error('캘린더 로드 오류:', error);
        }
    }
    
    loadSalesData() {
        this.salesData = [];
        
        const tables = this.currentCompany ? [`data_(${this.currentCompany})`] : ['data_(ACE)', 'data_(ESSA)'];
        
        tables.forEach(tableName => {
            try {
                let query = `SELECT YEAR, MONTH, 판매일, 판매자, 할인가 FROM "${tableName}" 
                            WHERE YEAR = ${this.currentYear} AND MONTH = ${this.currentMonth}`;
                
                if (this.currentSeller) {
                    query += ` AND 판매자 = '${this.currentSeller}'`;
                }
                
                const result = this.db.exec(query);
                
                if (result.length > 0) {
                    const { columns, values } = result[0];
                    values.forEach(row => {
                        const obj = {};
                        columns.forEach((col, idx) => {
                            obj[col] = row[idx];
                        });
                        
                        // 날짜 파싱
                        let day = null;
                        if (obj['판매일']) {
                            const dateMatch = obj['판매일'].toString().match(/\d{4}-\d{1,2}-(\d{1,2})/);
                            if (dateMatch) {
                                day = parseInt(dateMatch[1]);
                            }
                        }
                        
                        if (day) {
                            this.salesData.push({
                                day: day,
                                amount: parseFloat(obj['할인가'] || 0)
                            });
                        }
                    });
                }
            } catch (e) {
                console.log(`테이블 ${tableName} 조회 실패:`, e.message);
            }
        });
    }
    
    renderCalendar() {
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();
        
        // 일별 매출 집계
        const dailySales = {};
        this.salesData.forEach(item => {
            dailySales[item.day] = (dailySales[item.day] || 0) + item.amount;
        });
        
        const tbody = document.getElementById('calendarBody');
        tbody.innerHTML = '';
        
        let html = '<tr>';
        let dayCount = 1;
        
        // 시작 요일 전 빈 칸
        for (let i = 0; i < (startDayOfWeek === 0 ? 6 : startDayOfWeek - 1); i++) {
            html += '<td style="background: #f8f9fa; border: 1px solid #e0e6ed;"></td>';
        }
        
        // 날짜 채우기
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDayOfWeek = (startDayOfWeek + day - 1) % 7;
            const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;
            const sales = dailySales[day] || 0;
            
            const bgColor = isWeekend ? '#fff5f5' : '#ffffff';
            const dateColor = currentDayOfWeek === 0 ? '#dc3545' : (isWeekend ? '#e74c3c' : '#2c3e50');
            
            html += `
                <td style="border: 1px solid #e0e6ed; padding: 8px; text-align: center; vertical-align: top; height: 95px; background: ${bgColor}; cursor: pointer; transition: all 0.2s ease;" 
                    onmouseover="this.style.background='#f0f4ff'; this.style.transform='scale(1.02)'"
                    onmouseout="this.style.background='${bgColor}'; this.style.transform='scale(1)'"
                    onclick="window.calendarModule.showDailySales(${day})">
                    <div style="font-weight: 700; font-size: 16px; margin-bottom: 6px; color: ${dateColor};">${day}</div>
                    <div style="font-size: 12px; font-weight: 700; padding: 3px 6px; border-radius: 5px; ${
                        sales > 0 ? 'background: rgba(40, 167, 69, 0.15); color: #1e7e34; border: 1px solid rgba(40, 167, 69, 0.3);' :
                        sales < 0 ? 'background: rgba(220, 53, 69, 0.15); color: #c82333; border: 1px solid rgba(220, 53, 69, 0.3);' :
                        'background: rgba(108, 117, 125, 0.1); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.2);'
                    }">
                        ${sales !== 0 ? this.formatAmount(sales) : '-'}
                    </div>
                </td>
            `;
            
            if (currentDayOfWeek === 0) {
                html += '</tr><tr>';
            }
            
            dayCount++;
        }
        
        // 마지막 주 빈 칸
        const lastDayOfWeek = lastDay.getDay();
        if (lastDayOfWeek !== 0) {
            for (let i = lastDayOfWeek; i < 7; i++) {
                html += '<td style="background: #f8f9fa; border: 1px solid #e0e6ed;"></td>';
            }
        }
        
        html += '</tr>';
        tbody.innerHTML = html;
    }
    
    updateStats() {
        const totalSales = this.salesData.reduce((sum, item) => sum + item.amount, 0);
        const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        const avgSales = totalSales / daysInMonth;
        
        document.getElementById('dailyAvg').textContent = this.formatAmount(avgSales);
        document.getElementById('monthlySales').textContent = this.formatAmount(totalSales);
    }
    
    formatAmount(amount) {
        const absAmount = Math.abs(amount);
        const isNegative = amount < 0;
        const prefix = isNegative ? '-' : '';
        
        if (absAmount >= 1000000) {
            return `${prefix}${(absAmount / 1000000).toFixed(1)}백만원`;
        } else if (absAmount >= 10000) {
            return `${prefix}${Math.round(absAmount / 10000)}만원`;
        } else if (absAmount >= 1000) {
            return `${prefix}${Math.round(absAmount / 1000)}천원`;
        } else {
            return `${prefix}${Math.round(absAmount)}원`;
        }
    }
    
    showDailySales(day) {
        try {
            // 해당 일의 판매 데이터 조회
            const dailyData = this.getDailySalesData(day);
            
            if (dailyData.length === 0) {
                alert('해당 날짜에 판매 데이터가 없습니다.');
                return;
            }
            
            // 제목 설정
            const title = `${this.currentYear}년 ${this.currentMonth}월 ${day}일 판매 내역 (${dailyData.length}건)`;
            document.getElementById('dailySalesTitle').textContent = title;
            
            // 카드뷰 생성
            this.renderDailySalesCards(dailyData);
            
            // 카드뷰 표시
            document.getElementById('dailySalesDetails').style.display = 'block';
            
            // 스크롤 이동
            document.getElementById('dailySalesDetails').scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('일별 판매 내역 표시 오류:', error);
            alert('판매 내역을 불러오는 중 오류가 발생했습니다.');
        }
    }
    
    getDailySalesData(day) {
        const salesData = [];
        const tables = this.currentCompany ? [`data_(${this.currentCompany})`] : ['data_(ACE)', 'data_(ESSA)'];
        
        tables.forEach(tableName => {
            try {
                let query = `SELECT * FROM "${tableName}" 
                            WHERE YEAR = ${this.currentYear} AND MONTH = ${this.currentMonth}`;
                
                if (this.currentSeller) {
                    query += ` AND 판매자 = '${this.currentSeller}'`;
                }
                
                const result = this.db.exec(query);
                
                if (result.length > 0) {
                    const { columns, values } = result[0];
                    values.forEach(row => {
                        const obj = {};
                        columns.forEach((col, idx) => {
                            obj[col] = row[idx];
                        });
                        
                        // 날짜 파싱하여 해당 일인지 확인
                        if (obj['판매일']) {
                            const dateMatch = obj['판매일'].toString().match(/\d{4}-\d{1,2}-(\d{1,2})/);
                            if (dateMatch && parseInt(dateMatch[1]) === day) {
                                obj._tableName = tableName; // 테이블 정보 추가
                                salesData.push(obj);
                            }
                        }
                    });
                }
            } catch (e) {
                console.log(`테이블 ${tableName} 조회 실패:`, e.message);
            }
        });
        
        return salesData;
    }
    
    renderDailySalesCards(data) {
        const container = document.getElementById('dailySalesCards');
        
        // 고객별로 그룹화
        const customerGroups = this.groupByCustomer(data);
        
        container.innerHTML = customerGroups.map(group => this.createCustomerCard(group)).join('');
    }
    
    groupByCustomer(data) {
        const groups = new Map();
        
        data.forEach((row, index) => {
            const customerName = row['고객명'] || '알 수 없음';
            const customerNumber = row['고객번호'] || '';
            const key = `${customerName}_${customerNumber}`;
            
            if (!groups.has(key)) {
                groups.set(key, {
                    customerName,
                    customerNumber,
                    records: []
                });
            }
            
            groups.get(key).records.push({
                ...row,
                index: index + 1
            });
        });
        
        return Array.from(groups.values());
    }
    
    createCustomerCard(group) {
        const { customerName, customerNumber, records } = group;
        const firstRecord = records[0];
        
        // 위치 정보 추출
        const locationInfo = this.extractLocationInfo(firstRecord);
        
        let cardHTML = `
            <div style="background: white; border: none; border-radius: 16px; padding: 24px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); border-left: 5px solid #667eea;">
                <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #e9ecef;">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <div style="font-size: 1.3em; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                            ${records[0].index}.
                        </div>
                        <div style="font-size: 1.2em; font-weight: 700; color: #212529;">
                            ${customerName}
                        </div>
                        ${locationInfo ? `<div style="font-size: 0.85em; color: #6c757d; padding: 6px 12px; background: #e9ecef; border-radius: 8px; font-weight: 600;">${locationInfo}</div>` : ''}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.95em; line-height: 1.6;">
        `;
        
        // 판매일 정보
        if (firstRecord['판매일']) {
            const formattedDate = this.formatDateWithDay(firstRecord['판매일']);
            cardHTML += `
                <div style="margin-bottom: 8px;">
                    <span style="font-weight: 700; color: #495057;">판매일:</span>
                    <span style="color: #212529; font-weight: 500; margin-left: 8px;">${formattedDate}</span>
                </div>
            `;
        }
        
        // 판매자 정보
        if (firstRecord['판매자']) {
            cardHTML += `
                <div style="margin-bottom: 8px;">
                    <span style="font-weight: 700; color: #495057;">판매자:</span>
                    <span style="color: #212529; font-weight: 600; margin-left: 8px;">${firstRecord['판매자']}</span>
                </div>
            `;
        }
        
        // 배송일 정보 (있는 경우)
        if (firstRecord['배송일'] || firstRecord['배송예정일']) {
            const deliveryDate = firstRecord['배송일'] || firstRecord['배송예정일'] || '미정';
            const formattedDeliveryDate = deliveryDate === '미정' ? '미정' : this.formatDateWithDay(deliveryDate);
            cardHTML += `
                <div style="margin-bottom: 12px;">
                    <span style="font-weight: 700; color: #495057;">배송일:</span>
                    <span style="color: #212529; font-weight: 500; margin-left: 8px;">${formattedDeliveryDate}</span>
                </div>
            `;
        }
        
        // 각 상품별 정보
        records.forEach((record, index) => {
            if (index > 0) {
                cardHTML += `<div style="margin: 12px 0; border-top: 1px solid #e9ecef; padding-top: 12px;"></div>`;
            }
            
            // 브랜드 정보 (테이블명에서 추출)
            const brand = record._tableName ? record._tableName.replace('data_(', '').replace(')', '') : '';
            
            // 상품 정보 조합
            const productParts = [];
            if (record['상품명']) productParts.push(record['상품명']);
            if (record['규격']) productParts.push(record['규격']);
            if (record['등급'] && brand === 'ACE') productParts.push(record['등급']);
            if (record['소재'] && brand === 'ESSA') productParts.push(record['소재']);
            if (record['색상']) productParts.push(record['색상']);
            if (record['수량']) productParts.push(`${record['수량']}개`);
            
            const productInfo = productParts.join(' / ');
            
            if (productInfo) {
                cardHTML += `
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #495057;">상품:</span>
                        <span style="color: #667eea; font-weight: 600; margin-left: 8px;">${productInfo}</span>
                    </div>
                `;
            }
            
            // 구매용도
            if (record['구매용도']) {
                cardHTML += `
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #495057;">구매용도:</span>
                        <span style="color: #212529; font-weight: 500; margin-left: 8px;">${record['구매용도']}</span>
                    </div>
                `;
            }
            
            // 금액 정보
            if (record['할인가'] || record['출고가']) {
                const amount = record['할인가'] || record['출고가'];
                const isDiscounted = record['할인가'] ? true : false;
                
                cardHTML += `
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #495057;">금액:</span>
                        <span style="color: #10b981; font-weight: 700; font-family: 'SF Mono', Monaco, 'Courier New', monospace; margin-left: 8px;">
                            ${parseInt(amount).toLocaleString()}원
                        </span>
                        ${isDiscounted ? '<span style="color: #ef4444; font-weight: 600; margin-left: 4px;">(할인가)</span>' : ''}
                    </div>
                `;
            }
            
            // 결제 정보
            const paymentInfo = this.getPaymentInfo(record);
            if (paymentInfo) {
                cardHTML += `
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #495057;">결제:</span>
                        <span style="color: #212529; font-weight: 500; margin-left: 8px;">${paymentInfo}</span>
                    </div>
                `;
            }
            
            // 할인율
            const discountRate = this.getDiscountRate(record);
            if (discountRate) {
                cardHTML += `
                    <div style="margin-bottom: 8px;">
                        <span style="font-weight: 700; color: #495057;">할인율:</span>
                        <span style="color: #f97316; font-weight: 700; font-family: 'SF Mono', Monaco, 'Courier New', monospace; margin-left: 8px;">${discountRate}</span>
                    </div>
                `;
            }
        });
        
        cardHTML += `
                </div>
            </div>
        `;
        
        return cardHTML;
    }
    
    extractLocationInfo(record) {
        const parts = [];
        if (record['지역1']) parts.push(record['지역1']);
        if (record['지역2']) parts.push(record['지역2']);
        if (record['지역3']) parts.push(record['지역3']);
        return parts.join(' ');
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
}
