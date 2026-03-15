const prisma = require('../config/prisma');
const dayjs = require('dayjs');

/**
 * Service to handle complex data aggregation for reports
 */

exports.getFinancialReportData = async (startDate, endDate, generatorName) => {
    // 1. Calculate Periods
    const currentStart = dayjs(startDate);
    const currentEnd = dayjs(endDate);
    const prevStart = currentStart.subtract(1, 'month').startOf('month');
    const prevEnd = currentStart.subtract(1, 'month').endOf('month');

    // 2. Global Financials (Current Period)
    const income = await prisma.payment.aggregate({
        _sum: { amountPaid: true },
        where: { 
            createdAt: { gte: currentStart.toDate(), lte: currentEnd.toDate() }, 
            status: 'APPROVED' 
        }
    });

    const expenses = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: { expenseDate: { gte: currentStart.toDate(), lte: currentEnd.toDate() } }
    });

    const totalIncome = parseFloat(income._sum.amountPaid || 0);
    const totalExpense = parseFloat(expenses._sum.amount || 0);
    const netBalance = totalIncome - totalExpense;

    // 3. Category Breakdown (Current Period)
    const paymentsByCategory = await prisma.payment.findMany({
        where: { 
            createdAt: { gte: currentStart.toDate(), lte: currentEnd.toDate() }, 
            status: 'APPROVED' 
        },
        include: { 
            billingpayment: { 
                include: { 
                    billing: { 
                        include: { billingCategory: true } 
                    } 
                } 
            } 
        }
    });

    const categoryStats = {};
    paymentsByCategory.forEach(p => {
        const catName = p.billingpayment[0]?.billing?.billingCategory?.name || 'Other/Uncategorized';
        categoryStats[catName] = (categoryStats[catName] || 0) + parseFloat(p.amountPaid);
    });

    // 4. Collection Health (Current vs Previous)
    const getCollectionStats = async (start, end) => {
        const billings = await prisma.billing.findMany({
            where: { createdAt: { gte: start.toDate(), lte: end.toDate() } }
        });
        const expected = billings.reduce((sum, b) => sum + parseFloat(b.amount), 0);
        const collected = billings
            .filter(b => b.status === 'PAID' || b.status === 'APPROVED')
            .reduce((sum, b) => sum + parseFloat(b.amount), 0);
        const overdue = expected - collected;
        return { expected, collected, overdue };
    };

    const currentCollection = await getCollectionStats(currentStart, currentEnd);
    const prevCollection = await getCollectionStats(prevStart, prevEnd);

    // 5. Class-wise Overdue Breakdown (Current Period)
    // We get all unpaid billings for current period and group them by classroom
    const unpaidBillings = await prisma.billing.findMany({
        where: { 
            status: 'UNPAID',
            createdAt: { gte: currentStart.toDate(), lte: currentEnd.toDate() }
        },
        include: { 
            student: { 
                include: { classroom: true } 
            } 
        }
    });

    const classOverdueMap = {};
    unpaidBillings.forEach(b => {
        const className = b.student?.classroom?.name || 'Unassigned';
        classOverdueMap[className] = (classOverdueMap[className] || 0) + parseFloat(b.amount);
    });

    // Sort classes by overdue amount descending for the chart
    const sortedClasses = Object.entries(classOverdueMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 heavy overdue classes

    // 6. Structure Report Data for Template
    return {
        generatedBy: generatorName,
        pages: [
            {
                title: 'Institutional Profit & Loss Statement',
                scorecards: [
                    { label: 'Net Profit/Loss', value: `LKR ${netBalance.toLocaleString()}`, status: netBalance >= 0 ? 'success' : 'danger', sub: 'Calculated this period' },
                    { label: 'Total Income', value: `LKR ${totalIncome.toLocaleString()}` },
                    { label: 'Operation Costs', value: `LKR ${totalExpense.toLocaleString()}`, status: 'danger' }
                ],
                insight: `The organization recorded a ${netBalance >= 0 ? 'profit' : 'loss'} of LKR ${Math.abs(netBalance).toLocaleString()} for this period. Net Margin is ${totalIncome > 0 ? ((netBalance / totalIncome) * 100).toFixed(1) : 0}%.`,
                charts: [
                    {
                        id: 'pl-bar',
                        fullWidth: true,
                        config: JSON.stringify({
                            type: 'bar',
                            data: {
                                labels: ['Gross Income', 'Expenses', 'Net Profit'],
                                datasets: [{
                                    data: [totalIncome, totalExpense, netBalance],
                                    backgroundColor: ['#A29BFE', '#FF7675', '#7B57E4']
                                }]
                            },
                            options: { plugins: { legend: { display: false } }, maintainAspectRatio: false }
                        })
                    },
                    {
                        id: 'income-dist',
                        config: JSON.stringify({
                            type: 'doughnut',
                            data: {
                                labels: Object.keys(categoryStats),
                                datasets: [{
                                    data: Object.values(categoryStats),
                                    backgroundColor: ['#7B57E4', '#A29BFE', '#FAB1A0', '#55E6C1']
                                }]
                            },
                            options: { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
                        })
                    }
                ],
                tables: [
                    {
                        title: 'Revenue Stream Distribution',
                        headers: ['Category', 'Amount Collected', 'Share (%)'],
                        rows: Object.entries(categoryStats).map(([cat, val]) => [
                            cat, 
                            `LKR ${val.toLocaleString()}`, 
                            { type: 'tag', style: 'primary', text: `${((val / totalIncome) * 100).toFixed(1)}%` }
                        ])
                    }
                ]
            },
            {
                title: 'Collection & Overdue Analysis',
                scorecards: [
                    { label: 'Collection Rate', value: currentCollection.expected > 0 ? `${((currentCollection.collected / currentCollection.expected) * 100).toFixed(1)}%` : '0%', status: 'success' },
                    { label: 'Total Overdue', value: `LKR ${currentCollection.overdue.toLocaleString()}`, status: 'danger' },
                    { label: 'Expected Revenue', value: `LKR ${currentCollection.expected.toLocaleString()}` }
                ],
                insight: `Current collection efficiency is at ${currentCollection.expected > 0 ? ((currentCollection.collected / currentCollection.expected) * 100).toFixed(1) : 0}%. Urgent follow-up is suggested for overdue accounts.`,
                charts: [
                    {
                        id: 'collection-comparison',
                        config: JSON.stringify({
                            type: 'bar',
                            data: {
                                labels: ['Previous', 'Current'],
                                datasets: [
                                    { label: 'Expected', data: [prevCollection.expected, currentCollection.expected], backgroundColor: '#D6D1F9' },
                                    { label: 'Collected', data: [prevCollection.collected, currentCollection.collected], backgroundColor: '#7B57E4' }
                                ]
                            },
                            options: { maintainAspectRatio: false }
                        })
                    },
                    {
                        id: 'class-overdue-ranking',
                        config: JSON.stringify({
                            type: 'bar',
                            data: {
                                labels: sortedClasses.map(c => c[0]),
                                datasets: [{
                                    label: 'Unpaid Amount',
                                    data: sortedClasses.map(c => c[1]),
                                    backgroundColor: '#FF7675'
                                }]
                            },
                            options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }
                        })
                    }
                ],
                tables: [
                    {
                        title: 'Critical Follow-up List',
                        headers: ['Classroom', 'Overdue Amount', 'Status'],
                        rows: sortedClasses.map(c => [
                            c[0], 
                            `LKR ${c[1].toLocaleString()}`, 
                            { type: 'tag', style: 'danger', text: 'HIGH OVERDUE' }
                        ])
                    }
                ]
            }
        ]
    };
};
