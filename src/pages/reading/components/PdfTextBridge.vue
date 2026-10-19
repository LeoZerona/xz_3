<script lang="ts">
// renderjs 的 callMethod 要求 Options API methods，uni-app 尚不支持 script setup。
import { defineComponent, markRaw, onBeforeUnmount, shallowRef } from 'vue'
import { createPdfTextBridge } from '../../../reading/pdfTextBridge'
import type { PdfTextRequest } from '../../../reading/pdfTextBridge'

export default defineComponent({
  setup() {
    const request = shallowRef<PdfTextRequest | null>(null)
    const bridge = markRaw(createPdfTextBridge(
      (value) => { request.value = value },
      (buffer) => uni.arrayBufferToBase64(buffer),
    ))
    onBeforeUnmount(bridge.dispose)
    return { request, bridge }
  },
  methods: {
    extract(buffer: ArrayBuffer): Promise<string> {
      return this.bridge.extract(buffer)
    },
    handleResult(result: unknown): void {
      this.bridge.handleResult(result)
    },
  },
})
</script>

<script module="pdfText" lang="renderjs">
let parserPromise

function loadParser() {
  if (!parserPromise) {
    parserPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = './static/pdf/pdf-text-parser.js'
      script.onload = () => {
        if (window.ReadingPdfText) resolve(window.ReadingPdfText)
        else reject(new Error('PDF 文字提取模块未正确加载'))
      }
      script.onerror = () => reject(new Error('PDF 文字提取模块加载失败，请重新运行应用'))
      document.head.appendChild(script)
    }).catch((error) => {
      parserPromise = undefined
      throw error
    })
  }
  return parserPromise
}

export default {
  methods: {
    async onRequest(request, previous, ownerInstance) {
      if (!request) return
      let result
      try {
        const parser = await loadParser()
        const text = await parser.extractTextFromBase64(request.base64)
        result = { id: request.id, text }
      } catch (error) {
        result = { id: request.id, error: error instanceof Error ? error.message : String(error) }
      }
      ownerInstance.callMethod('handleResult', result)
    },
  },
}
</script>

<template>
  <view class="pdf-text-bridge" :request="request" :change:request="pdfText.onRequest" aria-hidden="true" />
</template>

<style scoped>
.pdf-text-bridge { position: absolute; width: 0; height: 0; overflow: hidden; pointer-events: none; }
</style>
