const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');

function getLocalIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                // Prefer Wi-Fi or Ethernet interfaces often named 'Wi-Fi', 'Ethernet', 'en0', 'wlan0'
                if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('ethernet') || name.toLowerCase().includes('wlan')) {
                    return net.address;
                }
            }
        }
    }
    // Fallback: take the first non-internal IPv4 found if no specific name matches
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

const updateApiConfig = (filePath, newIP) => {
    const absolutePath = path.resolve(filePath);
    if (fs.existsSync(absolutePath)) {
        let content = fs.readFileSync(absolutePath, 'utf8');
        // Regex to replace IP in http://x.x.x.x:5000
        const regex = /http:\/\/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:5000/g;
        const newUrl = `http://${newIP}:5000`;

        if (content.match(regex)) {
            const newContent = content.replace(regex, newUrl);
            fs.writeFileSync(absolutePath, newContent);
            console.log(`✅ Updated ${path.basename(filePath)} to ${newUrl}`);
        } else {
            console.log(`⚠️  Could not find IP pattern in ${path.basename(filePath)}`);
        }
    } else {
        console.log(`❌ File not found: ${filePath}`);
    }
};

const main = () => {
    const ip = getLocalIP();
    console.log(`📡 Detected Local IP: ${ip}`);

    // Update Parent App
    updateApiConfig(path.join(__dirname, '../src/config/api.js'), ip);

    // Update Mobile App (assuming sibling directory)
    updateApiConfig(path.join(__dirname, '../../mobile-app/src/config/api.js'), ip);
};

main();
