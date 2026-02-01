// 매출 리포트 확장 차트 Part 2 - 지역 차트

ReportModule.prototype.loadRegion2Chart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        const currentQuery = `SELECT 지역2, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 지역2 IS NOT NULL AND 지역2 != '' ${filter} GROUP BY 지역2 ORDER BY sales DESC LIMIT 10`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const prevQuery = `SELECT 지역2, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 지역2 IS NOT NULL AND 지역2 != '' ${prevFilter} GROUP BY 지역2 ORDER BY sales DESC LIMIT 10`;
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
        
        if (this.charts.region2) this.charts.region2.destroy();
        const ctx = document.getElementById('region2Chart');
        this.charts.region2 = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${prevYearShort}년`,
                    data: prevData,
                    backgroundColor: 'rgba(156, 39, 176, 0.7)',
                    borderColor: '#9c27b0',
                    borderWidth: 1
                }, {
                    label: `${currentYearShort}년`,
                    data: currentData,
                    backgroundColor: 'rgba(233, 30, 99, 0.7)',
                    borderColor: '#e91e63',
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
        console.error('지역2 차트 오류:', error);
    }
};

ReportModule.prototype.loadRegion3Chart = function(filter, prevYear) {
    try {
        const currentYear = document.getElementById('yearFilter').value;
        const currentYearShort = currentYear ? currentYear.toString().slice(-2) : '24';
        const prevYearShort = prevYear ? prevYear.toString().slice(-2) : '23';
        
        const currentQuery = `SELECT 지역3, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 지역3 IS NOT NULL AND 지역3 != '' ${filter} GROUP BY 지역3 ORDER BY sales DESC LIMIT 10`;
        const currentResult = this.db.exec(currentQuery);
        
        let prevResult = {values: []};
        if (prevYear) {
            const prevFilter = filter.replace(`AND YEAR = ${currentYear}`, `AND YEAR = ${prevYear}`);
            const prevQuery = `SELECT 지역3, SUM(할인가) as sales FROM "${this.currentTable}" WHERE 지역3 IS NOT NULL AND 지역3 != '' ${prevFilter} GROUP BY 지역3 ORDER BY sales DESC LIMIT 10`;
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
        
        if (this.charts.region3) this.charts.region3.destroy();
        const ctx = document.getElementById('region3Chart');
        this.charts.region3 = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${prevYearShort}년`,
                    data: prevData,
                    backgroundColor: 'rgba(0, 150, 136, 0.7)',
                    borderColor: '#009688',
                    borderWidth: 1
                }, {
                    label: `${currentYearShort}년`,
                    data: currentData,
                    backgroundColor: 'rgba(76, 175, 80, 0.7)',
                    borderColor: '#4caf50',
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
        console.error('지역3 차트 오류:', error);
    }
};
