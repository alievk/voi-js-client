<template>
  <div class="system-output-container">
    <div id="system-output" ref="outputContainer">
      <div v-for="message in systemMessages" :key="message.id" class="system-message">
        <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
        {{ message.content }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    systemMessages: {
      type: Array,
      default: () => []
    }
  },
  watch: {
    systemMessages: {
      handler() {
        this.$nextTick(() => {
          const container = this.$refs.outputContainer;
          container.scrollTop = container.scrollHeight;
        });
      },
      deep: true
    }
  },
  methods: {
    formatTime(timestamp) {
      try {
        // Use current time if timestamp is undefined
        const time = timestamp || Date.now();
        const date = new Date(Number(time));
        if (isNaN(date.getTime())) {
          return 'Invalid time';
        }
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
        return `${hours}:${minutes}:${seconds}.${milliseconds}`;
      } catch (e) {
        return 'Invalid time';
      }
    }
  }
}
</script>

<style scoped>
.system-output-container {
  width: 100%;
  display: flex;
}

#system-output {
  width: 100%;
  height: 120px;
  overflow-y: auto;
  border: 2px solid #e1e1e1;
  padding: 8px;
  border-radius: 12px;
  background-color: #f8f9fa;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.system-message {
  padding: 2px 4px;
  margin-bottom: 2px;
  color: #333;
  line-height: 1.2;
}

.timestamp {
  color: #666;
  font-size: 0.9em;
  margin-right: 6px;
}
</style>
