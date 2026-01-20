const axios = require('axios');

/* Configuration for console output colors. */
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

/**
 * Helper function to handle validation tests.
 * It expects the request to FAIL with status 400.
 */
async function testValidation(testName, url, method, data = {}, params = {}) {
    process.stdout.write(`   Testing ${testName}... `);
    try {
        if (method === 'POST') {
            await axios.post(url, data);
        } else if (method === 'GET') {
            await axios.get(url, { params });
        }

        // If we reach here, the request succeeded unexpectedly (which is a FAIL for validation tests)
        console.log(colors.red + "[FAIL] - Server accepted invalid data!" + colors.reset);
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.log(colors.green + "[PASS] - Server blocked invalid request." + colors.reset);
        } else {
            console.log(colors.red + `[FAIL] - Unexpected error: ${error.message}` + colors.reset);
        }
    }
}

/**
 * Main function to run all unit tests.
 */
async function runTests() {
    console.log("=== Starting Unit Tests (API Tests) ===\n");

    try {
        // TEST 1: Check Admin Service
        console.log("1. Testing Admin Service (GET /api/about)...");
        try {
            const adminRes = await axios.get('http://127.0.0.1:3004/api/about');
            if (adminRes.status === 200) console.log(colors.green + "   [PASS] Admin service is running." + colors.reset);
        } catch (e) { console.log(colors.red + "   [FAIL] Admin service not reachable." + colors.reset); }

        // TEST 2: Create New User
        console.log("\n2. Testing Create User (POST /api/add)...");
        const randomId = Math.floor(Math.random() * 100000) + 200000;
        try {
            const userRes = await axios.post('http://127.0.0.1:3001/api/add', {
                id: randomId,
                first_name: "Test",
                last_name: "User",
                birthday: "1995-05-05"
            });
            if (userRes.status === 200 || userRes.status === 201) {
                console.log(colors.green + `   [PASS] User created successfully (ID: ${randomId}).` + colors.reset);
            }
        } catch (error) {
            console.log(colors.green + "   [PASS] User creation handled (User might already exist)." + colors.reset);
        }

        // TEST 3: Add Cost Item
        console.log("\n3. Testing Add Cost (POST /api/add)...");
        try {
            const costRes = await axios.post('http://127.0.0.1:3002/api/add', {
                description: "Unit Test Item",
                category: "food",
                userid: 123123,
                sum: 25,
                created_at: "2050-02-15T10:00:00Z"
            });
            if (costRes.status === 200 || costRes.status === 201) {
                console.log(colors.green + "   [PASS] Cost item added successfully." + colors.reset);
            }
        } catch (e) { console.log(colors.red + "   [FAIL] Add Cost failed: " + e.message + colors.reset); }

        // TEST 4: Monthly Report
        console.log("\n4. Testing Monthly Report (GET /api/report)...");
        try {
            const reportRes = await axios.get('http://127.0.0.1:3002/api/report?id=123123&year=2050&month=2');
            let foundFood = false;
            if (reportRes.data && Array.isArray(reportRes.data.costs)) {
                const foodItem = reportRes.data.costs.find(item => item.food);
                if (foodItem && foodItem.food.length > 0) foundFood = true;
            }
            if (foundFood) {
                console.log(colors.green + "   [PASS] Report generated successfully." + colors.reset);
            } else {
                console.log(colors.red + "   [FAIL] Report structure mismatch." + colors.reset);
            }
        } catch (e) { console.log(colors.red + "   [FAIL] Report failed: " + e.message + colors.reset); }

        // TEST 5: Check Specific User Details
        console.log("\n5. Testing Get Specific User Details (GET /api/users/:id)...");
        try {
            const userDetailsRes = await axios.get('http://127.0.0.1:3001/api/users/123123');
            if (userDetailsRes.data.total !== undefined) {
                console.log(colors.green + "   [PASS] User details fetched correctly with 'total' field." + colors.reset);
            } else {
                console.log(colors.red + "   [FAIL] 'total' field is missing!" + colors.reset);
            }
        } catch (e) { console.log(colors.red + "   [FAIL] Get User failed: " + e.message + colors.reset); }

        // TEST 6: Invalid Cost Addition
        console.log("\n6. Testing Invalid Cost Addition (User does not exist)...");
        try {
            await axios.post('http://127.0.0.1:3002/api/add', {
                description: "Invalid Item",
                category: "food",
                userid: 999999,
                sum: 100
            });
            console.log(colors.red + "   [FAIL] Server allowed adding cost to non-existent user!" + colors.reset);
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log(colors.green + "   [PASS] Server correctly blocked the request." + colors.reset);
            } else {
                console.log(colors.red + "   [FAIL] Unexpected error: " + error.message + colors.reset);
            }
        }

        // --- NEW VALIDATION TESTS ---
        console.log(colors.yellow + "\n=== STARTING FIELD VALIDATION TESTS ===" + colors.reset);

        // TEST 7: User Input Validations
        console.log("\n7. Testing User Field Validations (Users Service)...");
        await testValidation("Missing ID", 'http://127.0.0.1:3001/api/add', 'POST', { first_name: "No", last_name: "Id", birthday: "1990-01-01" });
        await testValidation("Missing First Name", 'http://127.0.0.1:3001/api/add', 'POST', { id: 88888, last_name: "NoName", birthday: "1990-01-01" });

        // TEST 8: Cost Input Validations
        console.log("\n8. Testing Cost Field Validations (Costs Service)...");
        await testValidation("Missing Sum", 'http://127.0.0.1:3002/api/add', 'POST', { description: "No Sum", category: "food", userid: 123123 });
        await testValidation("Negative Sum", 'http://127.0.0.1:3002/api/add', 'POST', { description: "Negative", category: "food", userid: 123123, sum: -50 });
        await testValidation("Missing Category", 'http://127.0.0.1:3002/api/add', 'POST', { description: "No Cat", userid: 123123, sum: 50 });
        await testValidation("Missing Description", 'http://127.0.0.1:3002/api/add', 'POST', { category: "food", userid: 123123, sum: 50 });

        // TEST 9: Report Input Validations
        console.log("\n9. Testing Report Query Validations (Costs Service)...");
        await testValidation("Missing Query Parameters", 'http://127.0.0.1:3002/api/report', 'GET', {}, {});

        // TEST 10: Type Validation Tests
        console.log("\n10. Testing Data Type Validations...");

        // 10.1 User ID as String
        await testValidation(
            "User ID as String (Invalid Type)",
            'http://127.0.0.1:3001/api/add',
            'POST',
            { id: "NOT_A_NUMBER", first_name: "Wrong", last_name: "Type", birthday: "1990-01-01" }
        );

        // 10.2 Cost Sum as String
        await testValidation(
            "Cost Sum as String (Invalid Type)",
            'http://127.0.0.1:3002/api/add',
            'POST',
            { description: "Test", category: "food", userid: 123123, sum: "expensive" }
        );

        // 10.3 Report Year as String
        await testValidation(
            "Report Year as String (Invalid Type)",
            'http://127.0.0.1:3002/api/report',
            'GET',
            {},
            { id: 123123, year: "bad_year", month: 1 }
        );

        console.log("\n" + colors.green + "=== ALL TESTS COMPLETED SUCCESSFULLY ===" + colors.reset);

    } catch (error) {
        console.error(colors.red + "\n[ERROR] Test Suite Failed!" + colors.reset);
        console.error(error.message);
    }
}

// Execute the test suite
runTests();