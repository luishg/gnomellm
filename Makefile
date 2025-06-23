# Makefile for GnomeLLM Extension Development

# Extension details
EXTENSION_UUID = GnomeLLM@luishg.github.io
EXTENSION_NAME = GnomeLLM
EXTENSIONS_DIR = $(HOME)/.local/share/gnome-shell/extensions
# Use a development-specific UUID for local installation to avoid conflicts
DEV_EXTENSION_UUID = gnomellm@localhost
DEV_EXTENSION_DIR = $(EXTENSIONS_DIR)/$(DEV_EXTENSION_UUID)

# Source files
SOURCES = extension.js prefs.js metadata.json stylesheet.css COPYING
SCHEMA_FILES = schemas/org.gnome.shell.extensions.gnomellm.gschema.xml
LIB_FILES = lib/chatWindow.js lib/ollamaClient.js lib/markdownRenderer.js
ASSET_FILES = assets/GnomeLLM_icon.png

# Build directory
BUILD_DIR = build
PACKAGE_NAME = $(EXTENSION_UUID).zip

.PHONY: all install install-dev uninstall clean package logs restart enable disable status help

# Default target
all: help

# Install extension (production)
install:
	@echo "Installing GnomeLLM extension..."
	@mkdir -p $(DEV_EXTENSION_DIR)
	@cp -r $(SOURCES) lib schemas assets $(DEV_EXTENSION_DIR)/
	@glib-compile-schemas $(DEV_EXTENSION_DIR)/schemas/
	@echo "Installation complete. Please restart GNOME Shell."

# Install extension (development mode with symlinks)
install-dev:
	@echo "Installing GnomeLLM extension in development mode..."
	@mkdir -p $(EXTENSIONS_DIR)
	@rm -rf $(DEV_EXTENSION_DIR)
	@ln -sf $(PWD) $(DEV_EXTENSION_DIR)
	@glib-compile-schemas $(DEV_EXTENSION_DIR)/schemas/
	@echo "Development installation complete."
	@echo "Extension is symlinked to $(DEV_EXTENSION_DIR)"

# Uninstall extension
uninstall:
	@echo "Uninstalling GnomeLLM extension..."
	@rm -rf $(DEV_EXTENSION_DIR)
	@echo "Uninstallation complete."

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BUILD_DIR)
	@rm -f $(PACKAGE_NAME)
	@rm -f schemas/gschemas.compiled
	@echo "Clean complete."

# Create distribution package
package: clean
	@echo "Creating distribution package with UUID: $(EXTENSION_UUID)"
	@mkdir -p $(BUILD_DIR)/$(EXTENSION_UUID)
	@cp -r $(SOURCES) lib schemas assets $(BUILD_DIR)/$(EXTENSION_UUID)/
	@# The gschemas.compiled file is not needed in the package
	@rm -f $(BUILD_DIR)/$(EXTENSION_UUID)/schemas/gschemas.compiled
	@cd $(BUILD_DIR)/$(EXTENSION_UUID) && zip -r ../../$(PACKAGE_NAME) .
	@echo "Package created: $(PACKAGE_NAME)"

# Show extension logs
logs:
	@echo "Showing GNOME Shell logs (Ctrl+C to stop)..."
	@journalctl -f -o cat /usr/bin/gnome-shell | grep -i gnomellm || \
	 journalctl -f -o cat /usr/bin/gnome-shell

# Restart GNOME Shell (X11 only)
restart:
	@if [ "$(XDG_SESSION_TYPE)" = "x11" ]; then \
		echo "Restarting GNOME Shell..."; \
		busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'global.relaunch_shell()'; \
	else \
		echo "Wayland session detected. Please logout and login to restart GNOME Shell."; \
	fi

# Enable extension
enable:
	@echo "Enabling GnomeLLM extension..."
	@gnome-extensions enable $(DEV_EXTENSION_UUID)
	@echo "Extension enabled."

# Disable extension
disable:
	@echo "Disabling GnomeLLM extension..."
	@gnome-extensions disable $(DEV_EXTENSION_UUID)
	@echo "Extension disabled."

# Show extension status
status:
	@echo "Extension status:"
	@gnome-extensions list --enabled | grep $(DEV_EXTENSION_UUID) && echo "✅ Enabled" || echo "❌ Disabled"
	@echo "\nExtension info:"
	@gnome-extensions info $(DEV_EXTENSION_UUID) 2>/dev/null || echo "Extension not found"

# Development workflow shortcuts
dev-install: install-dev enable
	@echo "Development setup complete!"

dev-reload: disable enable
	@echo "Extension reloaded for development."

dev-logs: logs

# Check extension files
check:
	@echo "Checking extension files..."
	@for file in $(SOURCES); do \
		if [ -f $$file ]; then \
			echo "✅ $$file"; \
		else \
			echo "❌ $$file (missing)"; \
		fi; \
	done
	@for file in $(LIB_FILES); do \
		if [ -f $$file ]; then \
			echo "✅ $$file"; \
		else \
			echo "❌ $$file (missing)"; \
		fi; \
	done
	@for file in $(SCHEMA_FILES); do \
		if [ -f $$file ]; then \
			echo "✅ $$file"; \
		else \
			echo "❌ $$file (missing)"; \
		fi; \
	done
	@for file in $(ASSET_FILES); do \
		if [ -f $$file ]; then \
			echo "✅ $$file"; \
		else \
			echo "❌ $$file (missing)"; \
		fi; \
	done

# Validate schema files
validate-schema:
	@echo "Validating GSettings schema..."
	@glib-compile-schemas --strict --dry-run schemas/ && echo "✅ Schema is valid"

# Quick test installation
test-install: uninstall install enable
	@echo "Test installation complete!"

# Check GNOME Shell compatibility
check-gnome:
	@echo "Checking GNOME Shell compatibility..."
	@gnome-shell --version
	@echo "Supported versions: 40, 41, 42, 43, 44, 45"

# Development environment setup
setup-dev:
	@echo "Setting up development environment..."
	@echo "Installing development dependencies..."
	@if command -v npm >/dev/null 2>&1; then \
		echo "Node.js found, installing eslint..."; \
		npm install -g eslint; \
	fi
	@echo "Development environment setup complete!"

# Lint JavaScript files
lint:
	@echo "Linting JavaScript files..."
	@if command -v eslint >/dev/null 2>&1; then \
		eslint *.js lib/*.js || echo "ESLint not configured or errors found"; \
	else \
		echo "ESLint not found, skipping lint check"; \
	fi

# Help target
help:
	@echo "GnomeLLM Extension Development Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  install        - Install extension (production)"
	@echo "  install-dev    - Install extension (development mode with symlinks)"
	@echo "  uninstall      - Remove extension"
	@echo "  clean          - Clean build artifacts"
	@echo "  package        - Create distribution package"
	@echo "  logs           - Show GNOME Shell logs"
	@echo "  restart        - Restart GNOME Shell (X11 only)"
	@echo "  enable         - Enable extension"
	@echo "  disable        - Disable extension"
	@echo "  status         - Show extension status"
	@echo "  check          - Check if all required files exist"
	@echo "  validate-schema - Validate GSettings schema"
	@echo "  test-install   - Quick test installation"
	@echo "  check-gnome    - Check GNOME Shell compatibility"
	@echo "  setup-dev      - Setup development environment"
	@echo "  lint           - Lint JavaScript files"
	@echo ""
	@echo "Development shortcuts:"
	@echo "  dev-install    - Install in development mode and enable"
	@echo "  dev-reload     - Disable and re-enable extension"
	@echo "  dev-logs       - Show logs (alias for logs)"
	@echo ""
	@echo "Usage: make <target>"
	@echo "Example: make install-dev" 