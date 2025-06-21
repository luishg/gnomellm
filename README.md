# GnomeLLM

A GNOME Shell extension for quick access to local large language models via Ollama, right from your desktop.

By Luis Hernandez ([@luishg on Twitter](https://twitter.com/luishg) | [Website](https://www.luishg.com) | [GitHub](https://github.com/luishg))

![GnomeLLM Screenshot](https://raw.githubusercontent.com/luishg/gnomellm/main/screenshot.png)

## Features

- **Direct Ollama Integration**: Chat with any model managed by your local Ollama instance (Llama3, Phi-3, Gemma, etc.).
- **Global Hotkey**: Open the chat window from anywhere with a customizable keyboard shortcut.
- **Panel Indicator**: A simple icon in the top panel for quick mouse access.
- **On-the-Fly Model Switching**: Change the active LLM directly from the chat window header.
- **Markdown Rendering**: Responses are properly formatted, with support for code blocks, lists, and text styles.
- **Streaming Responses**: Get real-time, token-by-token answers from the model.
- **Settings Panel**: A straightforward panel to configure the extension, server, and appearance.

## Requirements

- **GNOME Shell**: Version 40 through 45.
- **Ollama**: A running instance of the Ollama server.
- **A modern Linux distribution** with GNOME.

## Installation

### Quick Install Script
This is the recommended method for most users.
```bash
# Clone the repository
git clone https://github.com/luishg/gnomellm.git
cd gnomellm

# Run the installation script
chmod +x install.sh
./install.sh
```

### Manual Installation
For those who prefer a manual setup.
```bash
# Create the extension directory
mkdir -p ~/.local/share/gnome-shell/extensions/gnomellm@localhost

# Copy extension files
cp -r . ~/.local/share/gnome-shell/extensions/gnomellm@localhost/

# Compile the GSettings schema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/gnomellm@localhost/schemas/

# Restart GNOME Shell (Press Alt+F2, type 'r', and press Enter) or log out and back in.

# Enable the extension via the Extensions app or command line
gnome-extensions enable gnomellm@localhost
```

## Setup and Configuration

1.  **Install and Run Ollama**: Follow the instructions at [ollama.ai](https://ollama.ai) to install the server.
2.  **Pull a Model**: Open a terminal and run `ollama pull llama3` (or any other model you prefer).
3.  **Configure the Extension**:
    - Open the extension's settings via the panel indicator's context menu.
    - Ensure the **Server URL** is correct (usually `http://localhost:11434`).
    - Use the **Test** button to confirm the connection.
    - Click **Refresh** to detect your pulled models.
    - Select a default model from the dropdown.

## Usage

- **Open the Chat Window**: Use the panel icon or your configured hotkey.
- **Send a Message**: Type your prompt and press `Enter`. Use `Shift+Enter` for new lines.
- **Switch Models**: Click the model name in the chat header to open the selector. A new chat will start when you switch models.
- **Start a New Chat**: Click the "New Chat" button in the header.
- **Close**: Press `Escape`, click the `X` button, or click outside the window.

## Configuration Options

- **Server URL**: The endpoint for your Ollama server.
- **Current Model**: Your default model for new conversations.
- **Theme**: Dark theme is enabled by default. Light theme support is currently in development.
- **Hotkey**: Set a custom keyboard shortcut to toggle the chat window.
- **Header Text**: Customize the title of the chat window.
- **Stream Response**: Toggle real-time streaming of model responses.

## Troubleshooting

### Extension Not Loading or Errors
Check for logs to diagnose the issue.
```bash
# See if the extension is enabled
gnome-extensions list --enabled | grep gnomellm

# View GNOME Shell logs
journalctl -f -o cat /usr/bin/gnome-shell
```

### Ollama Connection Issues
```bash
# Check if the Ollama server is running and accessible
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve
```

## Development

The project is structured for straightforward development. Key files include:

-   `extension.js`: Main extension entry point.
-   `prefs.js`: Settings UI.
-   `lib/chatWindow.js`: The core chat interface logic.
-   `lib/ollamaClient.js`: The client for the Ollama API.
-   `stylesheet.css`: All UI styling.

### Development Commands
```bash
# Install with a symbolic link for live development
make install-dev

# View real-time logs from the extension
make logs

# Create a distributable package
make package
```

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request.

## License

This project is licensed under the GPL-2.0-or-later.

## Acknowledgments

- The **Ollama Team** for their fantastic work on local LLM serving.
- The **GNOME Project** for a powerful and extensible desktop environment.
- The open-source AI community.

## 🔗 Links

- **Repository**: https://github.com/luishg/gnomellm
- **Issues**: https://github.com/luishg/gnomellm/issues
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