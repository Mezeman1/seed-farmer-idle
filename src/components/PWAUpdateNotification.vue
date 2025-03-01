<template>
    <div v-if="needRefresh" class="pwa-toast" role="alert">
        <div class="message">
            <span>New version available</span>
        </div>
        <div class="buttons">
            <button @click="updateServiceWorker()" class="refresh-button">
                Refresh
            </button>
            <button @click="close" class="close-button">
                Close
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Props and emits
const emit = defineEmits(['update', 'close'])

// State
const needRefresh = ref(false)

// Methods
const showRefreshUI = () => {
    needRefresh.value = true
}

const updateServiceWorker = () => {
    needRefresh.value = false
    emit('update')
}

const close = () => {
    needRefresh.value = false
    emit('close')
}

// Expose methods to parent components
defineExpose({
    showRefreshUI
})
</script>

<style scoped>
.pwa-toast {
    position: fixed;
    right: 0;
    bottom: 0;
    margin: 16px;
    padding: 12px;
    border: 1px solid #8885;
    border-radius: 4px;
    z-index: 100;
    text-align: left;
    box-shadow: 3px 4px 5px 0 #8885;
    background-color: white;
}

.pwa-toast .message {
    margin-bottom: 8px;
}

.pwa-toast .buttons {
    display: flex;
    gap: 8px;
}

.pwa-toast .buttons button {
    border: 1px solid #8885;
    outline: none;
    padding: 8px;
    border-radius: 2px;
    cursor: pointer;
}

.pwa-toast .buttons .refresh-button {
    color: #fff;
    background-color: #4caf50;
}

.pwa-toast .buttons .close-button {
    color: #000;
    background-color: #f1f1f1;
}

/* Dark mode support */
:global(.dark) .pwa-toast {
    background-color: #1a1a1a;
    color: #fff;
    border-color: #444;
}

:global(.dark) .pwa-toast .buttons .close-button {
    color: #fff;
    background-color: #333;
}
</style>
