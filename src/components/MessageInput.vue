<template>
  <div class="audio-streamer" ref="audioStreamer">
    <div class="text-input-container">
      <input 
        type="text" 
        v-model="textMessage" 
        placeholder="Type a message..."
        @keyup.enter="sendTextMessage"
      >
      <button 
        @click="sendTextMessage" 
        :class="['button', 'send-button']"
        :disabled="agentState !== 'ready'"
      >
        Send
      </button>
      <MicButton 
        :is-recording="isRecordingUserAudio"
        :enabled="agentState === 'ready'"
        @start-recording="$emit('start-recording')"
        @stop-recording="$emit('stop-recording')"
      />
    </div>
  </div>
</template>

<script>
import MicButton from './MicButton.vue'

export default {
  components: {
    MicButton
  },
  props: {
    isRecordingUserAudio: Boolean,
    agentState: String
  },
  data() {
    return {
      textMessage: ''
    }
  },
  methods: {
    sendTextMessage() {
      if (!this.textMessage.trim()) return;
      this.$emit('send-text', this.textMessage.trim());
      this.textMessage = '';
    }
  }
}
</script>

<style scoped>
.audio-streamer {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.text-input-container {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 500px;
  align-items: center;
}

.button {
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #ffffff;
  color: #333333;
  
  &:hover {
    background-color: #f3f4f6;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 14px;
}

.send-button {
  background-color: #ffffff;
  color: #333333;
  border-color: #2ecc71;
  min-width: 80px;
}

.send-button:hover {
  background-color: #f0fff4;
}

.send-button:active {
  background-color: #2ecc71;
  color: white;
}
</style>
