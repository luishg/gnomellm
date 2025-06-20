/* lib/chatWindow.js
 *
 * This class implements the main chat window for the extension. It's a
 * ModalDialog that contains a chat history, an entry for user input, and
 * controls for interacting with the Ollama service.
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import Meta from 'gi://Meta';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';

import { OllamaClient } from './ollamaClient.js';
import { MarkdownRenderer } from './markdownRenderer.js';

function log(message) {
    console.log(`[GnomeLLM-ChatWindow] ${message}`);
}

function logError(message, error) {
    console.error(`[GnomeLLM-ChatWindow] ${message}`, error);
}

export const ChatWindow = GObject.registerClass({
    GTypeName: 'ChatWindow',
}, class ChatWindow extends ModalDialog.ModalDialog {
    _init(extension) {
        log('Initializing chat window...');
        
        try {
            super._init({
                styleClass: 'gnomellm-chat-window',
                destroyOnClose: false
            });

            this._extension = extension;
            this._settings = extension.getSettings();
            this._client = new OllamaClient(this._settings);
            this._markdownRenderer = new MarkdownRenderer();
            this._chatHistory = []; // { role: 'user'/'assistant', content: '...' }
            this._isStreaming = false;
            this._currentAssistantMessageWidget = null;
            this._isUIBuilt = false;
            this._scrollTimeoutId = null;
            this._autoScrollEnabled = true;

            this._buildUI();
            this._connectSignals();
            
            log('Chat window initialized successfully');
        } catch (error) {
            logError('Error initializing chat window:', error);
            throw error;
        }
    }

    _connectSignals() {
        this.connect('opened', () => this._onOpened());
        this.connect('closed', () => this._onClosed());
        
        // Handle escape key to close window
        this._keyPressId = this.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol === Clutter.KEY_Escape) {
                this.close();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _buildUI() {
        log('Building UI...');
        
        try {
            // Main layout: vertical box
            const mainLayout = new St.BoxLayout({
                orientation: Clutter.Orientation.VERTICAL,
                style_class: 'gnomellm-main-layout'
            });
            this.contentLayout.add_child(mainLayout);

            // Header
            this._buildHeader(mainLayout);
            
            // Chat History (Improved ScrollView)
            this._buildChatHistory(mainLayout);
            
            // Input Area
            this._buildInputArea(mainLayout);
            
            this._isUIBuilt = true;
            log('UI built successfully');
        } catch (error) {
            logError('Error building UI:', error);
            throw error;
        }
    }

    _buildHeader(parent) {
        this._header = new St.BoxLayout({
            style_class: 'gnomellm-header',
            x_expand: true,
        });
        parent.add_child(this._header);

        // Left side: Title
        const leftBox = new St.BoxLayout({
            style_class: 'gnomellm-header-left',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._header.add_child(leftBox);

        const title = new St.Label({
            text: this._settings.get_string('header-text') || 'GNOME LLM',
            style_class: 'gnomellm-header-title',
            y_align: Clutter.ActorAlign.CENTER,
        });
        leftBox.add_child(title);

        // Center spacer to push right content to the right
        const spacer = new St.Widget({
            x_expand: true,
        });
        this._header.add_child(spacer);

        // Right side: Model, Settings, Close
        const rightBox = new St.BoxLayout({
            style_class: 'gnomellm-header-right',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._header.add_child(rightBox);

        // Model Selector (on the right)
        this._modelSelector = new St.Button({
            style_class: 'gnomellm-model-selector',
            label: 'Loading models...',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._modelSelector.connect('clicked', () => this._showModelSelector());
        rightBox.add_child(this._modelSelector);

        // New Chat Button
        this._newChatButton = new St.Button({
            style_class: 'gnomellm-header-button',
            child: new St.Icon({
                icon_name: 'document-new-symbolic',
                icon_size: 16,
            }),
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._newChatButton.connect('clicked', () => this._startNewChat());
        rightBox.add_child(this._newChatButton);

        // Settings Button
        this._settingsButton = new St.Button({
            style_class: 'gnomellm-header-button',
            child: new St.Icon({
                icon_name: 'preferences-system-symbolic',
                icon_size: 16,
            }),
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._settingsButton.connect('clicked', () => this._openSettings());
        rightBox.add_child(this._settingsButton);

        // Close Button
        this._closeButton = new St.Button({
            style_class: 'gnomellm-header-button gnomellm-close-button',
            child: new St.Icon({
                icon_name: 'window-close-symbolic',
                icon_size: 16,
            }),
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._closeButton.connect('clicked', () => this.close());
        rightBox.add_child(this._closeButton);
        
        // Separator
        parent.add_child(new St.Widget({
            style_class: 'gnomellm-separator',
            x_expand: true,
        }));
    }
    
    _buildChatHistory(parent) {
        log('Building improved chat history view...');
        
        try {
            // Create a container for the chat area
            this._chatContainer = new St.BoxLayout({
                style_class: 'gnomellm-chat-container',
                orientation: Clutter.Orientation.VERTICAL,
                x_expand: true,
                y_expand: true,
            });
            parent.add_child(this._chatContainer);

            // Create the scroll view with better configuration
            this._chatView = new St.ScrollView({
                style_class: 'gnomellm-chat-view',
                hscrollbar_policy: St.PolicyType.NEVER,
                vscrollbar_policy: St.PolicyType.AUTOMATIC,
                x_expand: true,
                y_expand: true,
                overlay_scrollbars: false,
            });
            this._chatContainer.add_child(this._chatView);

            // Create the chat content box
            this._chatBox = new St.BoxLayout({
                style_class: 'gnomellm-chat-box',
                orientation: Clutter.Orientation.VERTICAL,
                x_expand: true,
            });
            this._chatView.add_child(this._chatBox);

            // Connect scroll adjustment signals for better scroll management
            this._chatView.vadjustment.connect('changed', () => {
                this._onScrollChanged();
            });

            // Add a spacer at the bottom to ensure content is pushed up
            this._bottomSpacer = new St.Widget({
                style_class: 'gnomellm-bottom-spacer',
                x_expand: true,
                y_expand: true,
            });
            this._chatBox.add_child(this._bottomSpacer);
            
            log('Improved chat history view built successfully');
            
        } catch (error) {
            logError('Error building chat history:', error);
            throw error;
        }
    }

    _onScrollChanged() {
        // Simplified - just detect if user manually scrolled up significantly
        if (!this._chatView) {
            return;
        }

        const vadjustment = this._chatView.vadjustment;
        if (!vadjustment) {
            return;
        }

        // Check if we're near the bottom (within 50 pixels)
        const currentValue = vadjustment.get_value();
        const maxValue = Math.max(0, vadjustment.get_upper() - vadjustment.get_page_size());
        const isNearBottom = (maxValue - currentValue) < 50;

        // Only disable auto-scroll if user scrolled significantly up
        this._autoScrollEnabled = isNearBottom;
    }
    
    _addWelcomeMessage() {
        log('Adding welcome message...');
        
        try {
            const welcomeText = `👋 **Welcome to GnomeLLM!**

I'll help you interact with your local AI models through Ollama.

**Features you can use:**
• Type naturally and press **Enter** to send messages
• Select any text to copy it to your clipboard
• Use **Ctrl+Enter** as an alternative to send
• Press **Escape** or click **✕** to close this window
• Click **⚙️** to access settings

**Formatting supported:**
• \`inline code\` for code snippets
• **bold text** for emphasis  
• *italic text* for style
• Multi-line responses with proper formatting

Ready to chat! 🚀`;

            //this._addMessage('assistant', welcomeText);
            log('Welcome message added successfully');
        } catch (error) {
            logError('Error adding welcome message:', error);
        }
    }
    
    _addModelLoadedMessage(modelName, modelCount) {
        log('Adding model loaded confirmation...');
        
        try {
            const statusText = `✅ **System Ready**

**Current Model:** ${modelName}
**Available Models:** ${modelCount} model${modelCount !== 1 ? 's' : ''} loaded

The AI model is now active and ready to respond to your questions. Start typing below to begin our conversation!`;

            this._addMessage('assistant', statusText);
            log('Model loaded message added successfully');
        } catch (error) {
            logError('Error adding model loaded message:', error);
        }
    }
    
    _buildInputArea(parent) {
        const inputLayout = new St.BoxLayout({
            style_class: 'gnomellm-input-layout',
            x_expand: true,
        });
        parent.add_child(inputLayout);

        this._entry = new St.Entry({
            style_class: 'gnomellm-input-entry',
            hint_text: 'Send a message...',
            can_focus: true,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._entry.clutter_text.connect('activate', () => this._sendMessage());
        
        // Handle Ctrl+Enter as well
        this._entry.clutter_text.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            const modifiers = event.get_state();
            
            if (symbol === Clutter.KEY_Return && (modifiers & Clutter.ModifierType.CONTROL_MASK)) {
                this._sendMessage();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        
        inputLayout.add_child(this._entry);

        this._sendButton = new St.Button({
            style_class: 'gnomellm-send-button',
            child: new St.Icon({
                icon_name: 'send-symbolic',
                style_class: 'gnomellm-send-icon'
            }),
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._sendButton.connect('clicked', () => this._sendMessage());
        inputLayout.add_child(this._sendButton);
    }

    async _loadModels() {
        try {
            log('Loading available models...');
            const models = await this._client.getModels();
            if (models.length > 0) {
                const currentModel = this._settings.get_string('current-model') || models[0];
                this._modelSelector.set_label(currentModel);
                this._modelSelector.set_reactive(true);
                log(`Loaded ${models.length} models, current: ${currentModel}`);
                
                // Add model loaded confirmation message
                this._addModelLoadedMessage(currentModel, models.length);
            } else {
                this._modelSelector.set_label('No models found');
                this._modelSelector.set_reactive(false);
                log('No models found');
                
                // Add error message for no models
                this._addMessage('assistant', `⚠️ **No Models Available**

No Ollama models were found. Please ensure:
1. Ollama is installed and running
2. At least one model is downloaded
3. The Ollama server URL is correct in settings

You can download models using: \`ollama pull modelname\``);
            }
        } catch (e) {
            this._modelSelector.set_label('Error loading models');
            this._modelSelector.set_reactive(false);
            logError('Failed to load Ollama models:', e);
            
            // Add connection error message
            this._addMessage('assistant', `❌ **Connection Error**

Failed to connect to Ollama server.

**Error:** ${e.message}

Please check:
1. Ollama is installed and running
2. Server URL is correct in extension settings
3. Network connectivity

Click the **⚙️** settings button to configure the connection.`);
        }
    }
    
    _showModelSelector() {
        // TODO: Implement model selection popup
        log('Model selector clicked - TODO: implement model selection popup');
    }
    
    _openSettings() {
        log('Opening extension settings...');
        try {
            // Hide the chat window so settings can be seen
            this.close();
            // Open settings after a short delay to ensure clean transition
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                this._extension.openPreferences();
                return GLib.SOURCE_REMOVE;
            });
        } catch (error) {
            logError('Failed to open settings:', error);
        }
    }

    _addMessage(role, text) {
        log(`Adding message: ${role} - ${text.substring(0, 50)}...`);
        
        try {
            // Remove the bottom spacer temporarily
            if (this._bottomSpacer && this._bottomSpacer.get_parent()) {
                this._bottomSpacer.get_parent().remove_child(this._bottomSpacer);
            }

            const messageContainer = new St.BoxLayout({
                style_class: `gnomellm-message-container gnomellm-${role}-message-container`,
                orientation: Clutter.Orientation.VERTICAL,
            });
            this._chatBox.add_child(messageContainer);

            const messageBox = new St.BoxLayout({
                style_class: `gnomellm-message-box gnomellm-${role}-message-box`,
                orientation: Clutter.Orientation.VERTICAL,
            });
            messageContainer.add_child(messageBox);
            
            let messageLabel;
            if (role === 'assistant') {
                // Use markdown renderer for assistant messages
                messageLabel = this._markdownRenderer.render(text);
            } else {
                // Create user message label with proper wrapping
                messageLabel = new St.Label({ 
                    text: text,
                    x_expand: true 
                });
                messageLabel.clutter_text.set_line_wrap(true);
                messageLabel.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                messageLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
                
                // Enable text selection for user messages
                messageLabel.clutter_text.set_selectable(true);
                messageLabel.clutter_text.set_editable(false);
            }

            // Enable text selection for all messages
            if (messageLabel.clutter_text) {
                messageLabel.clutter_text.set_selectable(true);
                messageLabel.clutter_text.set_editable(false);
            }

            messageLabel.style_class = `gnomellm-message-text gnomellm-${role}-message-text`;
            messageBox.add_child(messageLabel);

            // Re-add the bottom spacer
            this._chatBox.add_child(this._bottomSpacer);

            // Use aggressive scrolling for new messages
            this._forceScrollToBottom();
            
            log('Message added successfully');
            return messageBox;
        } catch (error) {
            logError('Error adding message:', error);
            return null;
        }
    }
    
    _scheduleScrollToBottom() {
        // Clear any existing timeout
        if (this._scrollTimeoutId) {
            GLib.source_remove(this._scrollTimeoutId);
            this._scrollTimeoutId = null;
        }

        // Use immediate priority and longer delay for better reliability
        this._scrollTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._scrollToBottom();
            this._scrollTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }
    
    _scrollToBottom() {
        if (!this._chatView || !this._isUIBuilt) {
            log('Deferring scroll - window not ready');
            return;
        }
        
        try {
            // Force layout update first to ensure accurate measurements
            this._chatView.queue_relayout();
            
            // Use a small delay to ensure layout is complete
            GLib.timeout_add(GLib.PRIORITY_DEFAULT_IDLE, 10, () => {
                const vadjustment = this._chatView.vadjustment;
                if (!vadjustment) {
                    log('Vadjustment not available for scrolling.');
                    return GLib.SOURCE_REMOVE;
                }

                // Get current scroll values
                const upper = vadjustment.get_upper();
                const pageSize = vadjustment.get_page_size();
                const currentValue = vadjustment.get_value();
                
                // Calculate the actual bottom position
                const bottomValue = Math.max(0, upper - pageSize);
                
                log(`Scroll values - upper: ${upper}, pageSize: ${pageSize}, current: ${currentValue}, target: ${bottomValue}`);
                
                // Always scroll to bottom if auto-scroll is enabled, regardless of current position
                if (this._autoScrollEnabled) {
                    // Use animation for smoother scrolling
                    vadjustment.ease(bottomValue, {
                        duration: 150,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                        onComplete: () => {
                            log(`Scrolled to bottom: ${bottomValue}`);
                        }
                    });
                    
                    // Fallback: set value directly in case ease fails
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
                        if (Math.abs(vadjustment.get_value() - bottomValue) > 5) {
                            vadjustment.set_value(bottomValue);
                            log('Fallback scroll applied');
                        }
                        return GLib.SOURCE_REMOVE;
                    });
                }
                
                return GLib.SOURCE_REMOVE;
            });
            
        } catch (error) {
            logError('Error scrolling to bottom:', error);
        }
    }

    _updateAssistantMessage(newText) {
        if (!this._currentAssistantMessageWidget) {
             // This case handles the very first token received
            this._currentAssistantMessageWidget = this._addMessage('assistant', '');
        }

        const container = this._currentAssistantMessageWidget;
        
        try {
            // Clear all children first
            container.remove_all_children();
            
            // Create new label with proper formatting
            const newLabel = this._markdownRenderer.render(newText);
            newLabel.style_class = 'gnomellm-message-text gnomellm-assistant-message-text';
            
            // Add the new label
            container.add_child(newLabel);
            
            log(`Updated assistant message: ${newText.length} chars, ${newText.split('\n').length} lines`);
            
            // Force scroll to bottom during streaming - be more aggressive
            this._forceScrollToBottom();
        } catch (error) {
            logError('Error updating assistant message:', error);
        }
    }

    // Force scroll to bottom - more aggressive than regular scroll
    _forceScrollToBottom() {
        if (!this._chatView || !this._isUIBuilt) {
            return;
        }
        
        // During streaming, always scroll regardless of user position
        // Otherwise respect the auto-scroll setting
        const shouldForceScroll = this._isStreaming || this._autoScrollEnabled;
        
        if (!shouldForceScroll) {
            return;
        }
        
        // Clear any existing timeout
        if (this._scrollTimeoutId) {
            GLib.source_remove(this._scrollTimeoutId);
            this._scrollTimeoutId = null;
        }

        // Force immediate scroll with multiple attempts for reliability
        this._scrollTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 30, () => {
            try {
                // Force layout update first
                this._chatView.queue_relayout();
                
                // Try to scroll immediately
                const vadjustment = this._chatView.vadjustment;
                if (vadjustment) {
                    const upper = vadjustment.get_upper();
                    const pageSize = vadjustment.get_page_size();
                    const bottomValue = Math.max(0, upper - pageSize);
                    
                    log(`Force scroll - upper: ${upper}, pageSize: ${pageSize}, target: ${bottomValue}, streaming: ${this._isStreaming}`);
                    
                    // Set value directly for immediate effect
                    vadjustment.set_value(bottomValue);
                    
                    // Also try with animation as backup
                    vadjustment.ease(bottomValue, {
                        duration: 100,
                        mode: Clutter.AnimationMode.EASE_OUT_QUAD
                    });
                }
            } catch (error) {
                logError('Error in force scroll:', error);
            }
            
            this._scrollTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    async _sendMessage() {
        const prompt = this._entry.get_text();
        if (!prompt.trim() || this._isStreaming) {
            return;
        }

        log(`Sending message: ${prompt.length} chars`);
        
        this._entry.set_text('');
        this._setInProgress(true);

        // Add user message to history and UI
        this._chatHistory.push({ role: 'user', content: prompt });
        this._addMessage('user', prompt);
        
        // Add a placeholder for the assistant's response
        this._currentAssistantMessageWidget = this._addMessage('assistant', '...');
        
        try {
            const model = this._settings.get_string('current-model');
            if (!model) {
                throw new Error('No model selected. Please select a model in settings.');
            }
            
            let fullResponse = '';
            let tokenCount = 0;

            log(`Starting chat with model: ${model}`);

            await this._client.chat(
                this._chatHistory,
                model,
                // onToken
                (token) => {
                    fullResponse += token;
                    tokenCount++;
                    log(`Token received: "${token}" (${token.length} chars) | Total: ${fullResponse.length} chars`);
                    this._updateAssistantMessage(fullResponse + ' █');
                },
                // onComplete
                (finalResponse) => {
                    if (finalResponse) {
                       fullResponse = finalResponse;
                    }
                    log(`Final response: ${fullResponse.length} chars, ${fullResponse.split('\n').length} lines`);
                    this._updateAssistantMessage(fullResponse); // Final update without cursor
                    this._chatHistory.push({ role: 'assistant', content: fullResponse });
                    this._setInProgress(false);
                    this._currentAssistantMessageWidget = null;
                    log(`Chat completed: ${tokenCount} tokens, ${fullResponse.length} chars`);
                },
                // onError
                (error) => {
                    logError('Error during chat:', error);
                    const errorMessage = `**Error:** ${error.message}

This might be because:
- Ollama is not running
- The selected model is not available
- Network connection issues

Please check your Ollama installation and try again.`;
                    
                    this._updateAssistantMessage(errorMessage);
                    this._setInProgress(false);
                    this._currentAssistantMessageWidget = null;
                }
            );
        } catch (e) {
            logError('Failed to send message:', e);
            const errorMessage = `**Error:** Failed to connect to Ollama. 

${e.message}

Please ensure:
1. Ollama is installed and running
2. The server URL is correct in settings
3. At least one model is available

You can test the connection in the extension settings.`;
            
            this._updateAssistantMessage(errorMessage);
            this._setInProgress(false);
            this._currentAssistantMessageWidget = null;
        }
    }

    _setInProgress(inProgress) {
        this._isStreaming = inProgress;
        this._sendButton.set_reactive(!inProgress);
        this._entry.set_reactive(!inProgress);

        if (inProgress) {
            this._entry.set_hint_text('Waiting for response...');
            this._sendButton.child.icon_name = 'process-stop-symbolic';
        } else {
            this._entry.set_hint_text('Send a message... (Enter to send, Ctrl+Enter also works)');
            this._sendButton.child.icon_name = 'send-symbolic';
            this._entry.grab_key_focus();
        }
    }
    
    _onOpened() {
        log('Chat window opened successfully!');
        
        // Ensure auto-scroll is enabled when window opens
        this._autoScrollEnabled = true;
        
        // Now that the window is fully opened, we can safely add the welcome message
        // and do other initialization tasks
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
            log('Post-open initialization...');
            
            // Add welcome message now that everything is ready
            this._addWelcomeMessage();
            
            // Load models
            this._loadModels();
            
            // Give focus to the entry field and force scroll to bottom
            this._entry.grab_key_focus();
            this._forceScrollToBottom();
            
            log('Post-open initialization completed');
            return GLib.SOURCE_REMOVE;
        });
    }
    
    _onClosed() {
        log('Chat window closed');
        // Stop any ongoing streaming
        if (this._isStreaming) {
            this._setInProgress(false);
        }
        
        // Clear any pending scroll timeouts
        if (this._scrollTimeoutId) {
            GLib.source_remove(this._scrollTimeoutId);
            this._scrollTimeoutId = null;
        }
    }

    open() {
        try {
            // Check if we're actually visible to the user
            const hasParent = !!this.get_parent();
            const isVisible = this.visible;
            const hasStage = !!this.get_stage();
            
            log(`Open called - current state: parent=${hasParent}, visible=${isVisible}, stage=${hasStage}`);
            
            if (hasParent && isVisible && hasStage) {
                // Already open and visible, just focus
                log('Chat window already open and visible, focusing...');
                this._entry.grab_key_focus();
                return;
            }
            
            log('Opening chat window...');
            
            // Set size from settings
            const width = this._settings.get_int('window-width') || 600;
            const height = this._settings.get_int('window-height') || 700;
            
            log(`Setting window size: ${width}x${height}`);
            this.contentLayout.set_size(width, height);
            
            log('Calling super.open()...');
            super.open();
            log('super.open() completed');
        } catch (error) {
            logError('Error opening chat window:', error);
            throw error;
        }
    }

    close() {
        log('Closing chat window...');
        super.close();
    }

    destroy() {
        log('Destroying chat window...');
        
        if (this._keyPressId) {
            this.disconnect(this._keyPressId);
            this._keyPressId = null;
        }
        
        if (this._scrollTimeoutId) {
            GLib.source_remove(this._scrollTimeoutId);
            this._scrollTimeoutId = null;
        }
        
        if (this._client) {
            this._client.destroy();
            this._client = null;
        }
        
        super.destroy();
    }

    _startNewChat() {
        log('Starting a new chat...');
        
        try {
            // Stop any ongoing streaming
            if (this._isStreaming) {
                this._setInProgress(false);
            }
            
            // Clear chat history
            this._chatHistory = [];
            this._currentAssistantMessageWidget = null;
            
            // Clear the chat UI
            this._chatBox.remove_all_children();
            
            // Re-add the bottom spacer
            this._chatBox.add_child(this._bottomSpacer);
            
            // Re-enable auto-scroll for the new chat
            this._autoScrollEnabled = true;
            
            // Add welcome message for the new chat
            this._addWelcomeMessage();
            
            // Reload models to show current status
            this._loadModels();
            
            // Focus on the input field
            this._entry.grab_key_focus();
            
            // Force scroll to the bottom
            this._forceScrollToBottom();
            
            log('New chat started successfully');
        } catch (error) {
            logError('Error starting new chat:', error);
        }
    }
});