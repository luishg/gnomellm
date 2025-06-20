/* lib/markdownRenderer.js
 *
 * This class uses marked.js to render markdown to a Pango-compatible
 * markup for use in St.Label widgets.
 */

import St from 'gi://St';
import Pango from 'gi://Pango';
import { marked } from './marked.esm.js';

function log(message) {
    console.log(`[GnomeLLM-MarkdownRenderer] ${message}`);
}

function logError(message, error) {
    console.error(`[GnomeLLM-MarkdownRenderer] ${message}`, error);
}

export class MarkdownRenderer {
    constructor() {
        // Configure marked.js with simpler options to avoid recursion
        marked.setOptions({
            gfm: true,
            breaks: true,
            pedantic: false,
            silent: true // Suppress warnings
        });
    }

    render(text) {
        if (!text) {
            return new St.Label({ text: '' });
        }

        const label = new St.Label({
            x_expand: true,
        });

        // Basic settings for the label
        label.clutter_text.set_line_wrap(true);
        label.clutter_text.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
        label.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
        label.clutter_text.set_selectable(true);
        label.clutter_text.set_editable(false);

        try {
            // Convert markdown to HTML first
            const html = marked.parse(text.trim());
            
            // Convert HTML to Pango markup
            const pangoMarkup = this._htmlToPango(html);

            // Set the markup, with a fallback
            try {
                label.clutter_text.set_markup(pangoMarkup);
            } catch (e) {
                logError('Pango markup parsing failed. Falling back to plain text.', e);
                label.set_text(this._escapePango(text));
            }

        } catch (e) {
            logError('Markdown parsing failed. Falling back to plain text.', e);
            label.set_text(this._escapePango(text));
        }

        return label;
    }
    
    _htmlToPango(html) {
        return html
            // Headers
            .replace(/<h1>(.*?)<\/h1>/g, '<span size="xx-large"><b>$1</b></span>\n\n')
            .replace(/<h2>(.*?)<\/h2>/g, '<span size="x-large"><b>$1</b></span>\n\n')
            .replace(/<h3>(.*?)<\/h3>/g, '<span size="large"><b>$1</b></span>\n\n')
            .replace(/<h4>(.*?)<\/h4>/g, '<span size="medium"><b>$1</b></span>\n\n')
            .replace(/<h5>(.*?)<\/h5>/g, '<span size="small"><b>$1</b></span>\n\n')
            .replace(/<h6>(.*?)<\/h6>/g, '<span size="x-small"><b>$1</b></span>\n\n')
            
            // Bold and italic
            .replace(/<strong>(.*?)<\/strong>/g, '<b>$1</b>')
            .replace(/<em>(.*?)<\/em>/g, '<i>$1</i>')
            
            // Code blocks
            .replace(/<pre><code>(.*?)<\/code><\/pre>/gs, '<span font_family="monospace" rise="-1" class="gnomellm-code-block">$1</span>\n\n')
            
            // Inline code
            .replace(/<code>(.*?)<\/code>/g, '<span font_family="monospace" class="gnomellm-inline-code">$1</span>')
            
            // Blockquotes
            .replace(/<blockquote>(.*?)<\/blockquote>/gs, '<i>$1</i>\n\n')
            
            // Lists
            .replace(/<ul>(.*?)<\/ul>/gs, '$1\n\n')
            .replace(/<ol>(.*?)<\/ol>/gs, '$1\n\n')
            .replace(/<li>(.*?)<\/li>/g, '• $1\n')
            
            // Paragraphs
            .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
            
            // Line breaks
            .replace(/<br>/g, '\n')
            
            // Horizontal rules
            .replace(/<hr>/g, '──────────\n\n')
            
            // Remove any remaining HTML tags
            .replace(/<[^>]*>/g, '')
            
            // Clean up extra newlines
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
    
    _escapePango(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
} 