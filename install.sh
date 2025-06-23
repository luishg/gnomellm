#!/bin/bash

# GnomeLLM Extension Installation Script
# This script installs the GnomeLLM extension for GNOME Shell

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extension details
EXTENSION_UUID="GnomeLLM@luishg.github.io"
EXTENSION_NAME="GnomeLLM"
EXTENSIONS_DIR="$HOME/.local/share/gnome-shell/extensions"
EXTENSION_DIR="$EXTENSIONS_DIR/$EXTENSION_UUID"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get GNOME Shell version
get_gnome_version() {
    gnome-shell --version | grep -oP '\d+\.\d+' | head -1
}

# Function to check GNOME Shell compatibility
check_gnome_compatibility() {
    if ! command_exists gnome-shell; then
        print_error "GNOME Shell is not installed or not in PATH"
        return 1
    fi
    
    local version
    version=$(get_gnome_version)
    local major_version
    major_version=$(echo "$version" | cut -d. -f1)
    
    if [ "$major_version" -lt 40 ]; then
        print_error "GNOME Shell version $version is not supported. Minimum version is 40."
        return 1
    fi
    
    print_success "GNOME Shell version $version is supported"
    return 0
}

# Function to check if Ollama is available
check_ollama() {
    if command_exists ollama; then
        print_success "Ollama is installed"
        
        # Check if Ollama server is running
        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
            print_success "Ollama server is running"
        else
            print_warning "Ollama server is not running. You can start it with: ollama serve"
        fi
    else
        print_warning "Ollama is not installed. Install it from https://ollama.ai"
    fi
}

# Function to create extension directory
create_extension_dir() {
    print_status "Creating extension directory..."
    
    # Create extensions directory if it doesn't exist
    mkdir -p "$EXTENSIONS_DIR"
    
    # Remove existing extension if it exists
    if [ -d "$EXTENSION_DIR" ]; then
        print_warning "Removing existing extension installation..."
        rm -rf "$EXTENSION_DIR"
    fi
    
    # Create new extension directory
    mkdir -p "$EXTENSION_DIR"
    print_success "Extension directory created: $EXTENSION_DIR"
}

# Function to copy extension files
copy_extension_files() {
    print_status "Copying extension files..."
    
    # List of files to copy
    local files=(
        "extension.js"
        "prefs.js"
        "metadata.json"
        "stylesheet.css"
        "COPYING"
    )
    
    # Copy main files
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            cp "$file" "$EXTENSION_DIR/"
            print_status "Copied $file"
        else
            print_error "Required file $file not found!"
            return 1
        fi
    done
    
    # Copy directories
    local dirs=(
        "lib"
        "schemas"
        "assets"
    )
    
    for dir in "${dirs[@]}"; do
        if [ -d "$dir" ]; then
            cp -r "$dir" "$EXTENSION_DIR/"
            print_status "Copied $dir/ directory"
        else
            print_error "Required directory $dir not found!"
            return 1
        fi
    done
    
    print_success "All extension files copied successfully"
    ls -lR "$EXTENSION_DIR"
}

# Function to compile GSettings schemas
compile_schemas() {
    print_status "Compiling GSettings schemas..."
    
    if [ -d "$EXTENSION_DIR/schemas" ]; then
        if command_exists glib-compile-schemas; then
            glib-compile-schemas "$EXTENSION_DIR/schemas/"
            print_success "GSettings schemas compiled successfully"
        else
            print_error "glib-compile-schemas not found. Please install glib2-devel or libglib2.0-dev"
            return 1
        fi
    else
        print_error "Schemas directory not found"
        return 1
    fi
}

# Function to enable extension
enable_extension() {
    print_status "Enabling extension..."
    
    if command_exists gnome-extensions; then
        # Check if extension is already enabled
        if gnome-extensions list --enabled | grep -q "$EXTENSION_UUID"; then
            print_status "Extension is already enabled"
        else
            gnome-extensions enable "$EXTENSION_UUID"
            print_success "Extension enabled successfully"
        fi
    else
        print_warning "gnome-extensions command not found. Please enable the extension manually."
        print_status "You can enable it from GNOME Extensions app or run:"
        print_status "gnome-extensions enable $EXTENSION_UUID"
    fi
}

# Function to restart GNOME Shell (for X11 only)
restart_gnome_shell() {
    if [ "$XDG_SESSION_TYPE" = "x11" ]; then
        print_status "Restarting GNOME Shell (X11 session detected)..."
        print_status "Press Alt+F2, type 'r', and press Enter to restart GNOME Shell"
        print_status "Or you can logout and login again"
    else
        print_status "Wayland session detected. Please logout and login to reload the extension"
    fi
}

# Function to show post-installation instructions
show_instructions() {
    echo
    print_success "=== GnomeLLM Extension Installation Complete! ==="
    echo
    echo "Next steps:"
    echo "1. 🔄 Restart GNOME Shell or logout/login"
    echo "2. 🤖 Make sure Ollama is running: ollama serve"
    echo "3. 📥 Pull some models: ollama pull llama3.2"
    echo "4. ⚙️  Configure the extension: Right-click panel icon → Settings"
    echo "5. 💬 Start chatting: Click panel icon or use Super+Shift+Space"
    echo
    echo "Troubleshooting:"
    echo "- Check extension status: gnome-extensions list --enabled | grep '$EXTENSION_UUID'"
    echo "- View logs: journalctl -f -o cat /usr/bin/gnome-shell"
    echo "- Extension directory: $EXTENSION_DIR"
    echo
    print_success "Happy chatting with your local LLMs! 🚀"
}

# Main installation function
main() {
    echo
    print_status "=== GnomeLLM Extension Installer ==="
    echo
    
    # Check if we're in the right directory
    if [ ! -f "metadata.json" ] || [ ! -f "extension.js" ]; then
        print_error "Please run this script from the GnomeLLM extension directory"
        exit 1
    fi
    
    # Check system compatibility
    print_status "Checking system compatibility..."
    if ! check_gnome_compatibility; then
        exit 1
    fi
    
    # Check Ollama availability
    check_ollama
    
    # Install extension
    create_extension_dir
    copy_extension_files
    compile_schemas
    enable_extension
    
    # Show instructions
    restart_gnome_shell
    show_instructions
    
    exit 0
}

# Handle script interruption
trap 'print_error "Installation interrupted"; exit 1' INT TERM

# Run main function
main "$@" 