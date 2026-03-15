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
exports.generateReportTemplate = (title, data, chartConfig = null) => {
    const date = new Date().toLocaleDateString();
    const reportRef = `REF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --primary: #7B57E4; /* Royal Purple */
            --secondary: #6C5CE7; /* Soft Violet */
            --accent: #A29BFE; /* Light Violet */
            --dark: #2D3436;
            --slate: #636E72;
            --border: #DFE6E9;
            --bg: #FFFFFF;
            --success: #00B894;
            --danger: #FF7675;
            --warning: #FDCB6E;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: var(--dark);
            line-height: 1.5;
            margin: 0;
            padding: 0;
            background: var(--bg);
        }
        
        /* Layout Handling */
        .page {
            display: grid;
            grid-template-columns: 90px 1fr;
            min-height: 100vh;
            page-break-after: always;
        }
        .page:last-child {
            page-break-after: avoid;
        }
        
        /* Sidebar (Compact) */
        .sidebar {
            background: #F8F9FA;
            border-right: 1px solid var(--border);
            padding: 40px 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .sidebar-brand {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            font-size: 10px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.3em;
            color: var(--primary);
            margin-bottom: 40px;
            white-space: nowrap;
        }
        .sidebar-meta {
            margin-top: auto;
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            font-size: 9px;
            font-family: monospace;
            color: var(--slate);
            opacity: 0.6;
            letter-spacing: 0.1em;
        }

        /* Main Content */
        .main {
            padding: 50px 60px;
            background-image: radial-gradient(var(--border) 1px, transparent 1px);
            background-size: 30px 30px;
        }
        .header {
            margin-bottom: 40px;
            padding-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .header h1 {
            font-size: 38px;
            font-weight: 900;
            margin: 0;
            color: var(--dark);
            line-height: 1;
            letter-spacing: -0.02em;
        }
        .header h1 span {
            display: block;
            font-size: 14px;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 8px;
        }

        /* Scorecards */
        .scorecard-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }
        .scorecard {
            background: #fff;
            border: 1px solid var(--border);
            padding: 24px;
            border-radius: 4px; /* Sharp geometry */
            position: relative;
            overflow: hidden;
        }
        .scorecard::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--primary);
        }
        .scorecard.success::before { background: var(--success); }
        .scorecard.danger::before { background: var(--danger); }
        
        .scorecard-label {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            color: var(--slate);
            margin-bottom: 12px;
            display: block;
            letter-spacing: 0.05em;
        }
        .scorecard-value {
            font-size: 24px;
            font-weight: 900;
            color: var(--dark);
            line-height: 1;
        }
        .scorecard-sub {
            font-size: 11px;
            color: var(--slate);
            margin-top: 8px;
        }

        /* Insights */
        .insight-box {
            background: var(--dark);
            color: #fff;
            padding: 25px;
            border-radius: 4px;
            margin-bottom: 40px;
            border-left: 6px solid var(--primary);
        }
        .insight-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            opacity: 0.7;
            margin-bottom: 10px;
            display: block;
            font-weight: 700;
        }
        .insight-text {
            font-size: 14px;
            font-weight: 400;
            line-height: 1.6;
        }

        /* Charts */
        .section-title {
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            color: var(--dark);
            margin: 40px 0 20px 0;
            display: flex;
            align-items: center;
            gap: 15px;
            letter-spacing: 0.1em;
        }
        .section-title::after {
            content: "";
            flex-grow: 1;
            height: 1px;
            background: var(--border);
        }
        
        .charts-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            margin-bottom: 40px;
        }
        .chart-wrapper {
            background: #fff;
            border-radius: 4px;
            padding: 25px;
            border: 1px solid var(--border);
            height: 300px;
            position: relative;
        }
        .chart-wrapper.full-width {
            grid-column: span 2;
        }

        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 40px;
        }
        th {
            text-align: left;
            padding: 12px 15px;
            background: #F8F9FA;
            color: var(--dark);
            font-weight: 800;
            text-transform: uppercase;
            font-size: 9px;
            border-bottom: 2px solid var(--dark);
        }
        td {
            padding: 15px;
            border-bottom: 1px solid var(--border);
            color: var(--dark);
        }

        /* Utilities */
        .tag {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
        }
        .tag.success { background: var(--success); color: #fff; }
        .tag.danger { background: var(--danger); color: #fff; }
        .tag.primary { background: var(--primary); color: #fff; }

        .footer {
            margin-top: auto;
            border-top: 1px solid var(--border);
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 8px;
            color: var(--slate);
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }
    </style>
</head>
<body>
    ${data.pages.map((page, index) => `
    <div class="page">
        <div class="sidebar">
            <div class="sidebar-brand">PRE-SCHOOL MANAGER ANALYTICS</div>
            <div class="sidebar-meta">
                REF:${reportRef} // PAGE:${index + 1}
            </div>
        </div>

        <div class="main">
            <div class="header">
                <h1><span>${title}</span>${page.title || 'Overview'}</h1>
            </div>

            ${page.scorecards ? `
            <div class="scorecard-row">
                ${page.scorecards.map(sc => `
                    <div class="scorecard ${sc.status || ''}">
                        <span class="scorecard-label">${sc.label}</span>
                        <div class="scorecard-value">${sc.value}</div>
                        ${sc.sub ? `<div class="scorecard-sub">${sc.sub}</div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}

            ${page.insight ? `
            <div class="insight-box">
                <span class="insight-label">Executive Commentary</span>
                <div class="insight-text">${page.insight}</div>
            </div>
            ` : ''}

            ${page.charts && page.charts.length > 0 ? `
            <div class="section-title">Statistical Visualization</div>
            <div class="charts-grid">
                ${page.charts.map(chart => `
                    <div class="chart-wrapper ${chart.fullWidth ? 'full-width' : ''}">
                        <canvas id="chart-${index}-${chart.id}"></canvas>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            ${page.tables && page.tables.length > 0 ? page.tables.map(table => `
                <div class="section-title">${table.title}</div>
                <table>
                    <thead>
                        <tr>
                            ${table.headers.map(h => `<th>${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${table.rows.map(row => `
                            <tr>
                                ${row.map(cell => `
                                    <td>
                                        ${typeof cell === 'object' && cell.type === 'tag'
            ? `<span class="tag ${cell.style}">${cell.text}</span>`
            : cell}
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `).join('') : ''}

            <div class="footer">
                <span>CONFIDENTIAL // INTERNAL USE ONLY</span>
                <span>${new Date().getFullYear()} © SYSTEM GENERATED</span>
            </div>
        </div>
    </div>
    `).join('')}

    <script>
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 11;
        Chart.defaults.color = '#636E72';
        Chart.defaults.scale.grid.color = '#F0F0F0';
        
        ${data.pages.map((page, pIndex) =>
                (page.charts || []).map(chart => `
                new Chart(document.getElementById('chart-${pIndex}-${chart.id}'), ${chart.config});
            `).join('')
            ).join('')}
        
        Chart.defaults.animation = false;
    </script>
</body>
</html>
  `;
};
