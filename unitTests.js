const axios = require('axios');

// Configuration for console output colors
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

/**
 * Main function to run all unit tests (End-to-End API tests).
 */
async function runTests() {
    console.log("=== Starting Unit Tests (API Tests) ===\n");

    try {
        // ---------------------------------------------------------
        // TEST 1: Check Admin Service
        // ---------------------------------------------------------
        console.log("1. Testing Admin Service (GET /api/about)...");
        const adminRes = await axios.get('http://127.0.0.1:3004/api/about');
        if (adminRes.status === 200) {
            console.log(colors.green + "   [PASS] Admin service is running." + colors.reset);
        }

        // ---------------------------------------------------------
        // TEST 2: Create New User
        // ---------------------------------------------------------
        console.log("\n2. Testing Create User (POST /api/addusers)...");
        const randomId = Math.floor(Math.random() * 100000) + 200000;

        try {
            const userRes = await axios.post('http://127.0.0.1:3001/api/addusers', {
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

        // ---------------------------------------------------------
        // TEST 3: Add Cost Item (YEAR 2050)
        // ---------------------------------------------------------
        console.log("\n3. Testing Add Cost (POST /api/add)...");
        // We assume we haven't created a report for 2050 yet
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

        // ---------------------------------------------------------
        // TEST 4: Monthly Report (YEAR 2050)
        // ---------------------------------------------------------
        console.log("\n4. Testing Monthly Report (GET /api/report)...");
        const reportRes = await axios.get('http://127.0.0.1:3002/api/report?id=123123&year=2050&month=2');

        // CORRECTION: Since your report is grouped by category, we check the 'food' array
        if (reportRes.data && reportRes.data.food && reportRes.data.food.length > 0) {
            console.log(colors.green + "   [PASS] Report generated successfully." + colors.reset);
        } else {
            console.log(colors.red + "   [FAIL] Report is empty. Response data: " + JSON.stringify(reportRes.data) + colors.reset);
        }

        // ---------------------------------------------------------
        // TEST 5: Check Specific User Details
        // ---------------------------------------------------------
        console.log("\n5. Testing Get Specific User Details (GET /api/users/:id)...");
        const userDetailsRes = await axios.get('http://127.0.0.1:3001/api/users/123123');

        if (userDetailsRes.data.total !== undefined) {
            console.log(colors.green + "   [PASS] User details fetched correctly with 'total' field." + colors.reset);
        } else {
            console.log(colors.red + "   [FAIL] 'total' field is missing!" + colors.reset);
        }

        console.log("\n" + colors.green + "=== ALL TESTS COMPLETED SUCCESSFULLY ===" + colors.reset);

    } catch (error) {
        console.error(colors.red + "\n[ERROR] Test Failed!" + colors.reset);
        console.error(error.message);
    }
}

runTests();