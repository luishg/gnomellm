/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {ChatWindow} from './lib/chatWindow.js';

function log(message) {
    console.log(`[GnomeLLM-Extension] ${message}`);
}

function logError(message, error) {
    console.error(`[GnomeLLM-Extension] ${message}`, error);
}

const GnomeLLMIndicator = GObject.registerClass(
class GnomeLLMIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, _('GnomeLLM'));
        
        this._extension = extension;
        
        log('Creating panel indicator...');
        
        // Create panel icon
        this.add_child(new St.Icon({
            icon_name: 'face-smile-symbolic',
            style_class: 'system-status-icon',
        }));
        
        // Create menu items
        // Chat item
        this.menu.addAction(_('Show Chat'), () => {
            this._extension.showChatWindow();
        });
        
        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        // Settings item
        this.menu.addAction(_('Settings'), () => {
            this._extension.openPreferences();
        });
        
        log('Panel indicator created');
    }

    destroy() {
        log('Destroying panel indicator');
        super.destroy();
    }
});

export default class GnomeLLMExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._chatWindow = null;
        this._settings = null;
        this._keybindingId = null;
        this._settingsChangedId = null;
        
        log(`Extension constructor called, UUID: ${this.uuid}`);
    }

    enable() {
        log('GNOME LLM enabling...');
        
        try {
            this._settings = this.getSettings();
            log('Settings loaded successfully');
            
            // Create and add indicator to panel
            this._indicator = new GnomeLLMIndicator(this);
            Main.panel.addToStatusArea(this.uuid, this._indicator);
            log('Panel indicator added');

            // Set up hotkey
            this._connectSettings();
            this._setupHotkey();
            
            log('GNOME LLM enabled successfully');
        } catch (error) {
            logError('Failed to enable extension:', error);
            this.disable(); // Clean up on error
        }
    }

    disable() {
        log('GNOME LLM disabling...');
        
        // Disconnect settings listener
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
            log('Settings listener disconnected');
        }

        // Remove hotkey
        if (this._keybindingId) {
            try {
                Main.wm.removeKeybinding('chat-hotkey');
                this._keybindingId = null;
                log('Hotkey removed');
            } catch (error) {
                logError('Failed to remove hotkey:', error);
            }
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
            log('Panel indicator destroyed');
        }
        
        if (this._chatWindow) {
            this._chatWindow.destroy();
            this._chatWindow = null;
            log('Chat window destroyed');
        }
        
        if (this._settings) {
            this._settings = null;
            log('Settings cleared');
        }

        log('GNOME LLM disabled successfully');
    }

    showChatWindow() {
        log('Showing chat window...');
        
        try {
            // Always create a fresh window if one doesn't exist
            if (!this._chatWindow) {
                log('Creating new chat window');
                this._chatWindow = new ChatWindow(this);
                this._chatWindow.connect('destroy', () => {
                    log('Chat window destroyed via signal');
                    this._chatWindow = null;
                });
            }
            
            // Check if window is currently visible and toggle accordingly
            const isVisible = this._chatWindow.get_parent() && this._chatWindow.visible;
            
            if (isVisible) {
                log('Chat window is visible, closing it');
                this._chatWindow.close();
            } else {
                log('Chat window not visible, opening it');
                this._chatWindow.open();
            }
            
        } catch (error) {
            logError('Failed to show chat window:', error);
            
            // If there's an error, destroy the problematic window and create a new one
            if (this._chatWindow) {
                try {
                    this._chatWindow.destroy();
                } catch (e) {
                    // Ignore destruction errors
                }
                this._chatWindow = null;
            }
            
            // Try once more with a fresh window
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                try {
                    log('Creating fresh chat window after error');
                    this._chatWindow = new ChatWindow(this);
                    this._chatWindow.connect('destroy', () => {
                        log('Chat window destroyed via signal');
                        this._chatWindow = null;
                    });
                    this._chatWindow.open();
                } catch (retryError) {
                    logError('Failed to create chat window on retry:', retryError);
                }
                return GLib.SOURCE_REMOVE;
            });
        }
    }
    
    toggleChatWindow() {
        log('Toggle chat window called - redirecting to show');
        this.showChatWindow();
    }
    
    _isChatWindowVisible() {
        if (!this._chatWindow) {
            return false;
        }
        
        try {
            // Multiple checks to determine if window is truly visible
            const hasParent = this._chatWindow.get_parent() !== null;
            const isVisible = this._chatWindow.visible;
            const hasStage = this._chatWindow.get_stage() !== null;
            
            log(`Window state - hasParent: ${hasParent}, visible: ${isVisible}, hasStage: ${hasStage}`);
            
            // Window is considered visible if it has all these properties
            return hasParent && isVisible && hasStage;
        } catch (error) {
            logError('Error checking window visibility:', error);
            return false;
        }
    }

    closeChatWindow() {
        log('Closing chat window...');
        if (this._chatWindow) {
            this._chatWindow.close();
        }
    }
    
    _connectSettings() {
        try {
            this._settingsChangedId = this._settings.connect('changed::chat-hotkey', () => {
                log('Hotkey setting changed, updating...');
                this._setupHotkey();
            });
            log('Settings change listener connected');
        } catch (error) {
            logError('Failed to connect settings listener:', error);
        }
    }
    
    _setupHotkey() {
        try {
            // Remove existing keybinding if any
            if (this._keybindingId) {
                Main.wm.removeKeybinding('chat-hotkey');
                log('Existing hotkey removed');
            }
            
            const hotkeys = this._settings.get_strv('chat-hotkey');
            const hotkeyString = hotkeys.length > 0 ? hotkeys[0] : '';
            
            if (!hotkeyString) {
                log('No hotkey configured');
                return;
            }
            
            log(`Setting up hotkey: ${hotkeyString}`);
            
            // Add new keybinding
            Main.wm.addKeybinding(
                'chat-hotkey',
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
                () => {
                    log('Hotkey activated');
                    this.showChatWindow();
                }
            );
            
            this._keybindingId = 'chat-hotkey';
            log(`Hotkey setup completed: ${hotkeyString}`);
        } catch (error) {
            logError('Failed to setup hotkey:', error);
        }
    }
} 