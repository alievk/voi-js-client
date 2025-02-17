<template>
  <div class="audio-streamer" ref="audioStreamer">
    <div class="input-wrapper">
      <div v-for="image in attachedImages" :key="image.name" class="image-preview">
        <img :src="image.base64" alt="Pasted image" />
        <button class="delete-button" @click="deleteImage(image)">×</button>
      </div>
      <div v-if="loadingImage" class="image-preview">
        <img :src="loadingImage.base64" alt="Loading image" />
      </div>
      <div class="text-input-container">
        <input 
          type="text" 
          v-model="textMessage" 
          placeholder="Type a message..."
          @keyup.enter="sendMessage"
          :disabled="!(agentState == 'ready')"
        >
        <button 
          @click="sendMessage" 
          :class="['button', 'send-button']"
          :disabled="!(agentState == 'ready')"
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
import { v4 as uuidv4 } from 'uuid';
import MicButton from './MicButton.vue'
import { uploadImage, decodeBase64Image } from '../services/AWSImageUploader.js';

export default {
  components: {
    MicButton
  },
  props: {
    isRecordingUserAudio: Boolean,
    agentState: String,
    attachedImages: Array
  },
  data() {
    return {
      textMessage: '',
      loadingImage: null
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
      this.$emit('send-message', this.textMessage);
      this.textMessage = '';
      this.loadingImage = null;
    },

    handlePaste(event) {
      if (this.attachedImages.length >= 3) return;
      const items = event.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          const file = item.getAsFile();
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            const imageBase64 = e.target.result;
            const imagePng = decodeBase64Image(imageBase64);
            const imageName = uuidv4();
            this.showLoadingImage({
              base64: imageBase64,
              name: imageName
            });
            const imageUrl = await uploadImage(imagePng, imageName);
            this.showLoadingImage(null);
            const imageData = {
              base64: imageBase64,
              url: imageUrl,
              name: imageName
            }
            this.$emit('image-uploaded', imageData);
          };
          reader.onerror = (e) => console.error('FileReader error:', e);
          reader.readAsDataURL(file);
          break;
        }
      }
    },
    
    deleteImage(image) {
      this.$emit('image-deleted', image);
    },

    showLoadingImage(image) {
      this.loadingImage = image;
    }
  }
}
</script>

<style scoped>
.audio-streamer {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px 20px 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.input-wrapper {
  width: 100%;
  max-width: 500px;
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  position: relative;
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
