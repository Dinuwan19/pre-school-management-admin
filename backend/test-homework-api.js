async function testHomework() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password123' })
        });
        const { token } = await loginRes.json();

        const hwRes = await fetch('http://localhost:5000/api/homework', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Status:', hwRes.status);
        const text = await hwRes.text();
        console.log('Body:', text);

    } catch (e) { console.error(e); }
}
testHomework();
