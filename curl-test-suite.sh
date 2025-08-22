#!/bin/bash

# ============================================
# CURL TEST SUITE FOR CAREER SWITCH FUNCTIONS
# Comprehensive command-line testing 
# ============================================

PROJECT_ID="vzpissitddpunkpythsb"
BASE_URL="https://${PROJECT_ID}.functions.supabase.co"
DEV_USER_ID="2b458624-d498-4cca-a63d-9341cc20e363"  # Aisha Khan

# Test track IDs
FROM_TRACK_ID="e728ea1b-aeac-431a-b223-4315a7044fa5"
TO_TRACK_ID="11487b59-02ea-4a26-ae30-f6ac586d54e0"

echo "🔧 Career Switch & Location Optimizer - CURL Test Suite"
echo "======================================================"
echo "Project: $PROJECT_ID"
echo "Base URL: $BASE_URL"
echo "Dev User: $DEV_USER_ID"
echo "From Track: $FROM_TRACK_ID"
echo "To Track: $TO_TRACK_ID"
echo ""

# ============================================
# Helper Functions
# ============================================

test_function() {
    local func_name="$1"
    local description="$2"
    local payload="$3"
    local expected_status="$4"
    
    echo "🎯 Testing: $func_name - $description"
    echo "📤 Payload: $payload"
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "x-dev-user-id: $DEV_USER_ID" \
        -d "$payload" \
        "$BASE_URL/$func_name")
    
    # Split response body and status code
    body=$(echo "$response" | head -n -1)
    status=$(echo "$response" | tail -n 1)
    
    echo "📥 Status: $status"
    echo "📥 Response: $body"
    
    if [ "$status" = "$expected_status" ]; then
        echo "✅ Expected status $expected_status"
    else
        echo "⚠️  Expected $expected_status, got $status"
    fi
    
    echo ""
}

test_cors() {
    local func_name="$1"
    
    echo "🌐 Testing CORS preflight: $func_name"
    
    curl -i -X OPTIONS \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: content-type,x-dev-user-id" \
        "$BASE_URL/$func_name"
    
    echo ""
}

# ============================================
# CORS PREFLIGHT TESTS
# ============================================

echo "📡 PHASE 1: CORS Preflight Tests"
echo "--------------------------------"

test_cors "calculate-career-switch"
test_cors "location-switch-optimizer"

# ============================================
# PING ENDPOINT TESTS
# ============================================

echo "🏓 PHASE 2: Ping Endpoint Tests"
echo "-------------------------------"

test_function "calculate-career-switch" "Ping test" '{"action":"ping"}' "200"
test_function "location-switch-optimizer" "Ping test" '{"action":"ping"}' "200"

# ============================================
# BAD REQUEST TESTS (400)
# ============================================

echo "🚫 PHASE 3: Bad Request Tests (400)"
echo "-----------------------------------"

# Empty payload
test_function "calculate-career-switch" "Empty payload" '{}' "400"
test_function "location-switch-optimizer" "Empty payload" '{}' "400"

# Missing fromTrackId
test_function "calculate-career-switch" "Missing fromTrackId" "{\"toTrackId\":\"$TO_TRACK_ID\"}" "400"
test_function "location-switch-optimizer" "Missing fromTrackId" "{\"toTrackId\":\"$TO_TRACK_ID\"}" "400"

# Missing toTrackId
test_function "calculate-career-switch" "Missing toTrackId" "{\"fromTrackId\":\"$FROM_TRACK_ID\"}" "400"
test_function "location-switch-optimizer" "Missing toTrackId" "{\"fromTrackId\":\"$FROM_TRACK_ID\"}" "400"

# Empty string IDs
test_function "calculate-career-switch" "Empty string IDs" '{"fromTrackId":"","toTrackId":""}' "400"
test_function "location-switch-optimizer" "Empty string IDs" '{"fromTrackId":"","toTrackId":""}' "400"

# Invalid JSON
echo "🎯 Testing: calculate-career-switch - Invalid JSON"
echo "📤 Payload: {invalid json"
response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-dev-user-id: $DEV_USER_ID" \
    -d "{invalid json" \
    "$BASE_URL/calculate-career-switch")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
echo "📥 Status: $status"
echo "📥 Response: $body"
echo ""

# ============================================
# NOT FOUND TESTS (404)
# ============================================

echo "🔍 PHASE 4: Not Found Tests (404)"
echo "---------------------------------"

# Non-existent track IDs
test_function "calculate-career-switch" "Non-existent tracks" '{"fromTrackId":"00000000-0000-0000-0000-000000000000","toTrackId":"11111111-1111-1111-1111-111111111111"}' "404"
test_function "location-switch-optimizer" "Non-existent tracks" '{"fromTrackId":"00000000-0000-0000-0000-000000000000","toTrackId":"11111111-1111-1111-1111-111111111111"}' "404"

# ============================================
# SUCCESS TESTS (200)
# ============================================

echo "✅ PHASE 5: Success Tests (200)"
echo "-------------------------------"

# Calculate career switch with valid data
test_function "calculate-career-switch" "Valid career switch" "{\"fromTrackId\":\"$FROM_TRACK_ID\",\"toTrackId\":\"$TO_TRACK_ID\",\"locationId\":\"US-NYC\"}" "200"

# Location optimizer with valid data
test_function "location-switch-optimizer" "Valid location optimization" "{\"fromTrackId\":\"$FROM_TRACK_ID\",\"toTrackId\":\"$TO_TRACK_ID\",\"topN\":5}" "200"

# Location optimizer with minimal data
test_function "location-switch-optimizer" "Minimal location optimization" "{\"fromTrackId\":\"$FROM_TRACK_ID\",\"toTrackId\":\"$TO_TRACK_ID\"}" "200"

# ============================================
# AUTHENTICATION TESTS
# ============================================

echo "🔐 PHASE 6: Authentication Tests"
echo "--------------------------------"

# No auth header
echo "🎯 Testing: calculate-career-switch - No authentication"
response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"fromTrackId\":\"$FROM_TRACK_ID\",\"toTrackId\":\"$TO_TRACK_ID\"}" \
    "$BASE_URL/calculate-career-switch")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
echo "📥 Status: $status"
echo "📥 Response: $body"
echo ""

# Invalid dev user ID
echo "🎯 Testing: calculate-career-switch - Invalid dev user"
response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-dev-user-id: invalid-user-id" \
    -d "{\"fromTrackId\":\"$FROM_TRACK_ID\",\"toTrackId\":\"$TO_TRACK_ID\"}" \
    "$BASE_URL/calculate-career-switch")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
echo "📥 Status: $status"
echo "📥 Response: $body"
echo ""

# ============================================
# PERFORMANCE TESTS
# ============================================

echo "⚡ PHASE 7: Performance Tests"
echo "-----------------------------"

echo "⏱️  Testing response times..."

for i in {1..3}; do
    echo "🔄 Request $i/3"
    time curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -H "x-dev-user-id: $DEV_USER_ID" \
        -d "{\"fromTrackId\":\"$FROM_TRACK_ID\",\"toTrackId\":\"$TO_TRACK_ID\"}" \
        "$BASE_URL/calculate-career-switch" > /dev/null
done

echo ""

# ============================================
# SUMMARY
# ============================================

echo "🎉 CURL Test Suite Completed"
echo "============================="
echo "All tests have been executed. Review the output above for:"
echo "  ✅ Successful responses (200)"
echo "  🚫 Proper error handling (400, 401, 404)"
echo "  🌐 CORS configuration"
echo "  🔐 Authentication behavior"
echo "  ⚡ Response performance"
echo ""
echo "💡 To run individual tests, execute the commands manually:"
echo "  curl -X POST -H 'Content-Type: application/json' -H 'x-dev-user-id: $DEV_USER_ID' -d '{\"action\":\"ping\"}' '$BASE_URL/calculate-career-switch'"
echo ""