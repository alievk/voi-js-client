<template>
  <div class="audio-streamer" ref="audioStreamer" @paste="handlePaste">
    <div class="input-wrapper">
      <div v-if="image" class="image-preview">
        <img :src="image.data" alt="Pasted image" />
        <button class="delete-button" @click="deleteImage">×</button>
      </div>
      <div class="text-input-container">
        <input 
          type="text" 
          v-model="textMessage" 
          placeholder="Type a message..."
          @keyup.enter="sendMessage"
          @paste="handlePaste"
        >
        <button 
          @click="sendMessage" 
          :class="['button', 'send-button']"
          :disabled="!(agentState == 'ready' && (textMessage.trim().length > 0 || image))"
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
  </div>
</template>

<script>
import MicButton from './MicButton.vue'
import { uploadImage, decodeBase64Image } from '../services/AWSImageUploader.js';

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
      textMessage: '',
      image: null,
    }
  },
  mounted() {
    window.addEventListener('paste', this.handlePaste);
  },
  beforeDestroy() {
    window.removeEventListener('paste', this.handlePaste);
  },
  methods: {
    sendMessage() {
      const text = this.textMessage.trim();
      if (!text && !this.image) return;
      this.$emit('send-message', text, this.image);
      this.textMessage = '';
      this.image = null;
    },

    handlePaste(event) {
      const items = event.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          const file = item.getAsFile();
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            const imageData = e.target.result;
            const imageBuffer = decodeBase64Image(imageData);
            const imageUrl = await uploadImage(imageBuffer, "voi-js-client-image.png");
            this.image = {
              data: imageData,
              url: imageUrl,
              name: "voi-js-client-image.png"
            }
          };
          reader.onerror = (e) => console.error('FileReader error:', e);
          reader.readAsDataURL(file);
          break;
        }
      }
    },
    
    deleteImage() {
      this.image = null;
    }
  }
}
</script>

<style scoped>
.audio-streamer {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 80px 20px 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-wrapper {
  width: 100%;
  max-width: 500px;
  position: relative;
}

.text-input-container {
  display: flex;
  gap: 8px;
  width: 100%;
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

.image-preview {
  position: absolute;
  bottom: 100%;
  left: 12px;
  margin-bottom: 10px;
  width: 80px;
  height: 80px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background-color: #f9fafb;
}

.delete-button {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ff4444;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}

.delete-button:hover {
  background: #ff0000;
}
</style>
