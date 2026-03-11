const crypto = require('crypto');

const API_KEY = 'hyOZt2IjbgA6s486uGZGjLXynLIiEVFpqvubnKZo3dizhZFMO0zxG21QienJLiWg';
const SECRET_KEY = 'OZL2DC04ad0RH7zknZUSjayngWoCWXSDyyBUXbzFjPQkidDfGsJrrTjldAoZROfl';
const BASE_URL = 'https://testnet.binance.vision';

function generateSignature(queryString) {
    return crypto.createHmac('sha256', SECRET_KEY).update(queryString).digest('hex');
}

async function testConnection() {
    console.log('Testing connection to Binance Testnet...');
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=60000`;
    const signature = generateSignature(queryString);

    try {
        const response = await fetch(`${BASE_URL}/api/v3/account?${queryString}&signature=${signature}`, {
            method: 'GET',
            headers: {
                'X-MBX-APIKEY': API_KEY
            }
        });
        const data = await response.json();

        if (response.ok) {
            console.log('✅ Connection Successful!');
            const balances = data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
            console.log('Testnet Balances:', balances);
            return balances;
        } else {
            console.error('❌ Connection Failed:', data.msg);
        }
    } catch (error) {
        console.error('Network Error:', error.message);
    }
    return null;
}

async function placeTestOrder() {
    console.log('\nPlacing a test market order on BTCUSDT...');
    const timestamp = Date.now();
    const params = new URLSearchParams({
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quoteOrderQty: '100', // Buy $100 worth of BTC
        timestamp: timestamp.toString(),
        recvWindow: '60000'
    });

    const queryString = params.toString();
    const signature = generateSignature(queryString);

    try {
        const response = await fetch(`${BASE_URL}/api/v3/order?${queryString}&signature=${signature}`, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await response.json();

        if (response.ok) {
            console.log('✅ Order Placed Successfully!');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.error('❌ Order Failed:', data.msg || data);
        }
    } catch (error) {
        console.error('Network Error:', error.message);
    }
}

async function run() {
    const balances = await testConnection();
    if (balances) {
        await placeTestOrder();
    }
}

run();
