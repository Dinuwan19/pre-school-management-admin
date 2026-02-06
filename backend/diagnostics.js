const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
const SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function runDiagnostics() {
    const token = jwt.sign({ id: 1, role: 'ADMIN', username: 'admin' }, SECRET);
    const headers = { Authorization: `Bearer ${token}` };

    console.log('--- SYSTEM DIAGNOSTICS ---');

    // 1. Student Progress
    try {
        const res = await axios.get(`${API_URL}/students`, { headers });
        const student = res.data[0];
        if (student) {
            console.log('✓ Student List: Working');
            const detail = await axios.get(`${API_URL}/students/${student.id}`, { headers });
            console.log('✓ Student Detail: Working');
            console.log('   - Progress Data:', JSON.stringify(detail.data.progress));
        }
    } catch (e) { console.error('✗ Student/Progress Error:', e.response?.data || e.message); }

    // 2. Announcements
    try {
        const res = await axios.get(`${API_URL}/notifications`, { headers });
        console.log('✓ Announcements List: Working (Count:', res.data.length, ')');
    } catch (e) { console.error('✗ Announcements Error:', e.response?.data || e.message); }

    // 3. Billing Stats
    try {
        const res = await axios.get(`${API_URL}/dashboard/stats`, { headers });
        console.log('✓ Dashboard Stats: Working');
        console.log('   - Billing Stats:', JSON.stringify(res.data.analytics?.payments));
    } catch (e) { console.error('✗ Dashboard/Billing Error:', e.response?.data || e.message); }

    // 4. Events
    try {
        const res = await axios.get(`${API_URL}/events`, { headers });
        console.log('✓ Events List: Working');
    } catch (e) { console.error('✗ Events Error:', e.response?.data || e.message); }
}

runDiagnostics();
