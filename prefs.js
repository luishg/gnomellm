/* prefs.js
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
 */

'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { OllamaClient } from './lib/ollamaClient.js';

function log(message) {
    console.log(`[GnomeLLM-Prefs] ${message}`);
}

function logError(message, error) {
    console.error(`[GnomeLLM-Prefs] ${message}`, error);
}

function _testConnection(settings, button) {
    log('Testing connection to Ollama server...');
    const originalLabel = button.get_label();
    button.set_label(_('Testing...'));
    button.set_sensitive(false);

    const client = new OllamaClient(settings);
    client.testConnection().then(success => {
        log(`Connection test result: ${success}`);
        if (success) {
            const dialog = new Adw.MessageDialog({
                heading: _('Success'),
                body: _('Connection to Ollama server is successful.'),
                transient_for: button.get_root(),
            });
            dialog.add_response('ok', _('OK'));
            dialog.connect('response', () => dialog.destroy());
            dialog.present();
        } else {
            const dialog = new Adw.MessageDialog({
                heading: _('Error'),
                body: _('Could not connect to Ollama server. Please check the URL and ensure Ollama is running.'),
                transient_for: button.get_root(),
            });
            dialog.add_response('ok', _('OK'));
            dialog.connect('response', () => dialog.destroy());
            dialog.present();
        }
        button.set_label(originalLabel);
        button.set_sensitive(true);
    }).catch(error => {
        logError('Connection test failed:', error);
        const dialog = new Adw.MessageDialog({
            heading: _('Error'),
            body: _('An error occurred: ') + error.message,
            transient_for: button.get_root(),
        });
        dialog.add_response('ok', _('OK'));
        dialog.connect('response', () => dialog.destroy());
        dialog.present();
        button.set_label(originalLabel);
        button.set_sensitive(true);
    });
}

function _refreshModels(settings, modelRow, modelStore, button) {
    log('Refreshing model list...');
    const originalLabel = button.get_label();
    button.set_label(_('Refreshing...'));
    button.set_sensitive(false);

    const client = new OllamaClient(settings);
    client.getModels().then(modelNames => {
        log(`Found ${modelNames.length} models: ${modelNames.join(', ')}`);
        settings.set_strv('available-models', modelNames);

        modelStore.remove_all();
        modelNames.forEach(name => modelStore.append(name));

        const currentModel = settings.get_string('current-model');
        const newIndex = modelNames.indexOf(currentModel);
        if (newIndex !== -1) {
            modelRow.set_selected(newIndex);
        } else if (modelNames.length > 0) {
            modelRow.set_selected(0);
            settings.set_string('current-model', modelNames[0]);
            log(`Set current model to: ${modelNames[0]}`);
        }

        button.set_label(originalLabel);
        button.set_sensitive(true);

        const dialog = new Adw.MessageDialog({
            heading: _('Success'),
            body: _('Model list updated.') + ` ${_('Found')} ${modelNames.length} ${_('models')}.`,
            transient_for: button.get_root(),
        });
        dialog.add_response('ok', _('OK'));
        dialog.connect('response', () => dialog.destroy());
        dialog.present();

    }).catch(error => {
        logError('Failed to fetch models:', error);
        button.set_label(originalLabel);
        button.set_sensitive(true);
        const dialog = new Adw.MessageDialog({
            heading: _('Error'),
            body: _('Failed to fetch models: ') + error.message,
            transient_for: button.get_root(),
        });
        dialog.add_response('ok', _('OK'));
        dialog.connect('response', () => dialog.destroy());
        dialog.present();
    });
}

function _showHotkeyDialog(parent, settings, label) {
    log('Opening hotkey dialog...');
    const dialog = new Gtk.Dialog({
        title: _('Set Hotkey'),
        transient_for: parent,
        modal: true,
        use_header_bar: 1,
    });

    const shortcutController = new Gtk.ShortcutController();
    dialog.add_controller(shortcutController);

    const contentArea = dialog.get_content_area();
    contentArea.set_spacing(16);

    const infoLabel = new Gtk.Label({
        label: _('Press the desired key combination for the hotkey.'),
        halign: Gtk.Align.CENTER,
    });
    contentArea.append(infoLabel);

    const keyLabel = new Gtk.Label({
        label: _('Waiting for input...'),
        css_classes: ['title-2'],
        halign: Gtk.Align.CENTER,
    });
    contentArea.append(keyLabel);

    shortcutController.connect('key-pressed', (controller, keyval, keycode, state) => {
        const accelerator = Gtk.accelerator_name_with_keycode(null, keyval, keycode, state);
        if (accelerator) {
            log(`New hotkey set: ${accelerator}`);
            label.set_accelerator(accelerator);
            settings.set_strv('chat-hotkey', [accelerator]);
            dialog.close();
            return Gtk.EVENT_STOP;
        }
        return Gtk.EVENT_PROPAGATE;
    });

    dialog.present();
}

export default class GnomeLLMPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        log('Loading preferences window...');
        this.settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Ollama Configuration'),
        });
        page.add(group);

        // Ollama URL
        const urlRow = new Adw.EntryRow({
            title: _('Ollama Server URL'),
        });
        group.add(urlRow);
        this.settings.bind('ollama-url', urlRow, 'text', Gio.SettingsBindFlags.DEFAULT);

        // Theme selection
        const themeGroup = new Adw.PreferencesGroup({
            title: _('Appearance'),
        });
        page.add(themeGroup);

        const themeRow = new Adw.ComboRow({
            title: _('Theme'),
        });
        const themeModel = new Gtk.StringList();
        themeModel.append('auto');
        themeModel.append('light');
        themeModel.append('dark');
        themeRow.set_model(themeModel);

        const currentTheme = this.settings.get_string('theme');
        const themeIndex = ['auto', 'light', 'dark'].indexOf(currentTheme);
        themeRow.set_selected(Math.max(0, themeIndex));

        themeRow.connect('notify::selected', () => {
            const themes = ['auto', 'light', 'dark'];
            const selectedTheme = themes[themeRow.get_selected()];
            this.settings.set_string('theme', selectedTheme);
            log(`Theme changed to: ${selectedTheme}`);
        });

        themeGroup.add(themeRow);

        // Test Connection Button
        const testConnectionRow = new Adw.ActionRow({
            title: _('Test Connection'),
            subtitle: _('Test connection to Ollama server'),
        });
        const testButton = new Gtk.Button({
            label: _('Test'),
            valign: Gtk.Align.CENTER,
        });
        testButton.connect('clicked', () => {
            _testConnection(this.settings, testButton);
        });
        testConnectionRow.add_suffix(testButton);
        testConnectionRow.set_activatable_widget(testButton);
        group.add(testConnectionRow);

        // Current Model Selection
        const modelRow = new Adw.ComboRow({
            title: _('Current Model'),
            subtitle: _('Select the LLM model to use'),
        });

        const modelStore = new Gtk.StringList();
        const availableModels = this.settings.get_strv('available-models');
        const currentModel = this.settings.get_string('current-model');
        let selectedIndex = 0;

        if (availableModels.length === 0) {
            modelStore.append(_('No models found. Refresh.'));
            modelRow.set_sensitive(false);
        } else {
            availableModels.forEach((model, index) => {
                modelStore.append(model);
                if (model === currentModel) {
                    selectedIndex = index;
                }
            });
        }

        modelRow.set_model(modelStore);
        modelRow.set_selected(selectedIndex);

        modelRow.connect('notify::selected', () => {
            if (availableModels.length > 0) {
                const selectedModel = availableModels[modelRow.get_selected()];
                if (selectedModel) {
                    this.settings.set_string('current-model', selectedModel);
                    log(`Model changed to: ${selectedModel}`);
                }
            }
        });
        group.add(modelRow);

        // Refresh Models Button
        const refreshModelsRow = new Adw.ActionRow({
            title: _('Refresh Model List'),
            subtitle: _('Fetch the list of available models from the server'),
        });
        const refreshButton = new Gtk.Button({
            label: _('Refresh'),
            valign: Gtk.Align.CENTER,
        });
        refreshButton.connect('clicked', () => {
            _refreshModels(this.settings, modelRow, modelStore, refreshButton);
            modelRow.set_sensitive(true);
        });
        refreshModelsRow.add_suffix(refreshButton);
        refreshModelsRow.set_activatable_widget(refreshButton);
        group.add(refreshModelsRow);

        // Hotkey settings
        const hotkeyGroup = new Adw.PreferencesGroup({
            title: _('Hotkey'),
        });
        page.add(hotkeyGroup);

        const hotkeyRow = new Adw.ActionRow({
            title: _('Toggle Chat Window Hotkey'),
        });

        const hotkeyLabel = new Gtk.ShortcutLabel({
            accelerator: this.settings.get_strv('chat-hotkey')[0] || '',
            valign: Gtk.Align.CENTER,
        });

        hotkeyRow.add_suffix(hotkeyLabel);
        hotkeyRow.set_activatable(true);
        hotkeyRow.connect('activated', () => {
            _showHotkeyDialog(window, this.settings, hotkeyLabel);
        });

        hotkeyGroup.add(hotkeyRow);
        
        const aboutGroup = new Adw.PreferencesGroup({
            title: _('About'),
        });
        page.add(aboutGroup);

        const versionRow = new Adw.ActionRow({
            title: _('Version'),
        });
        
        let version = 'N/A';
        try {
            version = this.metadata.version.toString();
        } catch (e) {
            logError('Could not determine extension version.', e);
        }

        versionRow.add_suffix(new Gtk.Label({
            label: version,
            valign: Gtk.Align.CENTER,
        }));
        aboutGroup.add(versionRow);

        const authorRow = new Adw.ActionRow({
            title: _('Author'),
        });
        authorRow.add_suffix(new Gtk.LinkButton({
            label: 'https://github.com/luishg/',
            uri: 'https://github.com/luishg/',
            valign: Gtk.Align.CENTER,
        }));
        aboutGroup.add(authorRow);

        log('Preferences window loaded successfully');
    }
}