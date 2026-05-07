#!/bin/bash

# Chat SDK Cleanup and Restart Script
echo "🧹 Cleaning up existing processes and ports..."

# Kill all Node.js processes that might be running dev servers
echo "Killing dev server processes..."
pkill -f "vite" 2>/dev/null || true
pkill -f "tsup" 2>/dev/null || true
pkill -f "pnpm.*dev" 2>/dev/null || true

# Kill processes on common dev ports (5173-5180)
echo "Freeing up ports 5173-5180..."
for port in {5173..5180}; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Killing process $pid on port $port"
        kill -9 $pid 2>/dev/null || true
    fi
done

# Wait a bit for processes to clean up
echo "Waiting for cleanup to complete..."
sleep 2

# Clean build artifacts
echo "🏗️  Cleaning build artifacts..."
rm -rf packages/@opspilot/chat-core/dist
rm -rf packages/@opspilot/chat-react/dist
rm -rf examples/basic-react/dist

# Fresh build
echo "🔨 Building packages..."
npm run build

# Start dev server in background and capture output
echo "🚀 Starting fresh development server..."
npm run dev > /tmp/chat-sdk-dev.log 2>&1 &
DEV_PID=$!

# Wait for server to start and extract port
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
    if grep -q "Local:" /tmp/chat-sdk-dev.log 2>/dev/null; then
        PORT=$(grep "Local:" /tmp/chat-sdk-dev.log | grep -o "localhost:[0-9]*" | cut -d: -f2 | head -1)
        if [ ! -z "$PORT" ]; then
            echo "✅ Server started on port $PORT"
            URL="http://localhost:$PORT"
            echo "🌐 Opening $URL in Chrome..."
            
            # Try different ways to open Chrome depending on OS
            if command -v google-chrome &> /dev/null; then
                google-chrome "$URL" &
            elif command -v chrome &> /dev/null; then
                chrome "$URL" &
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                open -a "Google Chrome" "$URL" &
            elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
                google-chrome "$URL" &> /dev/null &
            else
                echo "⚠️  Could not auto-open Chrome. Please open: $URL"
            fi
            
            echo "🎉 Chat SDK is running at: $URL"
            break
        fi
    fi
    sleep 1
done

# If we couldn't detect the port, still show the log
if [ -z "$PORT" ]; then
    echo "⚠️  Could not detect server port. Check the output:"
    cat /tmp/chat-sdk-dev.log
fi

# Keep the dev server running in foreground
wait $DEV_PID