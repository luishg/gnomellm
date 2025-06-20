# GnomeLLM - Chat with Local LLMs from GNOME Desktop

A modern GNOME Shell extension that provides seamless access to local LLM models through Ollama directly from your desktop. Features a beautiful, semi-transparent chat interface similar to macOS Spotlight.

By Luis Hernandez @luishg

![GnomeLLM Screenshot](https://via.placeholder.com/800x500/2d3748/ffffff?text=GnomeLLM+Chat+Interface)

## 🚀 Features

### Core Functionality
- **🤖 Ollama Integration**: Chat with any Ollama model (Llama3, Phi3, Mistral, Gemma, etc.)
- **⌨️ Global Hotkey**: Quick access with customizable keyboard shortcut (default: Super+Shift+Space)
- **🎯 Quick Access**: Panel icon for instant chat access
- **🔄 Model Switching**: Easy on-the-fly model switching
- **💬 Conversation History**: Persistent chat sessions

### Modern Interface
- **✨ Semi-transparent Design**: Beautiful blur effects and modern styling
- **🌓 Theme Support**: Auto, Light, and Dark themes
- **📱 Responsive Layout**: Adapts to different screen sizes
- **🎨 Customization**: Font size, transparency, user names, and more
- **📍 Flexible Positioning**: Centered or sidebar mode

### Advanced Features
- **📝 Markdown Support**: Proper formatting for code blocks, lists, and emphasis
- **⚡ Token Streaming**: Real-time response generation
- **🔧 Settings Panel**: Comprehensive configuration options
- **🎛️ Multiple Models**: Automatic model detection and management

## 📋 Requirements

- **GNOME Shell**: 40, 41, 42, 43, 44, or 45
- **Ollama**: Running locally (usually on `localhost:11434`)
- **Linux Distribution**: Any modern Linux distro with GNOME

### Supported LLM Models
- Llama 3.2, 3.1, 3, 2
- Phi-3 (Mini, Small, Medium)
- Mistral 7B, Mixtral 8x7B
- Gemma 2B, 7B
- CodeLlama variants
- Any other Ollama-compatible model

## 🛠️ Installation

### Method 1: Quick Install Script
```bash
# Clone the repository
git clone https://github.com/gnomellm/gnomellm.git
cd gnomellm

# Run the install script
chmod +x install.sh
./install.sh
```

### Method 2: Manual Installation
```bash
# Create extension directory
mkdir -p ~/.local/share/gnome-shell/extensions/gnomellm@localhost

# Copy extension files
cp -r * ~/.local/share/gnome-shell/extensions/gnomellm@localhost/

# Compile GSettings schema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/gnomellm@localhost/schemas/

# Restart GNOME Shell (Alt+F2, type 'r', press Enter)
# Or logout/login

# Enable the extension
gnome-extensions enable gnomellm@localhost
```

### Method 3: Development Setup
```bash
# Clone and setup for development
git clone https://github.com/gnomellm/gnomellm.git
cd gnomellm

# Install in development mode
make install-dev

# View logs for debugging
make logs
```

## ⚙️ Setup & Configuration

### 1. Install and Start Ollama
```bash
# Install Ollama (see https://ollama.ai)
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull a model (in another terminal)
ollama pull llama3.2
ollama pull phi3
```

### 2. Configure GnomeLLM
1. **Open Settings**: Right-click the panel icon → Settings
2. **Set Ollama URL**: Usually `http://localhost:11434`
3. **Test Connection**: Click "Test" button to verify connectivity
4. **Refresh Models**: Click "Refresh" to load available models
5. **Select Model**: Choose your preferred model from the dropdown
6. **Customize Interface**: Adjust theme, font size, transparency, etc.

### 3. Set Hotkey (Optional)
- In Settings → Interface → Chat Hotkey
- Click the hotkey button and press your desired key combination
- Default: `Super+Shift+Space`

## 🎮 Usage

### Opening the Chat
- **Panel Icon**: Click the smile icon in the top panel
- **Hotkey**: Press your configured hotkey combination
- **Menu**: Right-click panel icon → Open Chat

### Chat Interface
- **Type & Send**: Type your message and press Enter
- **New Line**: Use Shift+Enter for multi-line input
- **Model Switch**: Click the model name in the header to cycle through models
- **Clear Chat**: Click the clear icon to start fresh
- **Sidebar Mode**: Click the dual-pane icon to dock to the side
- **Close**: Click X, press Escape, or click outside

### Model Management
- Models are automatically detected from your Ollama installation
- Use the dropdown in settings or click the model name in chat to switch
- Refresh the models list if you install new ones

## 🔧 Configuration Options

### Ollama Settings
- **Server URL**: Ollama server endpoint (default: `http://localhost:11434`)
- **Current Model**: Active LLM model for conversations
- **Available Models**: Auto-detected list of installed models

### Interface Settings
- **Theme**: Auto (system), Light, or Dark
- **Font Size**: 8-24px for chat text
- **Transparency**: 0.1-1.0 (transparent to opaque)
- **Hotkey**: Customizable keyboard shortcut

### Chat Settings
- **User Name**: Display name for your messages
- **Assistant Name**: Display name for AI responses
- **Header Text**: Custom title for the chat window
- **Stream Response**: Enable/disable token-by-token streaming
- **Sidebar Mode**: Keep chat docked to the side

## 🎨 Themes & Customization

### Built-in Themes
- **Auto Theme**: Follows system preference
- **Light Theme**: Clean, bright interface
- **Dark Theme**: Modern dark interface with blue accents

### Custom Styling
The extension uses CSS classes for easy customization:
```css
/* Main window */
.gnomellm-chat-window { }

/* Messages */
.gnomellm-user-message { }
.gnomellm-assistant-message { }

/* Input area */
.gnomellm-input-entry { }
.gnomellm-send-button { }
```

## 🔍 Troubleshooting

### Extension Not Loading
```bash
# Check extension status
gnome-extensions list --enabled | grep gnomellm

# Enable manually
gnome-extensions enable gnomellm@localhost

# Check for errors
journalctl -f -o cat /usr/bin/gnome-shell
```

### Ollama Connection Issues
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve

# Check firewall/port access
ss -tulpn | grep 11434
```

### Model Not Responding
1. Verify model is pulled: `ollama list`
2. Test model directly: `ollama run llama3.2 "Hello"`
3. Check Ollama logs: `ollama logs`
4. Restart Ollama service

### Performance Issues
- **Reduce Model Size**: Use smaller models (7B instead of 70B)
- **Adjust Streaming**: Disable streaming for slower systems
- **Lower Transparency**: Reduce blur effects
- **Close Other Apps**: Free up system resources

## 🧩 Development

### Project Structure
```
gnomellm/
├── extension.js          # Main extension entry point
├── prefs.js             # Settings/preferences UI
├── metadata.json        # Extension metadata
├── stylesheet.css       # UI styles and themes
├── schemas/             # GSettings configuration schema
├── lib/                 # Core modules
│   ├── chatWindow.js    # Chat interface logic
│   ├── ollamaClient.js  # Ollama API client
│   └── markdownRenderer.js # Markdown formatting
├── install.sh           # Installation script
├── Makefile            # Development utilities
└── README.md           # This file
```

### Building & Testing
```bash
# Install in development mode
make install-dev

# View real-time logs
make logs

# Package for distribution
make package

# Clean build artifacts
make clean
```

### Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add feature X"`
5. Push and create a Pull Request

## 📄 License

This project is licensed under the GPL-2.0-or-later License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama Team** - For creating an amazing local LLM platform
- **GNOME Project** - For the excellent desktop environment and extension APIs
- **LLM Communities** - For developing incredible open-source models

## 🔗 Links

- **Repository**: https://github.com/gnomellm/gnomellm
- **Issues**: https://github.com/gnomellm/gnomellm/issues
- **Ollama**: https://ollama.ai
- **GNOME Extensions**: https://extensions.gnome.org

## 📊 Compatibility

| GNOME Shell | Status | Notes |
|-------------|--------|-------|
| 45.x        | ✅ Supported | Latest stable |
| 44.x        | ✅ Supported | LTS version |
| 43.x        | ✅ Supported | |
| 42.x        | ✅ Supported | |
| 41.x        | ✅ Supported | |
| 40.x        | ✅ Supported | Minimum version |

---

**Made with ❤️ for the GNOME and AI communities** 