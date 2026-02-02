// 매출 리포트 확장 차트 Part 1 - 공통 차트

ReportModule.prototype.loadPurposeChart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 년도: 전체, 월: 전체인 경우 범례 숨김
        const hideYearLegend = !currentYear;
        
        const currentQuery = `SELECT 구매용도, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 구매용도 IS NOT NULL AND 구매용도 != '' ${filter} GROUP BY 구매용도 ORDER BY sales DESC LIMIT 8`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear && !hideYearLegend) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const prevQuery = `SELECT 구매용도, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 구매용도 IS NOT NULL AND 구매용도 != '' ${prevFilter} GROUP BY 구매용도 ORDER BY sales DESC LIMIT 8`;
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
        
        if (this.charts.purpose) this.charts.purpose.destroy();
        const ctx = document.getElementById('purposeChart');
        
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
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: '#ff6384',
            borderWidth: 1
        });
        
        this.charts.purpose = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: this.getMobileOptimizedOptions({
                plugins: { legend: { display: !hideYearLegend } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
            })
        });
    } catch (error) {
        console.error('구매용도 차트 오류:', error);
    }
};

ReportModule.prototype.loadSizeChart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        // 년도: 전체, 월: 전체인 경우 범례 숨김
        const hideYearLegend = !currentYear;
        
        const currentQuery = `SELECT 규격, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 규격 IS NOT NULL AND 규격 != '' ${filter} GROUP BY 규격 ORDER BY sales DESC LIMIT 10`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear && !hideYearLegend) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const prevQuery = `SELECT 규격, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 규격 IS NOT NULL AND 규격 != '' ${prevFilter} GROUP BY 규격 ORDER BY sales DESC LIMIT 10`;
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
        
        if (this.charts.size) this.charts.size.destroy();
        const ctx = document.getElementById('sizeChart');
        
        const datasets = [];
        
        if (!hideYearLegend && prevYear) {
            datasets.push({
                label: `${prevYearShort}년`,
                data: prevData,
                backgroundColor: 'rgba(255, 193, 7, 0.7)',
                borderColor: '#ffc107',
                borderWidth: 1
            });
        }
        
        datasets.push({
            label: hideYearLegend ? '매출' : `${currentYearShort}년`,
            data: currentData,
            backgroundColor: 'rgba(33, 150, 243, 0.7)',
            borderColor: '#2196f3',
            borderWidth: 1
        });
        
        this.charts.size = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: !hideYearLegend } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => '₩' + (v/1000000).toFixed(1) + 'M' } } }
            }
        });
    } catch (error) {
        console.error('사이즈 차트 오류:', error);
    }
};
