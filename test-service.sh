#!/bin/bash

# Test script for YouTube Analysis Service
echo "🧪 YouTube Analysis Service Test Suite"
echo "======================================="

# Check if service is running
echo "📡 Checking service health..."
HEALTH_RESPONSE=$(curl -s http://localhost:8080/health)
if [ $? -eq 0 ]; then
    echo "✅ Service is running"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "❌ Service is not running on localhost:8080"
    exit 1
fi

# Test analysis endpoint
echo ""
echo "🔍 Testing analysis endpoint..."
TEST_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
ANALYSIS_RESPONSE=$(curl -s -X POST http://localhost:8080/analyze \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$TEST_URL\"}")

if [ $? -eq 0 ]; then
    echo "✅ Analysis request submitted"
    echo "   Response: $ANALYSIS_RESPONSE"
    
    # Extract jobId from response
    JOB_ID=$(echo $ANALYSIS_RESPONSE | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)
    echo "   Job ID: $JOB_ID"
    
    if [ ! -z "$JOB_ID" ]; then
        echo ""
        echo "⏳ Waiting for analysis to complete..."
        sleep 5
        
        # Check result
        echo "📊 Checking results..."
        RESULT_RESPONSE=$(curl -s http://localhost:8080/result/$JOB_ID)
        echo "   Result: $RESULT_RESPONSE"
        
        # Check if completed
        if echo "$RESULT_RESPONSE" | grep -q '"status":"completed"'; then
            echo "✅ Analysis completed successfully!"
        else
            echo "⏳ Analysis still in progress or failed"
        fi
    fi
else
    echo "❌ Analysis request failed"
fi

echo ""
echo "🏁 Test suite completed!"
