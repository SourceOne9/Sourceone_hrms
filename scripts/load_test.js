const http = require('http');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const start = performance.now();
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (d) => { body += d; });
            res.on('end', () => {
                const duration = performance.now() - start;
                resolve({
                    statusCode: res.statusCode,
                    duration,
                    headers: res.headers,
                    body
                });
            });
        });

        req.on('error', (e) => {
            const duration = performance.now() - start;
            resolve({ statusCode: 0, error: e.message, duration });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function loginAndGetCookie() {
    console.log("🔓 Fetching CSRF token...");
    try {
        const csrfReq = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/csrf',
            method: 'GET'
        });

        let csrfToken = '';
        if (csrfReq.statusCode === 200 && csrfReq.body) {
            const csrfData = JSON.parse(csrfReq.body);
            csrfToken = csrfData.csrfToken;
        }

        const csrfCookies = csrfReq.headers['set-cookie'] || [];
        const csrfCookieStr = Array.isArray(csrfCookies) ? csrfCookies.join('; ') : csrfCookies;

        console.log("🔓 Logging in to obtain session cookie...");
        const postData = new URLSearchParams({
            email: "admin@loadtest.emspro.com",
            password: "loadtest123",
            redirect: "false",
            csrfToken: csrfToken
        }).toString();

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/auth/callback/credentials',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
                'Cookie': csrfCookieStr
            }
        };

        const result = await makeRequest(options, postData);

        const setCookieHeader = result.headers['set-cookie'];
        if (!setCookieHeader) {
            console.error("❌ Failed to get cookies. Status:", result.statusCode);
            process.exit(1);
        }

        const cookiesStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : setCookieHeader;
        const match = cookiesStr.match(/(?:__Secure-)?authjs\.session-token=([^;]+)/);

        if (!match) {
            console.error("❌ Failed to extract session token from cookies:", cookiesStr);
            process.exit(1);
        }

        const cookieName = cookiesStr.includes("__Secure-authjs.session-token") ? "__Secure-authjs.session-token" : "authjs.session-token";
        console.log(`✅ Obtained session cookie: ${cookieName}`);
        return `${cookieName}=${match[1]}`;
    } catch (e) {
        console.error("❌ CSRF/Login Error:", e);
        process.exit(1);
    }
}

async function benchmarkEndpoint(name, path, method, cookie, iterations = 20, concurrency = 2) {
    console.log(`\n⏳ Benchmarking ${name} (${path}) [${iterations} reqs, ${concurrency} concurrent]`);
    const results = [];
    let completed = 0;

    const postData = method === 'POST' ? JSON.stringify({
        entityType: "EMPLOYEE",
        columns: ["firstName", "lastName", "departmentId"],
        filters: {},
        limit: 50
    }) : null;

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
            'Cookie': cookie,
            'Content-Type': 'application/json'
        }
    };
    if (postData) options.headers['Content-Length'] = Buffer.byteLength(postData);

    async function worker(queue) {
        while (queue.length > 0) {
            queue.shift(); // take one task
            const result = await makeRequest(options, postData);
            results.push(result);
            completed++;
            process.stdout.write(`\rProgress: ${completed}/${iterations}`);
        }
    }

    const queue = Array.from({ length: iterations }, (_, i) => i);
    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push(worker(queue));
    }

    await Promise.all(workers);
    console.log(); // Newline

    const successful = results.filter(r => r.statusCode >= 200 && r.statusCode < 300);
    const failed = results.filter(r => r.statusCode < 200 || r.statusCode >= 300);
    const durations = successful.map(r => r.duration).sort((a, b) => a - b);

    if (durations.length === 0) {
        console.log(`❌ All requests failed for ${name}! Sample error code:`, failed[0]?.statusCode);
        return;
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const p95 = durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1];
    const min = durations[0];
    const max = durations[durations.length - 1];

    console.log(`✅ Results for ${name}:`);
    console.log(`   Success: ${successful.length}/${iterations}`);
    console.log(`   Failed:  ${failed.length}/${iterations}`);
    console.log(`   Avg:     ${avg.toFixed(2)} ms`);
    console.log(`   P95:     ${p95.toFixed(2)} ms`);
    console.log(`   Min:     ${min.toFixed(2)} ms`);
    console.log(`   Max:     ${max.toFixed(2)} ms`);
}

async function runLoadTests() {
    const cookie = await loginAndGetCookie();

    await benchmarkEndpoint(
        "Employee Directory (Page 1)",
        "/api/employees?page=1&limit=20",
        "GET",
        cookie,
        50,
        5
    );

    await benchmarkEndpoint(
        "Dashboard Aggregations",
        "/api/dashboard",
        "GET",
        cookie,
        50,
        5
    );

    await benchmarkEndpoint(
        "Reports Query Builder",
        "/api/reports/query",
        "POST",
        cookie,
        30,
        5
    );

    console.log("\n🎉 Load Testing Complete!");
}

runLoadTests();
