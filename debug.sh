#!/bin/bash

# GnomeLLM Extension Debug Script
# This script helps debug extension issues

echo "🐛 GnomeLLM Extension Debug Information"
echo "======================================="

# Get the UUID from metadata.json
UUID=$(grep -o '"uuid": *"[^"]*"' metadata.json | sed 's/"uuid": *"\([^"]*\)"/\1/')
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "📦 Extension UUID: $UUID"
echo "📁 Extension directory: $EXTENSION_DIR"

# Check if extension directory exists
if [ -d "$EXTENSION_DIR" ]; then
    echo "✅ Extension directory exists"
    
    # List files in extension directory
    echo ""
    echo "📂 Extension files:"
    ls -la "$EXTENSION_DIR/"
    
    # Check if schemas are compiled
    if [ -f "$EXTENSION_DIR/schemas/gschemas.compiled" ]; then
        echo "✅ GSettings schemas are compiled"
    else
        echo "❌ GSettings schemas are NOT compiled"
        echo "   Run: glib-compile-schemas $EXTENSION_DIR/schemas/"
    fi
else
    echo "❌ Extension directory does not exist"
    echo "   Run the test-install.sh script first"
fi

echo ""
echo "🔍 Extension status:"
gnome-extensions info "$UUID" 2>/dev/null || echo "❌ Extension not found by gnome-extensions"

echo ""
echo "🔍 GNOME Shell version:"
gnome-shell --version

echo ""
echo "🔍 Available extensions:"
gnome-extensions list

echo ""
echo "📋 Recent GNOME Shell logs (last 50 lines):"
echo "============================================"
journalctl --user -n 50 | grep -i gnomellm || echo "No GnomeLLM logs found"

echo ""
echo "🔄 To view live logs, run:"
echo "   journalctl --user -f | grep -i gnomellm"
echo ""
echo "🔧 To reload GNOME Shell:"
echo "   Alt+F2 -> type 'r' -> Enter"
echo "   Or: killall -SIGUSR1 gnome-shell"
echo ""
echo "🛠️  To reinstall the extension:"
echo "   ./test-install.sh" 