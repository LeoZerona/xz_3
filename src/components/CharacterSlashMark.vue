<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <view class="slash-mark" :class="{ 'is-active': active }" aria-hidden="true">
    <text class="slash-mark__glyph">斩</text>
  </view>
</template>

<style scoped>
.slash-mark {
  display: inline-grid;
  width: 1em;
  height: 1em;
  line-height: 1;
  pointer-events: none;
}

.slash-mark__glyph { grid-area: 1 / 1; }

/* 两片字形在中部轻微转折，透明折缝适配按钮底色；不支持裁切时保留完整字。 */
@supports (clip-path: polygon(0 0, 100% 0, 100% 100%)) {
  .slash-mark.is-active .slash-mark__glyph {
    clip-path: polygon(0 0, 100% 0, 100% 28%, 54% 52%, 46% 49%, 0 74%);
    transform-origin: 50% 51%;
    transform: translate(-0.025em, -0.02em) rotate(-4deg);
  }

  .slash-mark.is-active::after {
    content: '斩';
    grid-area: 1 / 1;
    clip-path: polygon(0 74%, 46% 49%, 54% 52%, 100% 28%, 100% 100%, 0 100%);
    transform-origin: 50% 51%;
    transform: translate(0.025em, 0.025em) rotate(4deg);
  }
}
</style>
