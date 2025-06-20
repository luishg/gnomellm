/* lib/markdownRenderer.js
 * Simple markdown renderer for GNOME Shell extension
 */

import St from 'gi://St';
import Pango from 'gi://Pango';

export class MarkdownRenderer {
    constructor() {
        // Simple markdown patterns
        this._patterns = [
            // Code blocks
            {
                pattern: /```([^`]+)```/g,
                replace: (match, code) => `<span class="gnomellm-code-block">${this._escapeHtml(code.trim())}</span>`
            },
            // Inline code
            {
                pattern: /`([^`]+)`/g,
                replace: (match, code) => `<span class="gnomellm-inline-code">${this._escapeHtml(code)}</span>`
            },
            // Bold text
            {
                pattern: /\*\*([^*]+)\*\*/g,
                replace: (match, text) => `<b>${text}</b>`
            },
            // Italic text
            {
                pattern: /\*([^*]+)\*/g,
                replace: (match, text) => `<i>${text}</i>`
            },
        ];
    }
    
    render(text) {
        if (!text) {
            return new St.Label({ text: '' });
        }
        
        let processedText = text;
        
        // Apply markdown patterns
        this._patterns.forEach(({ pattern, replace }) => {
            processedText = processedText.replace(pattern, replace);
        });
        
        // Create label with markup
        const label = new St.Label({
            text: processedText,
            x_expand: true,
        });
        
        // Enable line wrapping
        label.clutter_text.set_line_wrap(true);
        label.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
        
        // Try to set markup if it contains HTML-like tags
        if (processedText.includes('<') && processedText.includes('>')) {
            try {
                label.clutter_text.set_markup(processedText);
            } catch (error) {
                // Fallback to plain text if markup parsing fails
                label.set_text(text);
            }
        }
        
        return label;
    }
    
    _escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
} 