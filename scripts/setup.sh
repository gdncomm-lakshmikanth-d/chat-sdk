#!/bin/bash

echo "🚀 OpsPilot Chat SDK Setup"
echo "=========================="

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

echo "📦 Installing dependencies..."
pnpm install

echo "🏗️  Building packages..."
pnpm build

echo "🧪 Running tests..."
pnpm test --run

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  - Run 'pnpm example' to see the live demo"
echo "  - Run 'pnpm test --watch' for development testing"
echo "  - Run 'pnpm dev' to build packages in watch mode"