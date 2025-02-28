export class VoiceAgentClient {
    constructor(hostname, port, token) {
        if (!hostname || !port || !token) {
            throw new Error('Missing required parameters');
        }
        this.hostname = hostname;
        this.port = port; 
        this.token = token;
        this.socket = null;
        this.closeReason = null;
        this.status = 'disconnected';
        this.onStatus = null;
        this.onError = null;
        this.onMessage = null;
    }
  
    async connect(agentName, agentConfig = null, streamUserStt = true, finalSttCorrection = true, 
      streamOutputAudio = true, initGreeting = true) {
        if (!agentName) {
            throw new Error('agentName is required');
        }

        const CONNECTION_TIMEOUT = 5000;
        
        return new Promise((resolve, reject) => {
          this.disconnect();

          const wsUrl = `wss://${this.hostname}:${this.port}/ws?token=${encodeURIComponent(this.token)}`;
          this.socket = new WebSocket(wsUrl);
          this.closeReason = null;
  
          this.socket.onopen = () => {
            this._onStatus('connected');
            resolve();

            if (agentConfig) {
              agentConfig = JSON.stringify(agentConfig);
            }

            this._sendJson({
              type: 'init',
              agent_name: agentName,
              agent_config: agentConfig,
              stream_user_stt: streamUserStt,
              final_stt_correction: finalSttCorrection,
              stream_output_audio: streamOutputAudio,
              init_greeting: initGreeting
            });
            this._onStatus('activating');
          };
  
          this.socket.onerror = () => {
            this._onError('WebSocket connection error');
            reject();
          };
  
          this.socket.onclose = (event) => {
            this.closeReason = this._getCloseReason(event.code);
            this._onStatus('disconnected');
          };

          this.socket.onmessage = this._socketMessageHandler;

          setTimeout(() => {
            if (!this.isConnected()) {
              reject(new Error('WebSocket connection timed out'));
            }
          }, CONNECTION_TIMEOUT);
        });
    }
  
    disconnect() {
      if (this.isConnected()) {
        this.socket.close(1000, 'Normal closure');
        this.socket = null;
        this.closeReason = 'Normal closure';
        this._onStatus('disconnected');
      }
    }
  
    isConnected() {
      return this.socket && this.socket.readyState === WebSocket.OPEN;
    }

    sendAudioChunk(chunk) {
      const metadata = {
        type: 'audio'
      };
      const blob = this._serializeMessage(metadata, chunk);
      this._send(blob);
    }

    sendTextMessage = (message) => {
      this._sendJson({
          type: 'text',
          content: message
      });
    }

    sendBlob = (blob, type) => {
      const metadata = {
        type: type
      };
      const data = this._serializeMessage(metadata, blob);
      this._send(data);
    }

    sendImage = (imageUrl) => {
      this._sendJson({
          type: 'image_url',
          image_url: imageUrl
      });
    }
    
    createResponse = () => {
      this._sendJson({
          type: 'create_response'
      });
    }

    cancelResponse = (id, interruptedAt) => {
      this._sendJson({ 
          type: 'interrupt',
          speech_id: id,
          interrupted_at: interruptedAt
      });
    }

    invokeLLM = (model, prompt, messages) => {
      this._sendJson({
          type: 'invoke_llm',
          model: model,
          prompt: prompt,
          messages: messages
      });
    }

    async getMetrics() {
      try {
        const apiKey = process.env.VUE_APP_API_KEY;
        if (!apiKey) {
          throw new Error('VUE_APP_API_KEY environment variable is not defined');
        }

        const response = await fetch(`https://${this.hostname}:${this.port}/metrics`, {
          headers: {
            'API-Key': apiKey
          }
        });
        if (!response.ok) {
          throw new Error(`Response status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        this._onError(`Failed to fetch metrics: ${error.message}`);
        return { active_connections: 0 };
      }
    }

    _send = (data) => {
      if (this.isConnected()) {
        try {
          this.socket.send(data);
        } catch (error) {
          this._onError(`Failed to send message: ${error}`);
        }
      } else {
        this._onError('Failed to send message because WebSocket is not connected');
      }
    };
  
    _sendJson = (data) => {
      try {
        const blob = this._serializeMessage(data);
        this._send(blob);
      } catch (error) {
        this._onError(`Failed to stringify message: ${error.message}`);
      }
    };

    _parseMessage = async (data) => {
        const arrayBuffer = await data.arrayBuffer();
        const dataView = new DataView(arrayBuffer);
        const metadataLength = dataView.getUint32(0);
        const metadata = JSON.parse(new TextDecoder().decode(arrayBuffer.slice(4, 4 + metadataLength)));
        const payload = arrayBuffer.slice(4 + metadataLength);
        return { metadata, payload };
    }

    _serializeMessage = (metadata, payload) => {
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
      const metadataLengthBuffer = new ArrayBuffer(4);
      new DataView(metadataLengthBuffer).setUint32(0, metadataBytes.length);
      return new Blob([
          metadataLengthBuffer,
          metadataBytes,
          payload
      ]);
    }

    _socketMessageHandler = async (event) => {
      try {
          const { metadata, payload } = await this._parseMessage(event.data);
          if (metadata.type === 'message' || metadata.type === 'audio' || metadata.type === 'llm_response') {
            if (this.onMessage) {
              this.onMessage(metadata, payload);
            }
          } else if (metadata.type === 'status') {
            if (metadata.status === 'response_created') {
              this._onStatus('busy');
            } else if (metadata.status === 'init_done' || metadata.status === 'response_cancelled' || metadata.status === 'response_done') {
              this._onStatus('ready');
            }
          } else if (metadata.type === 'error') {
            this._onError(`Server error: ${metadata.error}`);
          } else {
            this._onError(`Unknown message type: ${metadata.type}`);
          }
      } catch (error) {
          this._onError(`Failed to process message: ${error.message}`);
      }
    }

    _onStatus(status) {
        if (this.status === status) {
            return;
        }
        this.status = status;
        if (this.onStatus) {
            this.onStatus(status);
        }
    }

    _onError = (error) => {
      if (this.onError) {
        this.onError(error);
      }
    }
  
    _getCloseReason = (code) => {
      const codes = {
        1000: 'Normal closure',
        1001: 'Going away - client/server is disconnecting',
        1002: 'Protocol error',
        1003: 'Unsupported data',
        1004: 'Reserved',
        1005: 'No status received',
        1006: 'Abnormal closure - connection dropped',
        1007: 'Invalid frame payload data',
        1008: 'Policy violation',
        1009: 'Message too big',
        1010: 'Mandatory extension missing',
        1011: 'Internal server error',
        1012: 'Service restart',
        1013: 'Try again later',
        1014: 'Bad gateway',
        1015: 'TLS handshake failure'
      };
      return codes[code] || `Unknown code: ${code}`;
    };
}