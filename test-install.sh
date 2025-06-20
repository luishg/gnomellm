#!/bin/bash

# GnomeLLM Extension Test Installation Script
# This script tests the extension installation and basic functionality

set -e

echo "🔧 GnomeLLM Extension Test Installation"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "metadata.json" ]; then
    echo "❌ Error: metadata.json not found. Run this script from the extension directory."
    exit 1
fi

# Get the UUID from metadata.json
UUID=$(grep -o '"uuid": *"[^"]*"' metadata.json | sed 's/"uuid": *"\([^"]*\)"/\1/')
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "📦 Extension UUID: $UUID"
echo "📁 Target directory: $EXTENSION_DIR"

# Create extension directory if it doesn't exist
mkdir -p "$EXTENSION_DIR"

# Copy files
echo "📋 Copying extension files..."
cp -r * "$EXTENSION_DIR/"

# Compile schemas
echo "🛠️  Compiling GSettings schemas..."
glib-compile-schemas "$EXTENSION_DIR/schemas/"

# Check if GNOME Shell is running
if pgrep -x "gnome-shell" > /dev/null; then
    echo "🔄 GNOME Shell is running"
    
    # Try to enable the extension
    echo "✅ Enabling extension..."
    gnome-extensions enable "$UUID" || echo "⚠️  Could not enable extension automatically"
    
    echo "🔄 Reloading GNOME Shell..."
    echo "   Press Alt+F2, type 'r' and press Enter to reload GNOME Shell"
    echo "   Or log out and log back in"
else
    echo "❌ GNOME Shell is not running"
    echo "   Please start GNOME Shell and then enable the extension with:"
    echo "   gnome-extensions enable $UUID"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "To test the extension:"
echo "1. Open GNOME Extensions app"
echo "2. Find 'GnomeLLM' and ensure it's enabled"
echo "3. Look for the smiley face icon in the top panel"
echo "4. Click it and select 'Settings' to configure Ollama"
echo "5. Use the hotkey (Super+Shift+Space) to open the chat window"
echo ""
echo "Debugging:"
echo "- Check logs with: journalctl -f -o cat /usr/bin/gnome-shell"
echo "- Or use: journalctl --user -f | grep -i gnomellm"
echo ""
echo "If there are issues, check the console output in the extension settings." 