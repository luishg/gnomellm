# GnomeLLM Extension - Usage Guide

## 🚀 Quick Start

### 1. Installation
```bash
# Run the test installation script
./test-install.sh

# Reload GNOME Shell (Alt+F2, type 'r', press Enter)
# Or log out and log back in
```

### 2. Enable the Extension
1. Open **GNOME Extensions** app (or go to https://extensions.gnome.org/local/)
2. Find **GnomeLLM** in the list
3. Toggle it **ON**

### 3. Setup Ollama
Before using the extension, make sure Ollama is installed and running:

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull a model (in another terminal)
ollama pull llama3.2
# or
ollama pull mistral
```

### 4. Configure the Extension
1. Click the **😊 smiley face icon** in the top panel
2. Select **Settings**
3. Configure:
   - **Ollama Server URL**: Usually `http://localhost:11434`
   - **Test Connection** to verify it works
   - **Refresh Model List** to load available models
   - **Select your preferred model**
   - **Set hotkey** (default: Super+Shift+Space)

## 🎯 Using the Extension

### Opening the Chat Window
- Press the configured hotkey (default: **Super+Shift+Space**)
- Or click the smiley face icon → **Open Chat**

### Chat Features
- Type your message and press **Enter** to send
- **Ctrl+Enter** also works to send messages
- **Escape** key closes the chat window
- Supports basic markdown formatting:
  - \`inline code\`
  - **bold text**
  - *italic text*
  - ```code blocks```

### Streaming Responses
The extension supports real-time streaming responses from Ollama, so you'll see the AI response appear token by token as it's generated.

## 🐛 Troubleshooting

### Extension Not Showing Up
```bash
# Run the debug script
./debug.sh

# Check if extension is properly installed
gnome-extensions list | grep gnomellm

# Reload GNOME Shell
# Alt+F2 → type 'r' → Enter
```

### Connection Issues
1. Make sure Ollama is running: `ps aux | grep ollama`
2. Test manually: `curl http://localhost:11434/api/tags`
3. Check the server URL in extension settings
4. Try the "Test Connection" button in settings

### Chat Window Not Opening
1. Check the logs: `journalctl --user -f | grep -i gnomellm`
2. Make sure at least one model is installed in Ollama
3. Verify the selected model exists: `ollama list`

### No Models Found
```bash
# Pull some models
ollama pull llama3.2
ollama pull mistral
ollama pull codellama

# Refresh models in extension settings
```

## 📊 Logs and Debugging

### View Extension Logs
```bash
# Real-time logs
journalctl --user -f | grep -i gnomellm

# Recent logs
journalctl --user -n 100 | grep -i gnomellm
```

### GNOME Shell Logs
```bash
# All GNOME Shell logs
journalctl -f -o cat /usr/bin/gnome-shell

# Or check in the system
journalctl --user -f
```

## ⚙️ Advanced Configuration

The extension supports additional settings in the preferences:
- **Theme**: Auto, Light, or Dark mode
- **Font Size**: Adjust chat text size
- **Window Size**: Set default window dimensions
- **Stream Response**: Enable/disable real-time streaming

## 🔧 Manual Installation

If the automatic script doesn't work:

```bash
# Create extension directory
UUID="gnomellm@localhost"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions/$UUID"
mkdir -p "$EXT_DIR"

# Copy files
cp -r * "$EXT_DIR/"

# Compile schemas
glib-compile-schemas "$EXT_DIR/schemas/"

# Enable extension
gnome-extensions enable "$UUID"

# Reload GNOME Shell
# Alt+F2 → 'r' → Enter
```

## 📋 Requirements

- **GNOME Shell**: 40, 41, 42, 43, 44, 45, 46, 47, 48+
- **Ollama**: Latest version with at least one model
- **System**: Linux with GNOME desktop environment

## 🆘 Getting Help

If you encounter issues:
1. Run `./debug.sh` and share the output
2. Check the logs with the commands above
3. Verify Ollama is working: `ollama list` and `ollama run llama3.2 "test"`
4. Make sure your GNOME Shell version is supported

The extension has extensive logging, so most issues can be diagnosed from the logs. 