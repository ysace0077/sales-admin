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
        
        if (this.charts.grade) this.charts.grade.destroy();
        const ctx = document.getElementById('gradeChart');
        
        const datasets = [];
        
        if (!hideYearLegend && prevYear) {
            datasets.push({
                label: `${prevYearShort}년`,
                data: prevData,
                backgroundColor: 'rgba(250, 112, 154, 0.7)',
                borderColor: '#fa709a',
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
