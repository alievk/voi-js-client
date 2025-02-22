<template>
  <div class="app-container">
    <div v-if="!microphonePermissionGranted" class="permission-check">
      <div class="permission-content">
        <h2>Microphone Access Required</h2>
        <p>This app needs access to your microphone to function properly.</p>
        <button @click="checkMicrophonePermission" class="permission-button">
          Continue
        </button>
      </div>
    </div>
    <template v-else>
      <div class="main-content">
        <ConversationLog 
          :messages="messages" 
          :agentState="agentState"
        />
        
        <MessageInput 
          :isRecordingUserAudio="isRecordingUserAudio"
          :inputMode="inputMode"
          :agentState="agentState"
          :attachedImages="attachedImages"
          @start-recording="startRecordingUserAudio"
          @stop-recording="stopRecordingUserAudio"
          @stop-assistant-audio="stopAssistantAudio"
          @send-message="sendMessage"
          @image-uploaded="imageUploaded"
          @image-deleted="imageDeleted"
          @input-mode-change="mode => inputMode = mode"
          @system-message="addSystemMessage"
          @clean-messages="cleanMessages"
        />
      </div>

      <Sidebar 
        @activate-agent="handleActivateAgent"
        @send-prompt="handleSendPrompt"
        :systemMessages="systemMessages"
        :agents="agents"
        :llmResponse="llmResponse"
        :client="client"
        :agentState="agentState"
      />
    </template>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue'
import ConversationLog from './components/ConversationLog.vue'
import MessageInput from './components/MessageInput.vue'
import { VoiceAgentClient } from './services/VoiceAgentClient.js'
import { WavStreamPlayer } from '/src/lib/wavtools/index.js';
import { WavRecorder } from '/src/lib/wavtools/index.js';

export default {
  components: {
    Sidebar,
    ConversationLog,
    MessageInput
  },

  data() {
    const requiredEnvVars = [
      'VUE_APP_WS_HOST',
      'VUE_APP_WS_PORT',
      'VUE_APP_WS_TOKEN'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    return {
      messages: [],
      attachedImages: [],
      systemMessages: [],
      llmResponse: '',
      client: new VoiceAgentClient(
        process.env.VUE_APP_WS_HOST,
        process.env.VUE_APP_WS_PORT,
        process.env.VUE_APP_WS_TOKEN
      ),
      agentState: 'disconnected',
      audioStreamPlayer: null,
      audioRecorder: null,
      isRecordingUserAudio: false,
      inputMode: 'audio',
      agents: {},
      microphonePermissionGranted: false
    }
  },

  mounted() {
    this.audioRecorder = new WavRecorder({ sampleRate: 16000 });
    this.checkMicrophonePermission();
    this.agents = this.fetchAgents();
    this.setupEventListeners();
  },

  methods: {
    async checkMicrophonePermission() {
      const granted = await this.audioRecorder.requestPermission();
      this.microphonePermissionGranted = granted;
      if (!granted) {
        window.alert('Grant microphone access manually in browser settings.');
      }
    },

    setupEventListeners() {
      this.client.onStatus = (status) => {
        this.addSystemMessage(`Voice agent status: ${status}`);
        this.agentState = status;
      };

      this.client.onError = (error) => {
        this.addSystemMessage(`Voice agent error: ${error}`);
      };

      this.client.onMessage = (metadata, payload) => {
        if (metadata.type === 'audio') {
          this.audioStreamPlayer.add16BitPCM(payload, metadata.speech_id);
        } else if (metadata.type === 'message') {
          for (const item of metadata.content) {
            if (item.type === 'text') {
              this.updateMessages({
                role: metadata.role,
                content: item.text,
                timestamp: Date.now(),
                messageId: metadata.id
              });
            }
          }
        } else if (metadata.type === 'llm_response') {
          this.llmResponse = metadata.content;
        }
        this.addSystemMessage(`Received message with metadata: ${JSON.stringify(metadata)}`);
      };
    },

    updateMessages(data) {
      const { role, content, timestamp, messageId } = data;

      const existingMessageIndex = this.messages.findIndex(m => m.messageId === messageId);
      if (existingMessageIndex !== -1) {
        this.messages[existingMessageIndex] = { ...this.messages[existingMessageIndex], ...data };
      } else {
        this.messages.push({
          role,
          content,
          timestamp,
          messageId
        });
      }
    },

    cleanMessages() {
      this.messages = [];
    },

    addSystemMessage(message) {
      this.systemMessages.push({
        id: Date.now(),
        content: message,
        timestamp: Date.now()
      });
    },

    handleActivateAgent(agentName) {
      this.disconnect();
      this.cleanMessages();
      this.connect(agentName);
    },

    async connect(agentName) {
      this.audioStreamPlayer = new WavStreamPlayer({ sampleRate: 24000 });
      this.audioStreamPlayer.connect();
      await this.client.connect(agentName, this.agents[agentName]);
    },

    disconnect() {
      if (this.audioStreamPlayer) {
        this.audioStreamPlayer.interrupt();
        this.audioStreamPlayer = null;
      }
      this.client.disconnect();
    },

    async startRecordingUserAudio() {
      if (this.isRecordingUserAudio) return;
      try {
        await this.sendUserInterrupt();

        await this.audioRecorder.begin();
        await this.audioRecorder.record(
          (data) => {
            this.client.sendAudioChunk(data.mono);
          }
        );

        if (this.audioRecorder.getStatus() === 'recording') {
          this.isRecordingUserAudio = true;
          this.addSystemMessage('Started recording user audio');
        }
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    },

    async stopRecordingUserAudio() {
      if (!this.isRecordingUserAudio) return;
      const userAudio = await this.audioRecorder.end();
      this.sendAttachments();
      this.client.createResponse();
      this.isRecordingUserAudio = false;
      this.addAudioMessage(userAudio, 'user');
      this.addSystemMessage('Stopped recording user audio');
    },

    async stopAssistantAudio() {
      this.addSystemMessage('Stopping assistant audio');
      this.sendUserInterrupt();
    },

    addAudioMessage(audio, role) {
      this.updateMessages({
        role: role,
        content: audio.url,
        timestamp: Date.now(),
        messageId: 1000 + this.messages.length
      });
    },

    addImageMessage(image, role) {
      this.updateMessages({
        role: role,
        content: image,
        timestamp: Date.now(),
        messageId: 2000 + this.messages.length
      });
    },

    imageUploaded(image) {
      this.attachedImages.push(image);
    },

    imageDeleted(image) {
      this.attachedImages = this.attachedImages.filter(i => i.name !== image.name);
    },

    sendMessage(text) {
      if (text) {
        this.client.sendTextMessage(text);
        this.addSystemMessage(`Sent text message: ${text}`);
      }
      this.sendAttachments();
      this.client.createResponse();
      this.sendUserInterrupt();
    },

    sendAttachments() {
      if (this.attachedImages.length > 0) {
        for (const image of this.attachedImages) {
          this.client.sendImage(image.url);
          this.addImageMessage(image.base64, 'user');
          this.addSystemMessage(`Sent image: ${image.url}`);
        }
        this.attachedImages = [];
      }
    },

    async sendUserInterrupt() {
      const trackOffet = await this.audioStreamPlayer.interrupt();
      if (!trackOffet) return;
      this.client.cancelResponse(trackOffet.trackId, trackOffet.currentTime);
    },

    handleSendPrompt(data) {
      if (!this.client.isConnected()) {
        this.addSystemMessage('Cannot send prompt, client is not connected');
        return;
      }

      const conversation = this.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      this.client.invokeLLM(
        data.model,
        data.prompt,
        [{'role': 'user', 'content': conversation}]
      );
    },

    fetchAgents() {
      try {
        return require('/' + process.env['VUE_APP_AGENTS_FILE'] || '/config/agents.example.json');
      } catch (error) {
        this.addSystemMessage(`Error loading agents: ${error}`);
        return [];
      }
    }
  },
}
</script>

<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
}

.app-container {
  display: flex;
  height: 100vh;
}

.permission-check {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
}

.permission-content {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.permission-button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  color: white;
  background-color: #4CAF50;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.permission-button:hover {
  background-color: #45a049;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  background-color: #ffffff;
}
</style>
