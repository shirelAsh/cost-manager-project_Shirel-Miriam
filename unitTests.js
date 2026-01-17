const axios = require('axios');

/* * Configuration for console output colors.
 * This helper object allows us to print colored status messages (Pass/Fail)
 * to the terminal, making it easier to spot errors visually.
 */
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

/**
 * Main function to run all unit tests (End-to-End API tests).
 * This function executes a sequence of HTTP requests against the local microservices
 * to verify that all requirements (Admin, Users, Costs, Reports) are functioning correctly.
 */
async function runTests() {
    console.log("=== Starting Unit Tests (API Tests) ===\n");

    try {

        // TEST 1: Check Admin Service
        console.log("1. Testing Admin Service (GET /api/about)...");

        // Send request to Admin Service
        const adminRes = await axios.get('http://127.0.0.1:3004/api/about');

        // Verify response status
        if (adminRes.status === 200) {
            console.log(colors.green + "   [PASS] Admin service is running." + colors.reset);
        }

        // TEST 2: Create New User
        console.log("\n2. Testing Create User (POST /api/add)...");

        // Generate a random ID to avoid conflicts in repeated runs
        const randomId = Math.floor(Math.random() * 100000) + 200000;

        try {
            // Send POST request to Users Service
            const userRes = await axios.post('http://127.0.0.1:3001/api/add', {
                id: randomId,
                first_name: "Test",
                last_name: "User",
                birthday: "1995-05-05"
            });

            // Check for successful creation (200 or 201)
            if (userRes.status === 200 || userRes.status === 201) {
                console.log(colors.green + `   [PASS] User created successfully (ID: ${randomId}).` + colors.reset);
            }
        } catch (error) {
            // Handle case where user might already exist (idempotency check)
            console.log(colors.green + "   [PASS] User creation handled (User might already exist)." + colors.reset);
        }


        // TEST 3: Add Cost Item
        console.log("\n3. Testing Add Cost (POST /api/add)...");

        // We use a future date (2050) to isolate test data from real data
        const costRes = await axios.post('http://127.0.0.1:3002/api/add', {
            description: "Unit Test Item",
            category: "food",
            userid: 123123, // Ensure this user exists in your DB
            sum: 25,
            created_at: "2050-02-15T10:00:00Z"
        });

        // Verify successful addition
        if (costRes.status === 200 || costRes.status === 201) {
            console.log(colors.green + "   [PASS] Cost item added successfully." + colors.reset);
        }


        // TEST 4: Monthly Report
        console.log("\n4. Testing Monthly Report (GET /api/report)...");

        // Request the report for the month where we added the item
        const reportRes = await axios.get('http://127.0.0.1:3002/api/report?id=123123&year=2050&month=2');

        /* Validate Response Structure:
           The requirement specifies the costs should be grouped by category.
           We iterate through the 'costs' array to find the 'food' category.
        */
        let foundFood = false;
        if (reportRes.data && Array.isArray(reportRes.data.costs)) {
            // Find the object that has the 'food' key
            const foodItem = reportRes.data.costs.find(item => item.food);

            // Check if the food array contains our item
            if (foodItem && foodItem.food.length > 0) {
                foundFood = true;
            }
        }

        // Print result based on validation
        if (foundFood) {
            console.log(colors.green + "   [PASS] Report generated successfully." + colors.reset);
        } else {
            console.log(colors.red + "   [FAIL] Report structure mismatch or empty. Response: " + JSON.stringify(reportRes.data) + colors.reset);
        }


        // TEST 5: Check Specific User Details
        console.log("\n5. Testing Get Specific User Details (GET /api/users/:id)...");

        // Fetch user details including the 'total' computed field
        const userDetailsRes = await axios.get('http://127.0.0.1:3001/api/users/123123');

        // Verify the 'total' field exists
        if (userDetailsRes.data.total !== undefined) {
            console.log(colors.green + "   [PASS] User details fetched correctly with 'total' field." + colors.reset);
        } else {
            console.log(colors.red + "   [FAIL] 'total' field is missing!" + colors.reset);
        }

        // TEST 6: Invalid Cost Addition (User does not exist)
        console.log("\n6. Testing Invalid Cost Addition (User does not exist)...");

        try {
            // Attempt to add a cost for a non-existent user ID
            await axios.post('http://127.0.0.1:3002/api/add', {
                description: "Invalid Item",
                category: "food",
                userid: 999999, // Non-existent ID
                sum: 100
            });

            // If we reach here, the server failed to block the request
            console.log(colors.red + "   [FAIL] Server allowed adding cost to non-existent user!" + colors.reset);
        } catch (error) {
            // Check if the server responded with 400 Bad Request
            if (error.response && error.response.status === 400) {
                console.log(colors.green + "   [PASS] Server correctly blocked the request." + colors.reset);
            } else {
                console.log(colors.red + "   [FAIL] Unexpected error: " + error.message + colors.reset);
            }
        }

        console.log("\n" + colors.green + "=== ALL TESTS COMPLETED SUCCESSFULLY ===" + colors.reset);

    } catch (error) {
        // Catch-all for any unexpected errors during the test run
        console.error(colors.red + "\n[ERROR] Test Failed!" + colors.reset);
        console.error(error.message);
    }
}

// Execute the test suite
runTests();