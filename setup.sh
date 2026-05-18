#!/bin/bash

echo "🔐 SAML Inspector - Setup Script"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies — root install cascades into client/ via the
# postinstall hook in package.json, so one `npm install` covers both.
echo "📦 Installing dependencies (server + client)..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file with your Curity Identity Server settings"
    echo "   Required configuration:"
    echo "   - SAML_ENTRY_POINT: Your Curity SAML IDP endpoint"
    echo "   - SAML_IDP_CERT: Your Curity IDP public certificate"
    echo "   - SESSION_SECRET: A random secret string"
else
    echo "ℹ️  .env file already exists, skipping..."
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Curity Identity Server configuration"
echo "2. Run 'npm run dev' to start the application"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For more information, see README.md"
