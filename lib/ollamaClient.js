/* lib/ollamaClient.js
 * Ollama API client for GNOME Shell extension
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

function log(message) {
    console.log(`[GnomeLLM-OllamaClient] ${message}`);
}

function logError(message, error) {
    console.error(`[GnomeLLM-OllamaClient] ${message}`, error);
}

export class OllamaClient {
    constructor(settings) {
        this._settings = settings;
        this._session = new Soup.Session();
        this._session.timeout = 60;
        this._session.idle_timeout = 30;
        
        log(`Initialized with URL: ${this.baseUrl}`);
    }
    
    get baseUrl() {
        const url = this._settings.get_string('ollama-url');
        // Ensure URL doesn't end with slash
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }
    
    async testConnection() {
        try {
            log('Testing connection to Ollama server...');
            const response = await this._makeRequest('GET', '/api/tags');
            const success = response !== null;
            log(`Connection test result: ${success}`);
            return success;
        } catch (error) {
            logError('Ollama connection test failed:', error);
            return false;
        }
    }
    
    async getModels() {
        try {
            log('Fetching models from Ollama server...');
            const response = await this._makeRequest('GET', '/api/tags');
            if (response && response.models) {
                const modelNames = response.models.map(model => model.name);
                log(`Found ${modelNames.length} models: ${modelNames.join(', ')}`);
                return modelNames;
            }
            log('No models found in response');
            return [];
        } catch (error) {
            logError('Error fetching models:', error);
            return [];
        }
    }
    
    // Alias for getModels to maintain compatibility
    async listModels() {
        return this.getModels();
    }
    
    async generateResponse(prompt, model, onToken = null, onComplete = null, onError = null) {
        log("DEPRECATED: generateResponse is deprecated. Use chat() instead.");
        const requestData = {
            model: model || this._settings.get_string('current-model'),
            prompt: prompt,
            stream: this._settings.get_boolean('stream-response'),
        };
        
        log(`Generating response with model: ${requestData.model}, streaming: ${requestData.stream}`);
        
        try {
            if (requestData.stream && onToken) {
                await this._streamRequest('/api/generate', requestData, onToken, onComplete, onError);
            } else {
                const response = await this._makeRequest('POST', '/api/generate', requestData);
                if (response && response.response) {
                    if (onComplete) onComplete(response.response);
                    return response.response;
                }
            }
        } catch (error) {
            logError('Error generating response:', error);
            if (onError) onError(error);
            throw error;
        }
        
        return null;
    }
    
    async chat(messages, model, onToken, onComplete, onError) {
        const selectedModel = model || this._settings.get_string('current-model');
        const isStreaming = this._settings.get_boolean('stream-response');
        
        const requestData = {
            model: selectedModel,
            messages: messages,
            stream: isStreaming,
        };

        log(`Starting chat with model: ${selectedModel}, streaming: ${isStreaming}, messages: ${messages.length}`);

        try {
            if (requestData.stream && onToken) {
                log('Using streaming mode');
                await this._streamRequest('/api/chat', requestData, onToken, onComplete, onError);
            } else {
                log('Using non-streaming mode');
                const response = await this._makeRequest('POST', '/api/chat', requestData);
                if (response && response.message && response.message.content) {
                    log(`Non-streaming response received: ${response.message.content.length} chars`);
                    if (onComplete) onComplete(response.message.content);
                    return response.message.content;
                } else {
                    const errorMsg = 'Invalid response format from Ollama';
                    logError(errorMsg, response);
                    if (onError) onError(new Error(errorMsg));
                    throw new Error(errorMsg);
                }
            }
        } catch (error) {
            logError('Error in chat request:', error);
            if (onError) onError(error);
            throw error;
        }
        return null;
    }
    
    async _makeRequest(method, endpoint, data = null) {
        const fullUrl = `${this.baseUrl}${endpoint}`;
        log(`Making ${method} request to: ${fullUrl}`);
        
        return new Promise((resolve, reject) => {
            let uri;
            try {
                uri = GLib.Uri.parse(fullUrl, GLib.UriFlags.NONE);
            } catch (error) {
                logError(`Invalid URL: ${fullUrl}`, error);
                reject(new Error(`Invalid URL: ${fullUrl}`));
                return;
            }
            
            const message = new Soup.Message({
                method: method,
                uri: uri,
            });
            
            if (data) {
                try {
                    const jsonData = JSON.stringify(data);
                    message.set_request_body_from_bytes(
                        'application/json',
                        new GLib.Bytes(jsonData)
                    );
                    log(`Request data: ${jsonData.length} chars`);
                } catch (error) {
                    logError('Error serializing request data:', error);
                    reject(error);
                    return;
                }
            }
            
            this._session.send_and_read_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null,
                (session, result) => {
                    try {
                        const response = session.send_and_read_finish(result);
                        const statusCode = message.get_status();
                        
                        log(`Response status: ${statusCode}`);
                        
                        if (statusCode >= 200 && statusCode < 300) {
                            const responseText = new TextDecoder().decode(response.get_data());
                            log(`Response received: ${responseText.length} chars`);
                            
                            try {
                                const jsonResponse = JSON.parse(responseText);
                                resolve(jsonResponse);
                            } catch (parseError) {
                                log('Response is not JSON, returning as text');
                                resolve(responseText);
                            }
                        } else {
                            const errorMsg = `HTTP ${statusCode}: ${message.get_reason_phrase()}`;
                            logError(`Request failed: ${errorMsg}`);
                            reject(new Error(errorMsg));
                        }
                    } catch (error) {
                        logError('Error processing response:', error);
                        reject(error);
                    }
                }
            );
        });
    }
    
    async _streamRequest(endpoint, data, onToken, onComplete, onError) {
        const fullUrl = `${this.baseUrl}${endpoint}`;
        log(`Starting stream request to: ${fullUrl}`);
        
        return new Promise((resolve, reject) => {
            let uri;
            try {
                uri = GLib.Uri.parse(fullUrl, GLib.UriFlags.NONE);
            } catch (error) {
                logError(`Invalid URL: ${fullUrl}`, error);
                if (onError) onError(new Error(`Invalid URL: ${fullUrl}`));
                reject(error);
                return;
            }
            
            const message = new Soup.Message({
                method: 'POST',
                uri: uri,
            });
            
            try {
                const jsonData = JSON.stringify(data);
                message.set_request_body_from_bytes(
                    'application/json',
                    new GLib.Bytes(jsonData)
                );
                log(`Stream request data: ${jsonData.length} chars`);
            } catch (error) {
                logError('Error serializing stream request data:', error);
                if (onError) onError(error);
                reject(error);
                return;
            }
            
            let fullResponse = '';
            let tokenCount = 0;
            
            // Use modern libsoup3 streaming approach
            this._session.send_async(
                message,
                GLib.PRIORITY_DEFAULT,
                null,
                (session, result) => {
                    try {
                        const inputStream = session.send_finish(result);
                        const statusCode = message.get_status();
                        
                        log(`Stream request started with status: ${statusCode}`);
                        
                        if (statusCode < 200 || statusCode >= 300) {
                            const error = new Error(`HTTP ${statusCode}: ${message.get_reason_phrase()}`);
                            logError('Stream request failed:', error);
                            if (onError) onError(error);
                            reject(error);
                            return;
                        }
                        
                        // Start reading the stream
                        this._readStream(inputStream, endpoint, onToken, onComplete, onError, resolve, reject);
                        
                    } catch (error) {
                        logError('Error starting stream request:', error);
                        if (onError) onError(error);
                        reject(error);
                    }
                }
            );
        });
    }
    
    _readStream(inputStream, endpoint, onToken, onComplete, onError, resolve, reject) {
        let buffer = '';
        let fullResponse = '';
        let tokenCount = 0;
        let streamClosed = false;
        
        const closeStream = () => {
            if (!streamClosed) {
                streamClosed = true;
                try {
                    inputStream.close(null);
                    log('Stream closed successfully');
                } catch (closeError) {
                    logError('Error closing stream:', closeError);
                }
            }
        };
        
        const completeStream = (response) => {
            if (!streamClosed) {
                closeStream();
                if (onComplete) onComplete(response);
                resolve(response);
            }
        };
        
        const errorStream = (error) => {
            if (!streamClosed) {
                closeStream();
                if (onError) onError(error);
                reject(error);
            }
        };
        
        const readChunk = () => {
            if (streamClosed) {
                log('Stream already closed, stopping read');
                return;
            }
            
            const chunkSize = 8192; // 8KB chunks
            
            inputStream.read_bytes_async(
                chunkSize,
                GLib.PRIORITY_DEFAULT,
                null,
                (stream, result) => {
                    if (streamClosed) {
                        log('Stream closed during read operation');
                        return;
                    }
                    
                    try {
                        const chunk = stream.read_bytes_finish(result);
                        
                        if (chunk.get_size() === 0) {
                            // End of stream
                            log(`Stream ended naturally. Total tokens: ${tokenCount}, response length: ${fullResponse.length}`);
                            completeStream(fullResponse);
                            return;
                        }
                        
                        // Process the chunk
                        const chunkText = new TextDecoder().decode(chunk.get_data());
                        buffer += chunkText;
                        
                        // Process complete lines
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer
                        
                        lines.forEach(line => {
                            if (line.trim()) {
                                try {
                                    const jsonResponse = JSON.parse(line);
                                    
                                    // Handle both /api/generate and /api/chat streaming format
                                    let token = null;
                                    if (endpoint === '/api/chat') {
                                        if (jsonResponse.message && jsonResponse.message.content) {
                                            token = jsonResponse.message.content;
                                            fullResponse += token;
                                            tokenCount++;
                                        }
                                    } else { // /api/generate
                                        if (jsonResponse.response) {
                                            token = jsonResponse.response;
                                            fullResponse += token;
                                            tokenCount++;
                                        }
                                    }
                                    
                                    if (token && onToken) {
                                        onToken(token);
                                    }
                                    
                                    if (jsonResponse.done) {
                                        log(`Stream completed via done flag. Total tokens: ${tokenCount}, response length: ${fullResponse.length}`);
                                        completeStream(fullResponse);
                                        return;
                                    }
                                } catch (parseError) {
                                    logError('Error parsing streaming response line:', parseError);
                                    log(`Problematic line: ${line}`);
                                }
                            }
                        });
                        
                        // Continue reading only if stream is still open
                        if (!streamClosed) {
                            readChunk();
                        }
                        
                    } catch (error) {
                        if (error.message && error.message.includes('closed')) {
                            log('Stream was closed by remote server');
                            completeStream(fullResponse);
                        } else {
                            logError('Error reading stream chunk:', error);
                            errorStream(error);
                        }
                    }
                }
            );
        };
        
        // Start reading
        readChunk();
    }
    
    destroy() {
        log('Destroying OllamaClient');
        if (this._session) {
            this._session = null;
        }
    }
} 