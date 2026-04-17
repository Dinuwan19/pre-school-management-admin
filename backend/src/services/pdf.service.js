const puppeteer = require('puppeteer');

/**
 * Generates a PDF from an HTML string using Puppeteer
 * @param {string} htmlContent - The HTML content to render
 * @param {object} options - Puppeteer PDF options
 * @returns {Promise<Buffer>} - PDF document as a buffer
 */
exports.generatePdfFromHtml = async (htmlContent, options = {}) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Wait for charts to settle (animations etc)
        await new Promise(resolve => setTimeout(resolve, 1000));

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            },
            ...options
        });

        return pdfBuffer;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
};

/**
 * Generates the HTML template for a report
 * @param {string} title - Report Title
 * @param {object} data - Data to display
 * @param {string} chartConfig - JSON stringified Chart.js configuration
 * @returns {string} - Full HTML string
 */
const fs = require('fs');
const path = require('path');

// Helper to get base64 logo
const getLogoBase64 = () => {
    try {
        const logoPath = path.join(__dirname, '../../../parent-app/assets/logo.png');
        if (fs.existsSync(logoPath)) {
            const bitmap = fs.readFileSync(logoPath);
            return `data:image/png;base64,${bitmap.toString('base64')}`;
        }
    } catch (e) {
        console.error('Logo error:', e);
    }
    return '';
};

/**
 * Generates the specialized HTML template for Student Progress
 */
exports.generateStudentProgressTemplate = (data) => {
    const logo = getLogoBase64();
    const categories = data.categories;
    const student = data.student;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Student Progress Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Inter:wght@400;600&display=swap');
        
        :root {
            --primary: #7B57E4;
            --secondary: #A29BFE;
            --text-dark: #2D3436;
            --text-light: #636E72;
            --bg-accent: #F8F9FA;
            --border: #DFE6E9;
            --accent-pink: #F0BCF5;
        }

        body {
            font-family: 'Inter', sans-serif;
            color: var(--text-dark);
            margin: 0;
            padding: 0;
            line-height: 1.4;
        }

        .cover-page {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            position: relative;
            background-color: #fff;
            overflow: hidden;
        }

        .decorative-shapes {
            position: absolute;
            top: 0;
            right: 0;
            width: 150px;
            height: 150px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            clip-path: polygon(100% 0, 0 0, 100% 100%);
            opacity: 0.1;
        }

        .logo { width: 120px; margin-bottom: 20px; }
        
        .school-name {
            font-family: 'Montserrat', sans-serif;
            font-weight: 900;
            font-size: 32px;
            color: var(--primary);
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
        }

        .report-title-badge {
            background-color: var(--accent-pink);
            padding: 10px 40px;
            border-radius: 20px;
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 18px;
            margin: 40px 0;
            color: var(--text-dark);
        }

        .student-photo-placeholder {
            width: 180px;
            height: 180px;
            border-radius: 50%;
            background-color: var(--bg-accent);
            border: 4px solid var(--secondary);
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .student-name {
            font-family: 'Montserrat', sans-serif;
            font-weight: 900;
            font-size: 28px;
            margin-bottom: 50px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            width: 80%;
            font-size: 16px;
        }

        .info-item b { color: var(--text-light); font-weight: 400; margin-right: 5px; }

        /* Report Pages */
        .page {
            padding: 40px;
            page-break-after: always;
        }
        .page:last-child { page-break-after: avoid; }

        .category-section { margin-bottom: 40px; }
        .category-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 900;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
            text-align: center;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            border: 1px solid var(--text-dark);
        }

        th {
            background-color: var(--accent-pink);
            padding: 10px;
            text-align: center;
            font-weight: 900;
            text-transform: uppercase;
            border: 1px solid var(--text-dark);
        }

        th.skill-col { text-align: left; width: 40%; }

        td {
            padding: 10px;
            border: 1px solid var(--text-dark);
            text-align: center;
        }

        td.skill-name { text-align: left; font-weight: 700; }

        .remarks-box {
            margin-top: 50px;
            border: 1px solid var(--text-dark);
        }
        .remarks-header {
            background-color: var(--accent-pink);
            padding: 10px;
            font-weight: 900;
            border-bottom: 1px solid var(--text-dark);
        }
        .remarks-content {
            padding: 20px;
            min-height: 100px;
        }

        .footer-logo {
            width: 50px;
            margin-top: 40px;
        }

        .score-tag {
            font-weight: 900;
            color: var(--primary);
        }
    </style>
</head>
<body>
    <div class="cover-page">
        <div class="decorative-shapes"></div>
        <img src="${logo}" class="logo">
        <h1 class="school-name">MAL KEKULU FUTURE MIND</h1>
        <h2 class="school-name" style="font-size: 24px; letter-spacing: 4px;">MONTESSORI</h2>
        
        <div class="report-title-badge">Student report</div>
        
        <div class="student-photo-placeholder">
            <img src="${logo}" style="width: 100%; opacity: 0.3;">
        </div>
        
        <div class="student-name">${student.fullName}</div>
        
        <div class="info-grid">
            <div class="info-item"><b>student Index:</b> ${student.studentUniqueId}</div>
            <div class="info-item"><b>Enrolled date:</b> ${student.enrolledDate}</div>
            <div class="info-item"><b>Classroom:</b> ${student.classroomName}</div>
            <div class="info-item"><b>age:</b> ${student.age}</div>
        </div>
    </div>

    <div class="page">
        ${categories.map(cat => `
            <div class="category-section">
                <div class="category-title">${cat.name}</div>
                <table>
                    <thead>
                        <tr>
                            <th class="skill-col">Skill</th>
                            <th>Term 01</th>
                            <th>Term 02</th>
                            <th>Term 03</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cat.skills.map((skill, index) => `
                            <tr>
                                <td class="skill-name">${index + 1}. ${skill.name}</td>
                                <td class="score-tag">${skill.term1}</td>
                                <td class="score-tag">${skill.term2}</td>
                                <td class="score-tag">${skill.term3}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}

        <div class="remarks-box">
            <div class="remarks-header">Observations or Issues Identified:</div>
            <div class="remarks-content">${data.teacherComment}</div>
        </div>
        
        <img src="${logo}" class="footer-logo">
    </div>
</body>
</html>
    `;
};

/**
 * Generates the specialized HTML template for Attendance Summary
 */
exports.generateAttendanceSummaryTemplate = (data) => {
    const logo = getLogoBase64();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Attendance Summary Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Inter:wght@400;600&display=swap');
        
        :root {
            --primary: #7B57E4;
            --text-dark: #2D3436;
            --text-light: #636E72;
            --border: #DFE6E9;
            --bg-accent: #F8F9FA;
            --danger: #FF7675;
        }

        body {
            font-family: 'Inter', sans-serif;
            color: var(--text-dark);
            margin: 0;
            padding: 0;
        }

        .cover-page {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            background-color: #FAF5FF;
        }

        .logo { width: 150px; margin-bottom: 30px; }
        .school-name {
            font-family: 'Montserrat', sans-serif;
            font-weight: 900;
            font-size: 38px;
            color: var(--primary);
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
        }

        .report-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 900;
            font-size: 32px;
            margin-top: 60px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .page {
            padding: 50px;
            page-break-after: always;
        }
        .page:last-child { page-break-after: avoid; }

        .chart-container {
            width: 100%;
            height: 450px;
            margin-top: 50px;
            background: #fff;
            padding: 20px;
            border-radius: 8px;
        }

        .section-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 25px;
            color: var(--primary);
            border-bottom: 2px solid var(--primary);
            display: inline-block;
            padding-bottom: 5px;
        }

        .low-attendance-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .class-group {
            background: var(--bg-accent);
            padding: 20px;
            border-radius: 12px;
            border: 1px solid var(--border);
        }

        .class-header {
            font-weight: 900;
            font-size: 16px;
            margin-bottom: 12px;
            color: var(--text-dark);
            text-transform: uppercase;
        }

        .student-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dashed var(--border);
            font-size: 13px;
        }

        .student-item:last-child { border-bottom: none; }

        .rate-badge {
            color: var(--danger);
            font-weight: 700;
            background: #FFEAEA;
            padding: 2px 8px;
            border-radius: 4px;
        }

        .meta-footer {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: var(--text-light);
            padding-top: 40px;
        }
    </style>
</head>
<body>
    <div class="cover-page">
        <img src="${logo}" class="logo">
        <h1 class="school-name">MALKEKULU FUTURE MIND</h1>
        <h2 class="school-name" style="font-size: 28px;">MONTESSORI</h2>
        
        <div class="report-title">ATTENDANCE SUMMARY</div>
        
        <img src="https://img.icons8.com/ios/100/7B57E4/calendar-check.png" style="margin-top: 40px; opacity: 0.8;">
    </div>

    <div class="page">
        <div class="section-title">Institutional Engagement Trends</div>
        <p style="color: var(--text-light); font-size: 13px;">Aggregated view of classroom baseline attendance for period: ${data.timeframe}</p>
        
        <div class="chart-container">
            <canvas id="attendanceChart"></canvas>
        </div>

        <div style="margin-top: 40px;">
            <div class="section-title">Critical Attention List (Attendance &lt; 50%)</div>
            <div class="low-attendance-list">
                ${Object.entries(data.lowAttendanceStudents.reduce((acc, curr) => {
                    if (!acc[curr.className]) acc[curr.className] = [];
                    acc[curr.className].push(curr);
                    return acc;
                }, {})).map(([className, students]) => `
                    <div class="class-group">
                        <div class="class-header">${className}</div>
                        ${students.map(s => `
                            <div class="student-item">
                                <span>${s.studentName} (${s.studentId})</span>
                                <span class="rate-badge">${s.rate}%</span>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="meta-footer">
            <span>Generated By: ${data.generatedBy}</span>
            <span>Summary: ${data.classCount} Classes | ${data.studentCount} Active Students</span>
        </div>
    </div>

    <script>
        const ctx = document.getElementById('attendanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: ${JSON.stringify(data.chartData)},
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: value => value + '%' },
                        grid: { color: '#F0F0F0' }
                    },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                }
            }
        });
        Chart.defaults.animation = false;
    </script>
</body>
</html>
    `;
};

