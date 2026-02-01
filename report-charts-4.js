// 매출 리포트 확장 차트 Part 4 - ACE 상세 차트

ReportModule.prototype.loadAceMaterialDetailCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 매출액 차트
        const salesCurrentQuery = `SELECT 등급, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 등급 IS NOT NULL AND 등급 != '' ${filter} GROUP BY 등급 ORDER BY sales DESC`;
        const salesCurrentResult = this.db.exec(salesCurrentQuery);
        
        let salesPrevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const salesPrevQuery = `SELECT 등급, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 등급 IS NOT NULL AND 등급 != '' ${prevFilter} GROUP BY 등급 ORDER BY sales DESC`;
            const salesPrevResultObj = this.db.exec(salesPrevQuery);
            salesPrevResult = salesPrevResultObj.length > 0 ? salesPrevResultObj[0] : {values: []};
        }
        
        let salesLabels = new Set();
        if (salesCurrentResult.length > 0) {
            salesCurrentResult[0].values.forEach(row => salesLabels.add(row[0]));
        }
        if (salesPrevResult.values && salesPrevResult.values.length > 0) {
            salesPrevResult.values.forEach(row => salesLabels.add(row[0]));
        }
        
        const salesLabelArray = Array.from(salesLabels);
        const salesCurrentData = salesLabelArray.map(label => {
            const row = salesCurrentResult.length > 0 ? salesCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const salesPrevData = salesLabelArray.map(label => {
            const row = salesPrevResult.values ? salesPrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.aceMaterialSales) this.charts.aceMaterialSales.destroy();
        const ctx1 = document.getElementById('aceMaterialSalesChart');
        this.charts.aceMaterialSales = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: salesLabelArray,
                datasets: [{
                    label: `${prevYearShort}년`,
                    data: salesPrevData,
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }, {
                    label: `${currentYearShort}년`,
                    data: salesCurrentData,
                    backgroundColor: 'rgba(118, 75, 162, 0.7)',
                    borderColor: '#764ba2',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
            }
        });
        
        // 판매수량 차트
        const quantityCurrentQuery = `SELECT 등급, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 등급 IS NOT NULL AND 등급 != '' ${filter} GROUP BY 등급 ORDER BY quantity DESC`;
        const quantityCurrentResult = this.db.exec(quantityCurrentQuery);
        
        let quantityPrevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const quantityPrevQuery = `SELECT 등급, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 등급 IS NOT NULL AND 등급 != '' ${prevFilter} GROUP BY 등급 ORDER BY quantity DESC`;
            const quantityPrevResultObj = this.db.exec(quantityPrevQuery);
            quantityPrevResult = quantityPrevResultObj.length > 0 ? quantityPrevResultObj[0] : {values: []};
        }
        
        let quantityLabels = new Set();
        if (quantityCurrentResult.length > 0) {
            quantityCurrentResult[0].values.forEach(row => quantityLabels.add(row[0]));
        }
        if (quantityPrevResult.values && quantityPrevResult.values.length > 0) {
            quantityPrevResult.values.forEach(row => quantityLabels.add(row[0]));
        }
        
        const quantityLabelArray = Array.from(quantityLabels);
        const quantityCurrentData = quantityLabelArray.map(label => {
            const row = quantityCurrentResult.length > 0 ? quantityCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const quantityPrevData = quantityLabelArray.map(label => {
            const row = quantityPrevResult.values ? quantityPrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.aceMaterialQuantity) this.charts.aceMaterialQuantity.destroy();
        const ctx2 = document.getElementById('aceMaterialQuantityChart');
        this.charts.aceMaterialQuantity = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: quantityLabelArray,
                datasets: [{
                    label: `${prevYearShort}년`,
                    data: quantityPrevData,
                    backgroundColor: 'rgba(255, 193, 7, 0.7)',
                    borderColor: '#ffc107',
                    borderWidth: 1
                }, {
                    label: `${currentYearShort}년`,
                    data: quantityCurrentData,
                    backgroundColor: 'rgba(255, 152, 0, 0.7)',
                    borderColor: '#ff9800',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (error) {
        console.error('ACE 소재 차트 오류:', error);
    }
};
