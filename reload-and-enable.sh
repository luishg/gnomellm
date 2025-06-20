#!/bin/bash

# GnomeLLM Extension Reload and Enable Script
# This script reloads GNOME Shell and enables the extension

set -e

echo "🔄 GnomeLLM Extension Reload and Enable"
echo "======================================"

UUID="gnomellm@localhost"

echo "📦 Extension UUID: $UUID"

# Check if extension directory exists
if [ ! -d "$HOME/.local/share/gnome-shell/extensions/$UUID" ]; then
    echo "❌ Extension directory not found. Run ./test-install.sh first."
    exit 1
fi

echo "✅ Extension files found"

# Check if we're in a GNOME Shell session
if [ "$XDG_SESSION_TYPE" = "wayland" ] || [ "$XDG_SESSION_TYPE" = "x11" ]; then
    echo "🖥️  Detected session type: $XDG_SESSION_TYPE"
    
    # For Wayland, we need to restart GNOME Shell differently
    if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
        echo "⚠️  Wayland session detected"
        echo "   You need to log out and log back in for the extension to be detected"
        echo "   OR run the following command in a terminal:"
        echo "   pkill -f gnome-shell && gnome-shell --replace --wayland &"
        echo ""
        echo "   After reloading, run this script again to enable the extension"
        
        # Check if extension is already available
        if gnome-extensions list | grep -q "$UUID"; then
            echo "✅ Extension is already detected!"
        else
            echo "❌ Extension not detected yet - reload GNOME Shell first"
            exit 1
        fi
    else
        # X11 session - we can reload GNOME Shell
        echo "🔄 Reloading GNOME Shell (X11 session)..."
        
        # Method 1: Try busctl restart
        echo "   Attempting to restart GNOME Shell..."
        busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting GNOME Shell for extension reload")' 2>/dev/null || {
            echo "   Busctl restart failed, trying alternative method..."
            
            # Method 2: Try direct restart
            nohup gnome-shell --replace > /dev/null 2>&1 &
            sleep 3
        }
    fi
else
    echo "❌ Not running in a GNOME Shell session"
    exit 1
fi

# Wait a moment for GNOME Shell to reload
echo "⏳ Waiting for GNOME Shell to reload..."
sleep 5

# Check if extension is now available
echo "🔍 Checking if extension is detected..."
if gnome-extensions list | grep -q "$UUID"; then
    echo "✅ Extension detected!"
    
    # Try to enable the extension
    echo "🔧 Enabling extension..."
    if gnome-extensions enable "$UUID"; then
        echo "✅ Extension enabled successfully!"
        echo ""
        echo "🎉 Extension is now active!"
        echo "   Look for the 😊 smiley face icon in the top panel"
        echo "   Click it to access the menu"
        echo "   Use Super+Shift+Space to open the chat window"
        
        # Show extension status
        echo ""
        echo "📊 Extension status:"
        gnome-extensions info "$UUID"
    else
        echo "❌ Failed to enable extension"
        echo "   Try enabling it manually from GNOME Extensions app"
    fi
else
    echo "❌ Extension still not detected"
    echo ""
    echo "Manual steps to try:"
    echo "1. Log out and log back in"
    echo "2. Or press Alt+F2, type 'r', press Enter"
    echo "3. Open GNOME Extensions app"
    echo "4. Look for 'GnomeLLM' in the list"
    echo "5. Toggle it ON"
    echo ""
    echo "If still not working, check logs:"
    echo "   journalctl --user -f | grep -i gnome"
fi 