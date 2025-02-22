<template>
  <div id="conversation-log" ref="conversationLog">
    <div v-if="agentState === 'disconnected'" class="status-message">
      Here will appear your conversation
    </div>
    <div v-else-if="agentState === 'activating'" class="status-message">
      Activating...
    </div>
    <div v-for="message in messages" :key="message.timestamp">
      <div :class="['message-meta', message.role]">
        {{ formatTimestamp(message.timestamp) }} • {{ message.role }}
      </div>
      <div :class="['message-bubble', message.role, isAudioMessage(message.content) ? 'audio-message' : isImageMessage(message.content) ? 'image-message' : '']">
        <audio v-if="isAudioMessage(message.content)" controls>
          <source :src="message.content" type="audio/wav">
        </audio>
        <img v-else-if="isImageMessage(message.content)" :src="message.content" class="message-image">
        <span v-else class="content">{{ message.content }}</span>
      </div>
    </div>
    <div v-if="agentState === 'busy'" class="message-bubble assistant">
      <span class="content">...</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    messages: Array,
    agentState: {
      type: String,
      default: 'disconnected'
    }
  },
  methods: {
    isAudioMessage(content) {
      return content.startsWith('blob:') || content.startsWith('http');
    },
    isImageMessage(content) {
      return content.startsWith('data:image');
    },
    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.conversationLog) {
          this.$refs.conversationLog.scrollTop = this.$refs.conversationLog.scrollHeight;
        }
      });
    },
    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
    }
  },
  watch: {
    messages: {
      handler() {
        this.scrollToBottom();
      },
      deep: true
    }
  }
}
</script>

<style scoped>
#conversation-log {
  flex: 1;
  width: 100%;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
  padding: 15px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.message-bubble {
  margin-bottom: 16px;
  padding: 10px;
  border-radius: 8px;
  max-width: 70%;
  width: fit-content;
  
  &.assistant {
    background-color: #ffffff;
    margin-right: auto;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  &.user {
    background-color: #e8f5e9;
    margin-left: auto;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  &.audio-message {
    background-color: transparent;
    box-shadow: none;
  }
  
  &.image-message {
    background-color: transparent;
    box-shadow: none;
    padding: 0;
  }
}

.timestamp {
  font-weight: bold;
  color: #6c757d;
}

.content {
  white-space: pre-wrap;
  color: #212529;
}

.status-message {
  font-style: italic;
  text-align: center;
  color: #6c757d;
  padding: 20px;
}

.message-meta {
  font-size: 0.8em;
  color: #6c757d;
  margin-bottom: 4px;
  padding: 0 10px;
  text-align: left;
}

.message-meta.user {
  text-align: right;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}
</style>
