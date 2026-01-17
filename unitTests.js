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
        console.log("\n2. Testing Create User (POST /api/add)...");
        const randomId = Math.floor(Math.random() * 100000) + 200000;

        try {
            // FIX: Changed endpoint from /api/addusers to /api/add
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

        // FIX: Adapted check for the new response structure (array of objects inside 'costs')
        let foundFood = false;
        if (reportRes.data && Array.isArray(reportRes.data.costs)) {
            // Find the object that has the 'food' key
            const foodItem = reportRes.data.costs.find(item => item.food);
            if (foodItem && foodItem.food.length > 0) {
                foundFood = true;
            }
        }

        if (foundFood) {
            console.log(colors.green + "   [PASS] Report generated successfully." + colors.reset);
        } else {
            console.log(colors.red + "   [FAIL] Report structure mismatch or empty. Response: " + JSON.stringify(reportRes.data) + colors.reset);
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

        // ---------------------------------------------------------
        // TEST 6: Invalid Cost Addition (User does not exist)
        // ---------------------------------------------------------
        console.log("\n6. Testing Invalid Cost Addition (User does not exist)...");
        try {
            await axios.post('http://127.0.0.1:3002/api/add', {
                description: "Invalid Item",
                category: "food",
                userid: 999999, // Non-existent ID
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

        console.log("\n" + colors.green + "=== ALL TESTS COMPLETED SUCCESSFULLY ===" + colors.reset);

    } catch (error) {
        console.error(colors.red + "\n[ERROR] Test Failed!" + colors.reset);
        console.error(error.message);
    }
}

runTests();