// 매출 리포트 확장 차트 Part 5 - ACE 침대/프레임 차트 (수정됨)

ReportModule.prototype.loadBedSizeGradeCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 1인용 (SS, DS, DD) - 정확한 규격 코드 사용
        const singleBedFilter = `${filter} AND (규격 = 'SS' OR 규격 = 'DS' OR 규격 = 'DD')`;
        const singleCurrentQuery = `SELECT 등급, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 등급 IS NOT NULL AND 등급 != '' ${singleBedFilter} GROUP BY 등급 ORDER BY quantity DESC`;
        const singleCurrentResult = this.db.exec(singleCurrentQuery);
        
        let singlePrevResult = {values: []};
        if (prevYear) {
            const prevSingleBedFilter = singleBedFilter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const singlePrevQuery = `SELECT 등급, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 등급 IS NOT NULL AND 등급 != '' ${prevSingleBedFilter} GROUP BY 등급 ORDER BY quantity DESC`;
            const singlePrevResultObj = this.db.exec(singlePrevQuery);
            singlePrevResult = singlePrevResultObj.length > 0 ? singlePrevResultObj[0] : {values: []};
        }
        
        let singleLabels = new Set();
        if (singleCurrentResult.length > 0) {
            singleCurrentResult[0].values.forEach(row => singleLabels.add(row[0]));
        }
        if (singlePrevResult.values && singlePrevResult.values.length > 0) {
            singlePrevResult.values.forEach(row => singleLabels.add(row[0]));
        }
        
        const singleLabelArray = singleLabels.size > 0 ? Array.from(singleLabels) : ['데이터 없음'];
        const singleCurrentData = singleLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = singleCurrentResult.length > 0 ? singleCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const singlePrevData = singleLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = singlePrevResult.values ? singlePrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.singleBedGrade) this.charts.singleBedGrade.destroy();
        const ctx1 = document.getElementById('singleBedGradeChart');
        if (ctx1) {
            this.charts.singleBedGrade = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: singleLabelArray,
                    datasets: [{
                        label: `${prevYearShort}년`,
                        data: singlePrevData,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: '#36a2eb',
                        borderWidth: 1
                    }, {
                        label: `${currentYearShort}년`,
                        data: singleCurrentData,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: '#ff6384',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: true },
                        title: {
                            display: true,
                            text: 'SS, DS, DD 규격'
                        }
                    },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '개' } } }
                }
            });
        }
        
        // 2인용 (LQ, K3, LK) - 정확한 규격 코드 사용
        const doubleBedFilter = `${filter} AND (규격 = 'LQ' OR 규격 = 'K3' OR 규격 = 'LK')`;
        const doubleCurrentQuery = `SELECT 등급, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 등급 IS NOT NULL AND 등급 != '' ${doubleBedFilter} GROUP BY 등급 ORDER BY quantity DESC`;
        const doubleCurrentResult = this.db.exec(doubleCurrentQuery);
        
        let doublePrevResult = {values: []};
        if (prevYear) {
            const prevDoubleBedFilter = doubleBedFilter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const doublePrevQuery = `SELECT 등급, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 등급 IS NOT NULL AND 등급 != '' ${prevDoubleBedFilter} GROUP BY 등급 ORDER BY quantity DESC`;
            const doublePrevResultObj = this.db.exec(doublePrevQuery);
            doublePrevResult = doublePrevResultObj.length > 0 ? doublePrevResultObj[0] : {values: []};
        }
        
        let doubleLabels = new Set();
        if (doubleCurrentResult.length > 0) {
            doubleCurrentResult[0].values.forEach(row => doubleLabels.add(row[0]));
        }
        if (doublePrevResult.values && doublePrevResult.values.length > 0) {
            doublePrevResult.values.forEach(row => doubleLabels.add(row[0]));
        }
        
        const doubleLabelArray = doubleLabels.size > 0 ? Array.from(doubleLabels) : ['데이터 없음'];
        const doubleCurrentData = doubleLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = doubleCurrentResult.length > 0 ? doubleCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const doublePrevData = doubleLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = doublePrevResult.values ? doublePrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.doubleBedGrade) this.charts.doubleBedGrade.destroy();
        const ctx2 = document.getElementById('doubleBedGradeChart');
        if (ctx2) {
            this.charts.doubleBedGrade = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: doubleLabelArray,
                    datasets: [{
                        label: `${prevYearShort}년`,
                        data: doublePrevData,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: '#4bc0c0',
                        borderWidth: 1
                    }, {
                        label: `${currentYearShort}년`,
                        data: doubleCurrentData,
                        backgroundColor: 'rgba(153, 102, 255, 0.7)',
                        borderColor: '#9966ff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: true },
                        title: {
                            display: true,
                            text: 'LQ, K3, LK 규격'
                        }
                    },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '개' } } }
                }
            });
        }
    } catch (error) {
        console.error('침대 사이즈 차트 오류:', error);
    }
};

ReportModule.prototype.loadFrameAnalysisCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 분류2 = '프레임' 조건 사용
        const frameFilter = `${filter} AND 분류2 = '프레임'`;
        
        // 프레임 상품별 차트
        const productCurrentQuery = `SELECT 상품명, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 상품명 IS NOT NULL AND 상품명 != '' ${frameFilter} GROUP BY 상품명 ORDER BY quantity DESC LIMIT 10`;
        const productCurrentResult = this.db.exec(productCurrentQuery);
        
        let productPrevResult = {values: []};
        if (prevYear) {
            const prevFrameFilter = frameFilter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const productPrevQuery = `SELECT 상품명, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 상품명 IS NOT NULL AND 상품명 != '' ${prevFrameFilter} GROUP BY 상품명 ORDER BY quantity DESC LIMIT 10`;
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
        
        const productLabelArray = productLabels.size > 0 ? Array.from(productLabels) : ['데이터 없음'];
        const productCurrentData = productLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = productCurrentResult.length > 0 ? productCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const productPrevData = productLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = productPrevResult.values ? productPrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.frameProduct) this.charts.frameProduct.destroy();
        const ctx1 = document.getElementById('frameProductChart');
        if (ctx1) {
            this.charts.frameProduct = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: productLabelArray,
                    datasets: [{
                        label: `${prevYearShort}년`,
                        data: productPrevData,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: '#36a2eb',
                        borderWidth: 1
                    }, {
                        label: `${currentYearShort}년`,
                        data: productCurrentData,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: '#ff6384',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '개' } } }
                }
            });
        }
        
        // 프레임 색상별 차트
        const colorCurrentQuery = `SELECT 색상, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 색상 IS NOT NULL AND 색상 != '' ${frameFilter} GROUP BY 색상 ORDER BY quantity DESC LIMIT 10`;
        const colorCurrentResult = this.db.exec(colorCurrentQuery);
        
        let colorPrevResult = {values: []};
        if (prevYear) {
            const prevFrameFilter = frameFilter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const colorPrevQuery = `SELECT 색상, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 색상 IS NOT NULL AND 색상 != '' ${prevFrameFilter} GROUP BY 색상 ORDER BY quantity DESC LIMIT 10`;
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
        
        const colorLabelArray = colorLabels.size > 0 ? Array.from(colorLabels) : ['데이터 없음'];
        const colorCurrentData = colorLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = colorCurrentResult.length > 0 ? colorCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const colorPrevData = colorLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = colorPrevResult.values ? colorPrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.frameColor) this.charts.frameColor.destroy();
        const ctx2 = document.getElementById('frameColorChart');
        if (ctx2) {
            this.charts.frameColor = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: colorLabelArray,
                    datasets: [{
                        label: `${prevYearShort}년`,
                        data: colorPrevData,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: '#4bc0c0',
                        borderWidth: 1
                    }, {
                        label: `${currentYearShort}년`,
                        data: colorCurrentData,
                        backgroundColor: 'rgba(153, 102, 255, 0.7)',
                        borderColor: '#9966ff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '개' } } }
                }
            });
        }
    } catch (error) {
        console.error('프레임 차트 오류:', error);
    }
};

// 프레임 1인용/2인용 판매수량 차트
ReportModule.prototype.loadFrameSizeCharts = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 프레임 필터 조건
        const frameFilter = `${filter} AND 분류2 = '프레임'`;
        
        // 프레임 1인용 (DS, SS, DD)
        const singleFrameFilter = `${frameFilter} AND (규격 = 'DS' OR 규격 = 'SS' OR 규격 = 'DD')`;
        const singleCurrentQuery = `SELECT 상품명, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 상품명 IS NOT NULL AND 상품명 != '' ${singleFrameFilter} GROUP BY 상품명 ORDER BY quantity DESC LIMIT 10`;
        const singleCurrentResult = this.db.exec(singleCurrentQuery);
        
        let singlePrevResult = {values: []};
        if (prevYear) {
            const prevSingleFrameFilter = singleFrameFilter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const singlePrevQuery = `SELECT 상품명, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 상품명 IS NOT NULL AND 상품명 != '' ${prevSingleFrameFilter} GROUP BY 상품명 ORDER BY quantity DESC LIMIT 10`;
            const singlePrevResultObj = this.db.exec(singlePrevQuery);
            singlePrevResult = singlePrevResultObj.length > 0 ? singlePrevResultObj[0] : {values: []};
        }
        
        let singleLabels = new Set();
        if (singleCurrentResult.length > 0) {
            singleCurrentResult[0].values.forEach(row => singleLabels.add(row[0]));
        }
        if (singlePrevResult.values && singlePrevResult.values.length > 0) {
            singlePrevResult.values.forEach(row => singleLabels.add(row[0]));
        }
        
        const singleLabelArray = singleLabels.size > 0 ? Array.from(singleLabels) : ['데이터 없음'];
        const singleCurrentData = singleLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = singleCurrentResult.length > 0 ? singleCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const singlePrevData = singleLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = singlePrevResult.values ? singlePrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.frameSingle) this.charts.frameSingle.destroy();
        const ctx1 = document.getElementById('frameSingleChart');
        if (ctx1) {
            this.charts.frameSingle = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: singleLabelArray,
                    datasets: [{
                        label: `${prevYearShort}년`,
                        data: singlePrevData,
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: '#36a2eb',
                        borderWidth: 1
                    }, {
                        label: `${currentYearShort}년`,
                        data: singleCurrentData,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: '#ff6384',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '개' } } }
                }
            });
        }
        
        // 프레임 2인용 (LQ, K3, LK)
        const doubleFrameFilter = `${frameFilter} AND (규격 = 'LQ' OR 규격 = 'K3' OR 규격 = 'LK')`;
        const doubleCurrentQuery = `SELECT 상품명, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 상품명 IS NOT NULL AND 상품명 != '' ${doubleFrameFilter} GROUP BY 상품명 ORDER BY quantity DESC LIMIT 10`;
        const doubleCurrentResult = this.db.exec(doubleCurrentQuery);
        
        let doublePrevResult = {values: []};
        if (prevYear) {
            const prevDoubleFrameFilter = doubleFrameFilter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const doublePrevQuery = `SELECT 상품명, SUM(수량) as quantity FROM "${this.currentTable}" WHERE 상품명 IS NOT NULL AND 상품명 != '' ${prevDoubleFrameFilter} GROUP BY 상품명 ORDER BY quantity DESC LIMIT 10`;
            const doublePrevResultObj = this.db.exec(doublePrevQuery);
            doublePrevResult = doublePrevResultObj.length > 0 ? doublePrevResultObj[0] : {values: []};
        }
        
        let doubleLabels = new Set();
        if (doubleCurrentResult.length > 0) {
            doubleCurrentResult[0].values.forEach(row => doubleLabels.add(row[0]));
        }
        if (doublePrevResult.values && doublePrevResult.values.length > 0) {
            doublePrevResult.values.forEach(row => doubleLabels.add(row[0]));
        }
        
        const doubleLabelArray = doubleLabels.size > 0 ? Array.from(doubleLabels) : ['데이터 없음'];
        const doubleCurrentData = doubleLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = doubleCurrentResult.length > 0 ? doubleCurrentResult[0].values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        const doublePrevData = doubleLabelArray.map(label => {
            if (label === '데이터 없음') return 0;
            const row = doublePrevResult.values ? doublePrevResult.values.find(r => r[0] === label) : null;
            return row ? row[1] : 0;
        });
        
        if (this.charts.frameDouble) this.charts.frameDouble.destroy();
        const ctx2 = document.getElementById('frameDoubleChart');
        if (ctx2) {
            this.charts.frameDouble = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: doubleLabelArray,
                    datasets: [{
                        label: `${prevYearShort}년`,
                        data: doublePrevData,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: '#4bc0c0',
                        borderWidth: 1
                    }, {
                        label: `${currentYearShort}년`,
                        data: doubleCurrentData,
                        backgroundColor: 'rgba(153, 102, 255, 0.7)',
                        borderColor: '#9966ff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                    scales: { y: { beginAtZero: true, ticks: { callback: v => v.toLocaleString() + '개' } } }
                }
            });
        }
    } catch (error) {
        console.error('프레임 사이즈 차트 오류:', error);
    }
};
