<<<<<<< HEAD
// 매출 리포트 확장 차트 Part 6 - ESSA 전용 차트

ReportModule.prototype.loadAgeCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 년도: 전체 선택시 범례 숨김
        const hideYearLegend = !currentYear;
        
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
        
        const ageBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
        };
        
        let ageDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            ageDatasets = [{
                label: '매출',
                data: currentData,
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: '#764ba2',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            ageDatasets = [{
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
            }];
        }
        
        this.charts.ageSales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: ageDatasets
            },
            options: this.getMobileOptimizedOptions(ageBaseOptions)
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
        
        // 년도: 전체 선택시 범례 숨김
        const hideYearLegend = !currentYear;
        
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
        
        const essaSellerBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
        };
        
        let essaSellerDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            essaSellerDatasets = [{
                label: '매출',
                data: currentData,
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: '#764ba2',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            essaSellerDatasets = [{
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
            }];
        }
        
        this.charts.essaSeller = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: essaSellerDatasets
            },
            options: this.getMobileOptimizedOptions(essaSellerBaseOptions)
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
        
        // 년도: 전체 선택시 범례 숨김
        const hideYearLegend = !currentYear;
        
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
        
        const essaSalesBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
        };
        
        let essaSalesDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            essaSalesDatasets = [{
                label: '매출',
                data: salesCurrentData,
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: '#764ba2',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            essaSalesDatasets = [{
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
            }];
        }
        
        this.charts.essaMaterialSales = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: salesLabelArray,
                datasets: essaSalesDatasets
            },
            options: this.getMobileOptimizedOptions(essaSalesBaseOptions)
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
        
        const essaQuantityBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true } }
        };
        
        let essaQuantityDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            essaQuantityDatasets = [{
                label: '수량',
                data: quantityCurrentData,
                backgroundColor: 'rgba(255, 152, 0, 0.7)',
                borderColor: '#ff9800',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            essaQuantityDatasets = [{
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
            }];
        }
        
        this.charts.essaMaterialQuantity = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: quantityLabelArray,
                datasets: essaQuantityDatasets
            },
            options: this.getMobileOptimizedOptions(essaQuantityBaseOptions)
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
        
        // 년도: 전체 선택시 범례 숨김
        const hideYearLegend = !currentYear;
        
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
        
        const productQuantityBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true } }
        };
        
        let productQuantityDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            productQuantityDatasets = [{
                label: '수량',
                data: productCurrentData,
                backgroundColor: 'rgba(153, 102, 255, 0.7)',
                borderColor: '#9966ff',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            productQuantityDatasets = [{
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
            }];
        }
        
        this.charts.productQuantity = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: productLabelArray,
                datasets: productQuantityDatasets
            },
            options: this.getMobileOptimizedOptions(productQuantityBaseOptions)
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
        
        const colorQuantityBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true } }
        };
        
        let colorQuantityDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            colorQuantityDatasets = [{
                label: '수량',
                data: colorCurrentData,
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
                borderColor: '#ff9f40',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            colorQuantityDatasets = [{
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
            }];
        }
        
        this.charts.colorQuantity = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: colorLabelArray,
                datasets: colorQuantityDatasets
            },
            options: this.getMobileOptimizedOptions(colorQuantityBaseOptions)
        });
    } catch (error) {
        console.error('상품/색상 차트 오류:', error);
    }
};

// 월별 할인율 추이 차트 (18번) - ACE 전용
ReportModule.prototype.loadDiscountRateChart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        const selectedSeller = document.getElementById('sellerFilter').value;
        
        // 년도: 전체인 경우 범례 숨김
        const hideYearLegend = !currentYear;
        
        // 판매자가 선택된 경우
        if (selectedSeller) {
            const sellerCurrentQuery = `SELECT MONTH, SUM(할인가) as discount_price, SUM(정상가) as normal_price FROM "${this.currentTable}" WHERE 1=1 ${filter} GROUP BY MONTH ORDER BY MONTH`;
            const sellerCurrentResult = this.db.exec(sellerCurrentQuery);
            
            let sellerPrevResult = [];
            if (prevYear && !hideYearLegend) {
                const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const sellerPrevQuery = `SELECT MONTH, SUM(할인가) as discount_price, SUM(정상가) as normal_price FROM "${this.currentTable}" WHERE 1=1 ${prevFilter} GROUP BY MONTH ORDER BY MONTH`;
                const sellerPrevResultObj = this.db.exec(sellerPrevQuery);
                sellerPrevResult = sellerPrevResultObj.length > 0 ? sellerPrevResultObj[0].values : [];
            }
            
            const filterWithoutSeller = filter.replace(` AND 판매자 = '${selectedSeller}'`, '');
            const allCurrentQuery = `SELECT MONTH, SUM(할인가) as discount_price, SUM(정상가) as normal_price FROM "${this.currentTable}" WHERE 1=1 ${filterWithoutSeller} GROUP BY MONTH ORDER BY MONTH`;
            const allCurrentResult = this.db.exec(allCurrentQuery);
            
            let allPrevResult = [];
            if (prevYear && !hideYearLegend) {
                const prevFilterWithoutSeller = filterWithoutSeller.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const allPrevQuery = `SELECT MONTH, SUM(할인가) as discount_price, SUM(정상가) as normal_price FROM "${this.currentTable}" WHERE 1=1 ${prevFilterWithoutSeller} GROUP BY MONTH ORDER BY MONTH`;
                const allPrevResultObj = this.db.exec(allPrevQuery);
                allPrevResult = allPrevResultObj.length > 0 ? allPrevResultObj[0].values : [];
            }
            
            const sellerCurrentData = Array(12).fill(0);
            const sellerPrevData = Array(12).fill(0);
            const allCurrentData = Array(12).fill(0);
            const allPrevData = Array(12).fill(0);
            
            if (sellerCurrentResult.length > 0) {
                sellerCurrentResult[0].values.forEach(row => {
                    const month = parseInt(row[0]);
                    const discountPrice = row[1];
                    const normalPrice = row[2];
                    if (month >= 1 && month <= 12 && normalPrice > 0) {
                        sellerCurrentData[month-1] = (1 - (discountPrice / normalPrice)) * 100;
                    }
                });
            }
            
            if (!hideYearLegend) {
                sellerPrevResult.forEach(row => {
                    const month = parseInt(row[0]);
                    const discountPrice = row[1];
                    const normalPrice = row[2];
                    if (month >= 1 && month <= 12 && normalPrice > 0) {
                        sellerPrevData[month-1] = (1 - (discountPrice / normalPrice)) * 100;
                    }
                });
            }
            
            if (allCurrentResult.length > 0) {
                allCurrentResult[0].values.forEach(row => {
                    const month = parseInt(row[0]);
                    const discountPrice = row[1];
                    const normalPrice = row[2];
                    if (month >= 1 && month <= 12 && normalPrice > 0) {
                        allCurrentData[month-1] = (1 - (discountPrice / normalPrice)) * 100;
                    }
                });
            }
            
            if (!hideYearLegend) {
                allPrevResult.forEach(row => {
                    const month = parseInt(row[0]);
                    const discountPrice = row[1];
                    const normalPrice = row[2];
                    if (month >= 1 && month <= 12 && normalPrice > 0) {
                        allPrevData[month-1] = (1 - (discountPrice / normalPrice)) * 100;
                    }
                });
            }
            
            if (this.charts.discountRate) this.charts.discountRate.destroy();
            const ctx = document.getElementById('discountRateChart');
            
            const datasets = [];
            
            if (!hideYearLegend && prevYear) {
                datasets.push({ label: `전체 ${prevYearShort}년`, data: allPrevData, borderColor: '#b0bec5', backgroundColor: 'rgba(176, 190, 197, 0.1)', borderDash: [5, 5], tension: 0.4 });
                datasets.push({ label: `전체 ${currentYearShort}년`, data: allCurrentData, borderColor: '#ffb74d', backgroundColor: 'rgba(255, 183, 77, 0.1)', borderDash: [5, 5], tension: 0.4 });
                datasets.push({ label: `${selectedSeller} ${prevYearShort}년`, data: sellerPrevData, borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', tension: 0.4 });
                datasets.push({ label: `${selectedSeller} ${currentYearShort}년`, data: sellerCurrentData, borderColor: '#ff6384', backgroundColor: 'rgba(255, 99, 132, 0.1)', tension: 0.4, borderWidth: 3 });
            } else {
                datasets.push({ label: '전체', data: allCurrentData, borderColor: '#ffb74d', backgroundColor: 'rgba(255, 183, 77, 0.1)', borderDash: [5, 5], tension: 0.4 });
                datasets.push({ label: selectedSeller, data: sellerCurrentData, borderColor: '#ff6384', backgroundColor: 'rgba(255, 99, 132, 0.1)', tension: 0.4, borderWidth: 3 });
            }
            
            this.charts.discountRate = new Chart(ctx, {
                type: 'line',
                data: { labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'], datasets: datasets },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: true }, tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%'; } } } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toFixed(1) + '%' } } }
                }
            });
        } else {
            const currentQuery = `SELECT MONTH, SUM(할인가) as discount_price, SUM(정상가) as normal_price FROM "${this.currentTable}" WHERE 1=1 ${filter} GROUP BY MONTH ORDER BY MONTH`;
            const currentResult = this.db.exec(currentQuery);
            
            let prevResult = [];
            if (prevYear && !hideYearLegend) {
                const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const prevQuery = `SELECT MONTH, SUM(할인가) as discount_price, SUM(정상가) as normal_price FROM "${this.currentTable}" WHERE 1=1 ${prevFilter} GROUP BY MONTH ORDER BY MONTH`;
                const prevResultObj = this.db.exec(prevQuery);
                prevResult = prevResultObj.length > 0 ? prevResultObj[0].values : [];
            }
            
            const currentData = Array(12).fill(0);
            const prevData = Array(12).fill(0);
            
            if (currentResult.length > 0) {
                currentResult[0].values.forEach(row => {
                    const month = parseInt(row[0]);
                    const discountPrice = row[1];
                    const normalPrice = row[2];
                    if (month >= 1 && month <= 12 && normalPrice > 0) {
                        currentData[month-1] = (1 - (discountPrice / normalPrice)) * 100;
                    }
                });
            }
            
            if (!hideYearLegend) {
                prevResult.forEach(row => {
                    const month = parseInt(row[0]);
                    const discountPrice = row[1];
                    const normalPrice = row[2];
                    if (month >= 1 && month <= 12 && normalPrice > 0) {
                        prevData[month-1] = (1 - (discountPrice / normalPrice)) * 100;
                    }
                });
            }
            
            if (this.charts.discountRate) this.charts.discountRate.destroy();
            const ctx = document.getElementById('discountRateChart');
            const datasets = [];
            
            if (!hideYearLegend && prevYear) {
                datasets.push({ label: `${prevYearShort}년`, data: prevData, borderColor: '#667eea', backgroundColor: 'rgba(102, 126, 234, 0.1)', tension: 0.4, borderWidth: 2 });
            }
            datasets.push({ label: hideYearLegend ? '할인율' : `${currentYearShort}년`, data: currentData, borderColor: '#ff6384', backgroundColor: 'rgba(255, 99, 132, 0.1)', tension: 0.4, borderWidth: 2 });
            
            this.charts.discountRate = new Chart(ctx, {
                type: 'line',
                data: { labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'], datasets: datasets },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: !hideYearLegend }, tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%'; } } } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toFixed(1) + '%' } } }
                }
            });
        }
    } catch (error) {
        console.error('할인율 차트 오류:', error);
    }
};

// 월별 마진액 추이 차트 (19번) - ACE 전용
ReportModule.prototype.loadMarginChart = function(filter, prevYear) {
    try {
        console.log('[19번 마진액] loadMarginChart 시작');
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        const selectedSeller = document.getElementById('sellerFilter').value;
        const hideYearLegend = !currentYear;
        const monthLabels = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

        // MG 월별 합계 쿼리 실행 헬퍼
        const getMonthlyMG = function(db, table, filterStr) {
            // 먼저 MG 컬럼의 원본 데이터 확인
            try {
                var checkSql = 'SELECT "MG", typeof("MG") as mgtype FROM "' + table + '" WHERE "MG" IS NOT NULL LIMIT 5';
                var checkResult = db.exec(checkSql);
                if (checkResult.length > 0) {
                    console.log('[19번 마진액] MG 원본 샘플:', checkResult[0].values);
                } else {
                    console.log('[19번 마진액] MG 데이터 없음 (NULL만 존재)');
                }
            } catch(e) {
                console.log('[19번 마진액] MG 확인 오류:', e.message);
            }
            
            const sql = 'SELECT MONTH, SUM("MG") as mg FROM "' + table + '" WHERE 1=1 ' + filterStr + ' GROUP BY MONTH ORDER BY MONTH';
            console.log('[19번 마진액] SQL:', sql);
            var result = db.exec(sql);
            console.log('[19번 마진액] 쿼리 결과:', result.length > 0 ? result[0].values : '결과 없음');
            var arr = [0,0,0,0,0,0,0,0,0,0,0,0];
            if (result.length > 0) {
                for (var i = 0; i < result[0].values.length; i++) {
                    var row = result[0].values[i];
                    var m = parseInt(row[0]);
                    if (m >= 1 && m <= 12) {
                        arr[m - 1] = (row[1] !== null && row[1] !== undefined) ? row[1] : 0;
                    }
                }
            }
            console.log('[19번 마진액] 결과:', arr);
            return arr;
        };

        var ctx = document.getElementById('marginChart');
        if (!ctx) {
            console.error('[19번 마진액] marginChart 캔버스를 찾을 수 없습니다');
            return;
        }

        if (this.charts.margin) {
            this.charts.margin.destroy();
            this.charts.margin = null;
        }

        var datasets = [];

        if (selectedSeller) {
            // 판매자 선택 시: 전체 vs 개인 비교
            var sellerCurrentData = getMonthlyMG(this.db, this.currentTable, filter);
            var filterNoSeller = filter.replace(' AND 판매자 = \'' + selectedSeller + '\'', '');
            var allCurrentData = getMonthlyMG(this.db, this.currentTable, filterNoSeller);

            if (!hideYearLegend && prevYear) {
                var prevFilter = filter.replace('AND YEAR = ' + currentYear, 'AND YEAR = ' + prevYear);
                var prevFilterNoSeller = filterNoSeller.replace('AND YEAR = ' + currentYear, 'AND YEAR = ' + prevYear);
                var sellerPrevData = getMonthlyMG(this.db, this.currentTable, prevFilter);
                var allPrevData = getMonthlyMG(this.db, this.currentTable, prevFilterNoSeller);

                datasets.push({ label: '전체 ' + prevYearShort + '년', data: allPrevData, borderColor: '#b0bec5', backgroundColor: 'rgba(176,190,197,0.1)', borderDash: [5,5], tension: 0.4, fill: false, pointRadius: 3 });
                datasets.push({ label: '전체 ' + currentYearShort + '년', data: allCurrentData, borderColor: '#ffb74d', backgroundColor: 'rgba(255,183,77,0.1)', borderDash: [5,5], tension: 0.4, fill: false, pointRadius: 3 });
                datasets.push({ label: selectedSeller + ' ' + prevYearShort + '년', data: sellerPrevData, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension: 0.4, fill: false, pointRadius: 3 });
                datasets.push({ label: selectedSeller + ' ' + currentYearShort + '년', data: sellerCurrentData, borderColor: '#ff6384', backgroundColor: 'rgba(255,99,132,0.1)', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 3 });
            } else {
                datasets.push({ label: '전체', data: allCurrentData, borderColor: '#ffb74d', backgroundColor: 'rgba(255,183,77,0.1)', borderDash: [5,5], tension: 0.4, fill: false, pointRadius: 3 });
                datasets.push({ label: selectedSeller, data: sellerCurrentData, borderColor: '#ff6384', backgroundColor: 'rgba(255,99,132,0.1)', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 3 });
            }
        } else {
            // 판매자 미선택: 전년 vs 당년 비교
            var currentData = getMonthlyMG(this.db, this.currentTable, filter);

            if (!hideYearLegend && prevYear) {
                var prevFilterSimple = filter.replace('AND YEAR = ' + currentYear, 'AND YEAR = ' + prevYear);
                var prevData = getMonthlyMG(this.db, this.currentTable, prevFilterSimple);
                datasets.push({ label: prevYearShort + '년', data: prevData, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 2 });
            }
            datasets.push({ label: hideYearLegend ? '마진액' : currentYearShort + '년', data: currentData, borderColor: '#ff6384', backgroundColor: 'rgba(255,99,132,0.1)', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 2 });
        }

        console.log('[19번 마진액] datasets:', datasets.length, '개');

        this.charts.margin = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: selectedSeller ? true : !hideYearLegend },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ₩' + Math.round(context.parsed.y).toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(v) { return '₩' + (v / 1000000).toFixed(1) + 'M'; }
                        }
                    }
                }
            }
        });

        console.log('[19번 마진액] 차트 생성 완료');
    } catch (error) {
        console.error('[19번 마진액] 차트 오류:', error);
    }
};

// 월별 마진율 추이 차트 (20번) - ACE 전용
// 마진율 = MG 합계 / 할인가 합계 * 100
ReportModule.prototype.loadMarginRateChart = function(filter, prevYear) {
    try {
        var currentYear = document.getElementById('yearFilter').value;
        var currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        var prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        var selectedSeller = document.getElementById('sellerFilter').value;
        var hideYearLegend = !currentYear;
        var monthLabels = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

        var db = this.db;
        var table = this.currentTable;

        // 월별 마진율 계산 헬퍼: SUM(MG) / SUM(할인가) * 100
        var getMonthlyMarginRate = function(filterStr) {
            var sql = 'SELECT MONTH, SUM("MG") as mg, SUM(할인가) as sales FROM "' + table + '" WHERE 1=1 ' + filterStr + ' GROUP BY MONTH ORDER BY MONTH';
            var result = db.exec(sql);
            var arr = [0,0,0,0,0,0,0,0,0,0,0,0];
            if (result.length > 0) {
                for (var i = 0; i < result[0].values.length; i++) {
                    var row = result[0].values[i];
                    var m = parseInt(row[0]);
                    var mg = row[1] || 0;
                    var sales = row[2] || 0;
                    if (m >= 1 && m <= 12 && sales > 0) {
                        arr[m - 1] = (mg / sales) * 100;
                    }
                }
            }
            return arr;
        };

        var ctx = document.getElementById('marginRateChart');
        if (!ctx) return;

        if (this.charts.marginRate) {
            this.charts.marginRate.destroy();
            this.charts.marginRate = null;
        }

        var datasets = [];

        if (selectedSeller) {
            var sellerCurrent = getMonthlyMarginRate(filter);
            var filterNoSeller = filter.replace(' AND 판매자 = \'' + selectedSeller + '\'', '');
            var allCurrent = getMonthlyMarginRate(filterNoSeller);

            if (!hideYearLegend && prevYear) {
                var prevFilter = filter.replace('AND YEAR = ' + currentYear, 'AND YEAR = ' + prevYear);
                var prevFilterNoSeller = filterNoSeller.replace('AND YEAR = ' + currentYear, 'AND YEAR = ' + prevYear);
                var sellerPrev = getMonthlyMarginRate(prevFilter);
                var allPrev = getMonthlyMarginRate(prevFilterNoSeller);

                datasets.push({ label: '전체 ' + prevYearShort + '년', data: allPrev, borderColor: '#b0bec5', backgroundColor: 'rgba(176,190,197,0.1)', borderDash: [5,5], tension: 0.4, fill: false, pointRadius: 3 });
                datasets.push({ label: '전체 ' + currentYearShort + '년', data: allCurrent, borderColor: '#ffb74d', backgroundColor: 'rgba(255,183,77,0.1)', borderDash: [5,5], tension: 0.4, fill: false, pointRadius: 3 });
                datasets.push({ label: selectedSeller + ' ' + prevYearShort + '년', data: sellerPrev, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension: 0.4, fill: false, pointRadius: 3 });
                datasets.push({ label: selectedSeller + ' ' + currentYearShort + '년', data: sellerCurrent, borderColor: '#ff6384', backgroundColor: 'rgba(255,99,132,0.1)', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 3 });
            } else {
                datasets.push({ label: '전체', data: allCurrent, borderColor: '#ffb74d', backgroundColor: 'rgba(255,183,77,0.1)', borderDash: [5,5], tension: 0.4, fill: false, pointRadius: 3 });
                datasets.push({ label: selectedSeller, data: sellerCurrent, borderColor: '#ff6384', backgroundColor: 'rgba(255,99,132,0.1)', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 3 });
            }
        } else {
            var currentData = getMonthlyMarginRate(filter);

            if (!hideYearLegend && prevYear) {
                var prevFilterSimple = filter.replace('AND YEAR = ' + currentYear, 'AND YEAR = ' + prevYear);
                var prevData = getMonthlyMarginRate(prevFilterSimple);
                datasets.push({ label: prevYearShort + '년', data: prevData, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 2 });
            }
            datasets.push({ label: hideYearLegend ? '마진율' : currentYearShort + '년', data: currentData, borderColor: '#ff6384', backgroundColor: 'rgba(255,99,132,0.1)', tension: 0.4, fill: false, pointRadius: 3, borderWidth: 2 });
        }

        this.charts.marginRate = new Chart(ctx, {
            type: 'line',
            data: { labels: monthLabels, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: selectedSeller ? true : !hideYearLegend },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(v) { return v.toFixed(1) + '%'; }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('[20번 마진율] 차트 오류:', error);
    }
};
=======
// 매출 리포트 확장 차트 Part 6 - ESSA 전용 차트

ReportModule.prototype.loadAgeCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 년도: 전체 선택시 범례 숨김
        const hideYearLegend = !currentYear;
        
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
        
        const ageBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
        };
        
        let ageDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            ageDatasets = [{
                label: '매출',
                data: currentData,
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: '#764ba2',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            ageDatasets = [{
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
            }];
        }
        
        this.charts.ageSales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: ageDatasets
            },
            options: this.getMobileOptimizedOptions(ageBaseOptions)
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
        
        // 년도: 전체 선택시 범례 숨김
        const hideYearLegend = !currentYear;
        
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
        
        const essaSellerBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
        };
        
        let essaSellerDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            essaSellerDatasets = [{
                label: '매출',
                data: currentData,
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: '#764ba2',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            essaSellerDatasets = [{
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
            }];
        }
        
        this.charts.essaSeller = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: essaSellerDatasets
            },
            options: this.getMobileOptimizedOptions(essaSellerBaseOptions)
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
        
        // 년도: 전체 선택시 범례 숨김
        const hideYearLegend = !currentYear;
        
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
        
        const essaSalesBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
        };
        
        let essaSalesDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            essaSalesDatasets = [{
                label: '매출',
                data: salesCurrentData,
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: '#764ba2',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            essaSalesDatasets = [{
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
            }];
        }
        
        this.charts.essaMaterialSales = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: salesLabelArray,
                datasets: essaSalesDatasets
            },
            options: this.getMobileOptimizedOptions(essaSalesBaseOptions)
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
        
        const essaQuantityBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true } }
        };
        
        let essaQuantityDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            essaQuantityDatasets = [{
                label: '수량',
                data: quantityCurrentData,
                backgroundColor: 'rgba(255, 152, 0, 0.7)',
                borderColor: '#ff9800',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            essaQuantityDatasets = [{
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
            }];
        }
        
        this.charts.essaMaterialQuantity = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: quantityLabelArray,
                datasets: essaQuantityDatasets
            },
            options: this.getMobileOptimizedOptions(essaQuantityBaseOptions)
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
        
        // 년도: 전체 선택시 범례 숨김
        const hideYearLegend = !currentYear;
        
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
        
        const productQuantityBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true } }
        };
        
        let productQuantityDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            productQuantityDatasets = [{
                label: '수량',
                data: productCurrentData,
                backgroundColor: 'rgba(153, 102, 255, 0.7)',
                borderColor: '#9966ff',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            productQuantityDatasets = [{
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
            }];
        }
        
        this.charts.productQuantity = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: productLabelArray,
                datasets: productQuantityDatasets
            },
            options: this.getMobileOptimizedOptions(productQuantityBaseOptions)
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
        
        const colorQuantityBaseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true } }
        };
        
        let colorQuantityDatasets;
        if (hideYearLegend) {
            // 년도 전체 선택시 - 단일 데이터셋, 범례 숨김
            colorQuantityDatasets = [{
                label: '수량',
                data: colorCurrentData,
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
                borderColor: '#ff9f40',
                borderWidth: 1
            }];
        } else {
            // 특정 년도 선택시 - 년도별 비교, 범례 표시
            colorQuantityDatasets = [{
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
            }];
        }
        
        this.charts.colorQuantity = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: colorLabelArray,
                datasets: colorQuantityDatasets
            },
            options: this.getMobileOptimizedOptions(colorQuantityBaseOptions)
        });
    } catch (error) {
        console.error('상품/색상 차트 오류:', error);
    }
};
>>>>>>> 30e6afcb005d23f8a4f95f92b4c0c39aa4b9643e
