<<<<<<< HEAD
// 매출 리포트 확장 차트 Part 3 - ACE 전용 차트

ReportModule.prototype.loadGradeChart = function(filter, prevYear) {
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
            const sellerCurrentQuery = `SELECT grade, SUM(할인가) as sales FROM "${this.currentTable}" WHERE grade IS NOT NULL AND grade != '' ${filter} GROUP BY grade ORDER BY sales DESC`;
            const sellerCurrentResult = this.db.exec(sellerCurrentQuery);
            
            // 2. 선택 판매자 전년도 데이터
            let sellerPrevResult = {values: []};
            if (prevYear && !hideYearLegend) {
                const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const sellerPrevQuery = `SELECT grade, SUM(할인가) as sales FROM "${this.currentTable}" WHERE grade IS NOT NULL AND grade != '' ${prevFilter} GROUP BY grade ORDER BY sales DESC`;
                const sellerPrevResultObj = this.db.exec(sellerPrevQuery);
                sellerPrevResult = sellerPrevResultObj.length > 0 ? sellerPrevResultObj[0] : {values: []};
            }
            
            // 3. 전체 판매자 현재년도 데이터
            const filterWithoutSeller = filter.replace(` AND 판매자 = '${selectedSeller}'`, '');
            const allCurrentQuery = `SELECT grade, SUM(할인가) as sales FROM "${this.currentTable}" WHERE grade IS NOT NULL AND grade != '' ${filterWithoutSeller} GROUP BY grade ORDER BY sales DESC`;
            const allCurrentResult = this.db.exec(allCurrentQuery);
            
            // 4. 전체 판매자 전년도 데이터
            let allPrevResult = {values: []};
            if (prevYear && !hideYearLegend) {
                const prevFilterWithoutSeller = filterWithoutSeller.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const allPrevQuery = `SELECT grade, SUM(할인가) as sales FROM "${this.currentTable}" WHERE grade IS NOT NULL AND grade != '' ${prevFilterWithoutSeller} GROUP BY grade ORDER BY sales DESC`;
                const allPrevResultObj = this.db.exec(allPrevQuery);
                allPrevResult = allPrevResultObj.length > 0 ? allPrevResultObj[0] : {values: []};
            }
            
            // 모든 라벨 수집
            let allLabels = new Set();
            if (sellerCurrentResult.length > 0) {
                sellerCurrentResult[0].values.forEach(row => allLabels.add(row[0]));
            }
            if (sellerPrevResult.values && sellerPrevResult.values.length > 0) {
                sellerPrevResult.values.forEach(row => allLabels.add(row[0]));
            }
            if (allCurrentResult.length > 0) {
                allCurrentResult[0].values.forEach(row => allLabels.add(row[0]));
            }
            if (allPrevResult.values && allPrevResult.values.length > 0) {
                allPrevResult.values.forEach(row => allLabels.add(row[0]));
            }
            
            const labels = allLabels.size > 0 ? Array.from(allLabels) : ['데이터 없음'];
            
            // 각 데이터셋의 원본 값
            const sellerCurrentData = labels.map(label => {
                const row = sellerCurrentResult.length > 0 ? sellerCurrentResult[0].values.find(r => r[0] === label) : null;
                return row ? row[1] : 0;
            });
            const sellerPrevData = labels.map(label => {
                const row = sellerPrevResult.values ? sellerPrevResult.values.find(r => r[0] === label) : null;
                return row ? row[1] : 0;
            });
            const allCurrentData = labels.map(label => {
                const row = allCurrentResult.length > 0 ? allCurrentResult[0].values.find(r => r[0] === label) : null;
                return row ? row[1] : 0;
            });
            const allPrevData = labels.map(label => {
                const row = allPrevResult.values ? allPrevResult.values.find(r => r[0] === label) : null;
                return row ? row[1] : 0;
            });
            
            // 비율(%) 계산
            const sellerCurrentTotal = sellerCurrentData.reduce((sum, val) => sum + val, 0);
            const sellerPrevTotal = sellerPrevData.reduce((sum, val) => sum + val, 0);
            const allCurrentTotal = allCurrentData.reduce((sum, val) => sum + val, 0);
            const allPrevTotal = allPrevData.reduce((sum, val) => sum + val, 0);
            
            const sellerCurrentPercent = sellerCurrentData.map(val => sellerCurrentTotal > 0 ? (val / sellerCurrentTotal * 100) : 0);
            const sellerPrevPercent = sellerPrevData.map(val => sellerPrevTotal > 0 ? (val / sellerPrevTotal * 100) : 0);
            const allCurrentPercent = allCurrentData.map(val => allCurrentTotal > 0 ? (val / allCurrentTotal * 100) : 0);
            const allPrevPercent = allPrevData.map(val => allPrevTotal > 0 ? (val / allPrevTotal * 100) : 0);
            
            if (this.charts.grade) this.charts.grade.destroy();
            const ctx = document.getElementById('gradeChart');
            
            const datasets = [];
            
            if (!hideYearLegend && prevYear) {
                // 전체 판매자 전년도
                datasets.push({
                    label: `전체 ${prevYearShort}년`,
                    data: allPrevPercent,
                    backgroundColor: 'rgba(176, 190, 197, 0.5)',
                    borderColor: '#b0bec5',
                    borderWidth: 1
                });
                
                // 전체 판매자 현재년도
                datasets.push({
                    label: `전체 ${currentYearShort}년`,
                    data: allCurrentPercent,
                    backgroundColor: 'rgba(250, 112, 154, 0.5)',
                    borderColor: '#fa709a',
                    borderWidth: 1
                });
                
                // 선택 판매자 전년도
                datasets.push({
                    label: `${selectedSeller} ${prevYearShort}년`,
                    data: sellerPrevPercent,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: '#667eea',
                    borderWidth: 2
                });
                
                // 선택 판매자 현재년도
                datasets.push({
                    label: `${selectedSeller} ${currentYearShort}년`,
                    data: sellerCurrentPercent,
                    backgroundColor: 'rgba(118, 75, 162, 0.8)',
                    borderColor: '#764ba2',
                    borderWidth: 2
                });
            } else {
                // 년도 필터가 없는 경우
                // 전체 판매자
                datasets.push({
                    label: '전체',
                    data: allCurrentPercent,
                    backgroundColor: 'rgba(250, 112, 154, 0.5)',
                    borderColor: '#fa709a',
                    borderWidth: 1
                });
                
                // 선택 판매자
                datasets.push({
                    label: selectedSeller,
                    data: sellerCurrentPercent,
                    backgroundColor: 'rgba(118, 75, 162, 0.8)',
                    borderColor: '#764ba2',
                    borderWidth: 2
                });
            }
            
            const baseOptions = {
                plugins: { 
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { callback: v => v.toFixed(1) + '%' } 
                    } 
                }
            };
            
            this.charts.grade = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: this.getMobileOptimizedOptions(baseOptions)
            });
        } else {
            // 판매자 미선택 시 기존 로직
            const currentQuery = `SELECT grade, SUM(할인가) as sales FROM "${this.currentTable}" WHERE grade IS NOT NULL AND grade != '' ${filter} GROUP BY grade ORDER BY sales DESC`;
            const currentResult = this.db.exec(currentQuery);
            
            let prevResult = {values: []};
            if (prevYear && !hideYearLegend) {
                const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
                const prevQuery = `SELECT grade, SUM(할인가) as sales FROM "${this.currentTable}" WHERE grade IS NOT NULL AND grade != '' ${prevFilter} GROUP BY grade ORDER BY sales DESC`;
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
            
            // 비율(%) 계산
            const currentTotal = currentData.reduce((sum, val) => sum + val, 0);
            const prevTotal = prevData.reduce((sum, val) => sum + val, 0);
            
            const currentPercentData = currentData.map(val => currentTotal > 0 ? (val / currentTotal * 100) : 0);
            const prevPercentData = prevData.map(val => prevTotal > 0 ? (val / prevTotal * 100) : 0);
            
            if (this.charts.grade) this.charts.grade.destroy();
            const ctx = document.getElementById('gradeChart');
            
            const datasets = [];
            
            if (!hideYearLegend && prevYear) {
                datasets.push({
                    label: `${prevYearShort}년`,
                    data: prevPercentData,
                    backgroundColor: 'rgba(250, 112, 154, 0.7)',
                    borderColor: '#fa709a',
                    borderWidth: 1
                });
            }
            
            datasets.push({
                label: hideYearLegend ? '비중' : `${currentYearShort}년`,
                data: currentPercentData,
                backgroundColor: 'rgba(118, 75, 162, 0.7)',
                borderColor: '#764ba2',
                borderWidth: 1
            });
            
            const baseOptions = {
                plugins: { 
                    legend: { display: !hideYearLegend },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                            }
                        }
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        ticks: { callback: v => v.toFixed(1) + '%' } 
                    } 
                }
            };
            
            this.charts.grade = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: this.getMobileOptimizedOptions(baseOptions)
            });
        }
    } catch (error) {
        console.error('등급 차트 오류:', error);
    }
};

ReportModule.prototype.loadAceSellerChart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 년도: 전체, 월: 전체인 경우 범례 숨김
        const hideYearLegend = !currentYear;
        
        const currentQuery = `SELECT 판매자, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 판매자 IS NOT NULL AND 판매자 != '' ${filter} GROUP BY 판매자 ORDER BY sales DESC`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear && !hideYearLegend) {
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
        
        if (this.charts.aceSeller) this.charts.aceSeller.destroy();
        const ctx = document.getElementById('aceSellerChart');
        
        const datasets = [];
        
        if (!hideYearLegend && prevYear) {
            datasets.push({
                label: `${prevYearShort}년`,
                data: prevData,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: '#667eea',
                borderWidth: 1
            });
        }
        
        datasets.push({
            label: hideYearLegend ? '매출' : `${currentYearShort}년`,
            data: currentData,
            backgroundColor: 'rgba(118, 75, 162, 0.7)',
            borderColor: '#764ba2',
            borderWidth: 1
        });
        
        const baseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
        };
        
        this.charts.aceSeller = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: this.getMobileOptimizedOptions(baseOptions)
        });
    } catch (error) {
        console.error('ACE 판매자 차트 오류:', error);
    }
};
=======
// 매출 리포트 확장 차트 Part 3 - ACE 전용 차트

ReportModule.prototype.loadGradeChart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 년도: 전체, 월: 전체인 경우 범례 숨김
        const hideYearLegend = !currentYear;
        
        const currentQuery = `SELECT grade, SUM(할인가) as sales FROM "${this.currentTable}" WHERE grade IS NOT NULL AND grade != '' ${filter} GROUP BY grade ORDER BY sales DESC`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear && !hideYearLegend) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const prevQuery = `SELECT grade, SUM(할인가) as sales FROM "${this.currentTable}" WHERE grade IS NOT NULL AND grade != '' ${prevFilter} GROUP BY grade ORDER BY sales DESC`;
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
        
        // 비율(%) 계산
        const currentTotal = currentData.reduce((sum, val) => sum + val, 0);
        const prevTotal = prevData.reduce((sum, val) => sum + val, 0);
        
        const currentPercentData = currentData.map(val => currentTotal > 0 ? (val / currentTotal * 100) : 0);
        const prevPercentData = prevData.map(val => prevTotal > 0 ? (val / prevTotal * 100) : 0);
        
        if (this.charts.grade) this.charts.grade.destroy();
        const ctx = document.getElementById('gradeChart');
        
        const datasets = [];
        
        if (!hideYearLegend && prevYear) {
            datasets.push({
                label: `${prevYearShort}년`,
                data: prevPercentData,
                backgroundColor: 'rgba(250, 112, 154, 0.7)',
                borderColor: '#fa709a',
                borderWidth: 1
            });
        }
        
        datasets.push({
            label: hideYearLegend ? '비중' : `${currentYearShort}년`,
            data: currentPercentData,
            backgroundColor: 'rgba(118, 75, 162, 0.7)',
            borderColor: '#764ba2',
            borderWidth: 1
        });
        
        const baseOptions = {
            plugins: { 
                legend: { display: !hideYearLegend },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true, 
                    ticks: { callback: v => v.toFixed(1) + '%' } 
                } 
            }
        };
        
        this.charts.grade = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: this.getMobileOptimizedOptions(baseOptions)
        });
    } catch (error) {
        console.error('등급 차트 오류:', error);
    }
};

ReportModule.prototype.loadAceSellerChart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 년도: 전체, 월: 전체인 경우 범례 숨김
        const hideYearLegend = !currentYear;
        
        const currentQuery = `SELECT 판매자, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 판매자 IS NOT NULL AND 판매자 != '' ${filter} GROUP BY 판매자 ORDER BY sales DESC`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear && !hideYearLegend) {
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
        
        if (this.charts.aceSeller) this.charts.aceSeller.destroy();
        const ctx = document.getElementById('aceSellerChart');
        
        const datasets = [];
        
        if (!hideYearLegend && prevYear) {
            datasets.push({
                label: `${prevYearShort}년`,
                data: prevData,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: '#667eea',
                borderWidth: 1
            });
        }
        
        datasets.push({
            label: hideYearLegend ? '매출' : `${currentYearShort}년`,
            data: currentData,
            backgroundColor: 'rgba(118, 75, 162, 0.7)',
            borderColor: '#764ba2',
            borderWidth: 1
        });
        
        const baseOptions = {
            plugins: { legend: { display: !hideYearLegend } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
        };
        
        this.charts.aceSeller = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: this.getMobileOptimizedOptions(baseOptions)
        });
    } catch (error) {
        console.error('ACE 판매자 차트 오류:', error);
    }
};
>>>>>>> 30e6afcb005d23f8a4f95f92b4c0c39aa4b9643e
