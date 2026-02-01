// 매출 리포트 확장 차트 Part 6 - ESSA 전용 차트

ReportModule.prototype.loadAgeCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        const currentQuery = `SELECT 연령대, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 연령대 IS NOT NULL AND 연령대 != '' ${filter} GROUP BY 연령대 ORDER BY sales DESC`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const prevQuery = `SELECT 연령대, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 연령대 IS NOT NULL AND 연령대 != '' ${prevFilter} GROUP BY 연령대 ORDER BY sales DESC`;
            const prevResultObj = this.db.exec(prevQuery);
            prevResult = prevResultObj.length > 0 ? prevResultObj[0] : {values: []};
        }
        
        let allLabels = new Set();
        if (currentResult.length > 0) {
            currentResult[0].values.forEach(row => allLabels.add(row[0]));
        }
        if (prevResult.values && prevResult.values.length > 0) {
            prevResult.values.forEach(row => allLabels.add(row[0]));
        }
        
        const labels = allLabels.size > 0 ? Array.from(allLabels) : ['데이터 없음'];
        const currentData = labels.map(label => {
            const row = currentResult.length > 0 ? currentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const prevData = labels.map(label => {
            const row = prevResult.values ? prevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.ageSales) this.charts.ageSales.destroy();
        const ctx = document.getElementById('ageSalesChart');
        this.charts.ageSales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${prevYearShort}년`,
                    data: prevData,
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }, {
                    label: `${currentYearShort}년`,
                    data: currentData,
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
    } catch (error) {
        console.error('연령대 차트 오류:', error);
    }
};

ReportModule.prototype.loadEssaSellerChart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        const currentQuery = `SELECT 판매자, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 판매자 IS NOT NULL AND 판매자 != '' ${filter} GROUP BY 판매자 ORDER BY sales DESC`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const prevQuery = `SELECT 판매자, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 판매자 IS NOT NULL AND 판매자 != '' ${prevFilter} GROUP BY 판매자 ORDER BY sales DESC`;
            const prevResultObj = this.db.exec(prevQuery);
            prevResult = prevResultObj.length > 0 ? prevResultObj[0] : {values: []};
        }
        
        let allLabels = new Set();
        if (currentResult.length > 0) {
            currentResult[0].values.forEach(row => allLabels.add(row[0]));
        }
        if (prevResult.values && prevResult.values.length > 0) {
            prevResult.values.forEach(row => allLabels.add(row[0]));
        }
        
        const labels = allLabels.size > 0 ? Array.from(allLabels) : ['데이터 없음'];
        const currentData = labels.map(label => {
            const row = currentResult.length > 0 ? currentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const prevData = labels.map(label => {
            const row = prevResult.values ? prevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.essaSeller) this.charts.essaSeller.destroy();
        const ctx = document.getElementById('essaSellerChart');
        this.charts.essaSeller = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${prevYearShort}년`,
                    data: prevData,
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: '#667eea',
                    borderWidth: 1
                }, {
                    label: `${currentYearShort}년`,
                    data: currentData,
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
    } catch (error) {
        console.error('ESSA 판매자 차트 오류:', error);
    }
};

ReportModule.prototype.loadEssaMaterialDetailCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 소재별 매출액 차트
        const salesCurrentQuery = `SELECT 소재, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 소재 IS NOT NULL AND 소재 != '' ${filter} GROUP BY 소재 ORDER BY sales DESC`;
        const salesCurrentResult = this.db.exec(salesCurrentQuery);
        
        let salesPrevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const salesPrevQuery = `SELECT 소재, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 소재 IS NOT NULL AND 소재 != '' ${prevFilter} GROUP BY 소재 ORDER BY sales DESC`;
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
        
        if (this.charts.essaMaterialSales) this.charts.essaMaterialSales.destroy();
        const ctx1 = document.getElementById('essaMaterialSalesChart');
        this.charts.essaMaterialSales = new Chart(ctx1, {
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
        
        // 소재별 판매수량 차트
        const quantityCurrentQuery = `SELECT 소재, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 소재 IS NOT NULL AND 소재 != '' ${filter} GROUP BY 소재 ORDER BY quantity DESC`;
        const quantityCurrentResult = this.db.exec(quantityCurrentQuery);
        
        let quantityPrevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const quantityPrevQuery = `SELECT 소재, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 소재 IS NOT NULL AND 소재 != '' ${prevFilter} GROUP BY 소재 ORDER BY quantity DESC`;
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
        
        if (this.charts.essaMaterialQuantity) this.charts.essaMaterialQuantity.destroy();
        const ctx2 = document.getElementById('essaMaterialQuantityChart');
        this.charts.essaMaterialQuantity = new Chart(ctx2, {
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
        console.error('ESSA 소재 차트 오류:', error);
    }
};

ReportModule.prototype.loadProductColorCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 상품별 판매수량 차트
        const productCurrentQuery = `SELECT 상품명, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 상품명 IS NOT NULL AND 상품명 != '' ${filter} GROUP BY 상품명 ORDER BY quantity DESC LIMIT 10`;
        const productCurrentResult = this.db.exec(productCurrentQuery);
        
        let productPrevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const productPrevQuery = `SELECT 상품명, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 상품명 IS NOT NULL AND 상품명 != '' ${prevFilter} GROUP BY 상품명 ORDER BY quantity DESC LIMIT 10`;
            const productPrevResultObj = this.db.exec(productPrevQuery);
            productPrevResult = productPrevResultObj.length > 0 ? productPrevResultObj[0] : {values: []};
        }
        
        let productLabels = new Set();
        if (productCurrentResult.length > 0) {
            productCurrentResult[0].values.forEach(row => productLabels.add(row[0]));
        }
        if (productPrevResult.values && productPrevResult.values.length > 0) {
            productPrevResult.values.forEach(row => productLabels.add(row[0]));
        }
        
        const productLabelArray = Array.from(productLabels);
        const productCurrentData = productLabelArray.map(label => {
            const row = productCurrentResult.length > 0 ? productCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const productPrevData = productLabelArray.map(label => {
            const row = productPrevResult.values ? productPrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.productQuantity) this.charts.productQuantity.destroy();
        const ctx1 = document.getElementById('productQuantityChart');
        this.charts.productQuantity = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: productLabelArray,
                datasets: [{
                    label: `${prevYearShort}년`,
                    data: productPrevData,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: '#4bc0c0',
                    borderWidth: 1
                }, {
                    label: `${currentYearShort}년`,
                    data: productCurrentData,
                    backgroundColor: 'rgba(153, 102, 255, 0.7)',
                    borderColor: '#9966ff',
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
        
        // 색상별 판매수량 차트
        const colorCurrentQuery = `SELECT 색상, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 색상 IS NOT NULL AND 색상 != '' ${filter} GROUP BY 색상 ORDER BY quantity DESC LIMIT 10`;
        const colorCurrentResult = this.db.exec(colorCurrentQuery);
        
        let colorPrevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const colorPrevQuery = `SELECT 색상, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 색상 IS NOT NULL AND 색상 != '' ${prevFilter} GROUP BY 색상 ORDER BY quantity DESC LIMIT 10`;
            const colorPrevResultObj = this.db.exec(colorPrevQuery);
            colorPrevResult = colorPrevResultObj.length > 0 ? colorPrevResultObj[0] : {values: []};
        }
        
        let colorLabels = new Set();
        if (colorCurrentResult.length > 0) {
            colorCurrentResult[0].values.forEach(row => colorLabels.add(row[0]));
        }
        if (colorPrevResult.values && colorPrevResult.values.length > 0) {
            colorPrevResult.values.forEach(row => colorLabels.add(row[0]));
        }
        
        const colorLabelArray = Array.from(colorLabels);
        const colorCurrentData = colorLabelArray.map(label => {
            const row = colorCurrentResult.length > 0 ? colorCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const colorPrevData = colorLabelArray.map(label => {
            const row = colorPrevResult.values ? colorPrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.colorQuantity) this.charts.colorQuantity.destroy();
        const ctx2 = document.getElementById('colorQuantityChart');
        this.charts.colorQuantity = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: colorLabelArray,
                datasets: [{
                    label: `${prevYearShort}년`,
                    data: colorPrevData,
                    backgroundColor: 'rgba(255, 206, 86, 0.7)',
                    borderColor: '#ffce56',
                    borderWidth: 1
                }, {
                    label: `${currentYearShort}년`,
                    data: colorCurrentData,
                    backgroundColor: 'rgba(255, 159, 64, 0.7)',
                    borderColor: '#ff9f40',
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
        console.error('상품/색상 차트 오류:', error);
    }
};
