<template>
  <view class="home">
    <view class="topbar">
      <view class="brand">
        <view class="brand-mark"><van-icon name="smile-o" size="22" /></view>
        <text class="brand-name">晨间计划</text>
      </view>
      <view class="avatar" aria-label="用户头像">M</view>
    </view>

    <view class="intro">
      <text class="eyebrow">{{ dateLabel }} · {{ weekdayLabel }}</text>
      <text class="headline">{{ greeting }}，<text class="headline-accent">新的一天</text></text>
      <text class="subtitle">慢慢来，把今天过成喜欢的样子。</text>
    </view>

    <view class="hero-card">
      <canvas id="heroCanvas" canvas-id="heroCanvas" class="hero-canvas" aria-hidden="true" />
      <view class="hero-content">
        <view class="hero-topline"><text class="hero-pill">✦ 今日灵感</text><text class="hero-number">01 / 03</text></view>
        <image class="sunrise" src="/static/sunrise.svg" mode="aspectFit" alt="日出图案" />
        <text class="hero-title">先开始，再变得更好。</text>
        <text class="hero-copy">给自己的每一步，一点掌声。</text>
        <van-button round class="hero-button" color="#fff" @click="scrollToTasks">
          <text>开始今天</text><van-icon name="arrow" size="14" />
        </van-button>
      </view>
    </view>

    <view class="summary">
      <view class="summary-icon"><van-icon name="chart-trending-o" size="23" /></view>
      <view class="summary-content">
        <view class="summary-head"><text>今日进度</text><text class="summary-count">{{ day.completedCount }} / {{ tasks.length }}</text></view>
        <van-progress :percentage="day.progress" :show-pivot="false" color="#7561ec" track-color="#ece9f7" stroke-width="7" />
        <text class="summary-caption">{{ day.completedCount === tasks.length ? '太棒了，今天的计划都完成啦！' : '每完成一件小事，都值得庆祝。' }}</text>
      </view>
    </view>

    <view id="today-tasks" class="section-heading">
      <view><text class="section-kicker">TODAY'S PLAN</text><text class="section-title">今天要做的事</text></view>
      <text class="section-total">共 {{ tasks.length }} 项</text>
    </view>

    <view class="task-list">
      <view v-for="task in tasks" :key="task.id" class="task-card" :class="{ 'task-done': day.completed.includes(task.id) }" @click="day.toggle(task.id)">
        <view class="task-icon" :class="task.tone"><van-icon :name="task.icon" size="24" /></view>
        <view class="task-body"><text class="task-title">{{ task.title }}</text><text class="task-detail">{{ task.detail }}</text><text class="task-time">{{ task.time }}</text></view>
        <view class="task-check" :class="{ checked: day.completed.includes(task.id) }" :aria-label="day.completed.includes(task.id) ? '标记未完成' : '标记完成'">
          <van-icon v-if="day.completed.includes(task.id)" name="success" size="14" />
        </view>
      </view>
    </view>

    <view class="closing-note"><text>✦</text><text>今天也请温柔地对待自己</text><text>✦</text></view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { tasks, useDayStore } from '@/stores/day'

const day = useDayStore()
const now = new Date()
const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日`
const weekdayLabel = weekdays[now.getDay()]
const greeting = computed(() => now.getHours() < 11 ? '早上好' : now.getHours() < 18 ? '下午好' : '晚上好')

function scrollToTasks() {
  uni.pageScrollTo({ selector: '#today-tasks', duration: 300 })
}

function drawHero() {
  const ctx = uni.createCanvasContext('heroCanvas')
  ctx.setStrokeStyle('rgba(255,255,255,0.14)')
  ctx.setLineWidth(1)
  for (let radius = 48; radius <= 300; radius += 46) {
    ctx.beginPath()
    ctx.arc(322, 85, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.draw()
}

onMounted(() => {
  void day.hydrate()
  drawHero()
})
</script>

<style scoped>
.home { width: min(100%, 560px); min-height: 100vh; margin: 0 auto; padding: max(20px, env(safe-area-inset-top)) 22px 40px; color: #28283c; }
.topbar, .brand, .intro, .summary, .summary-head, .section-heading, .task-card, .closing-note { display: flex; }
.topbar, .section-heading, .summary-head { align-items: center; justify-content: space-between; }
.brand { align-items: center; gap: 9px; }
.brand-mark { width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; color: #fff; background: #6e59e8; box-shadow: 0 5px 12px #6e59e833; }
.brand-name { font-weight: 800; font-size: 17px; letter-spacing: .02em; }
.avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #745e5e; font-weight: 700; background: #f5ded6; border: 2px solid #fff; box-shadow: 0 2px 10px #29203b12; }
.intro { flex-direction: column; margin: 33px 0 24px; }
.eyebrow { color: #8d8a9a; font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.headline { display: block; margin-top: 8px; font-size: clamp(29px, 8vw, 38px); line-height: 1.25; font-weight: 800; letter-spacing: -.04em; }
.headline-accent { color: #705ceb; }
.subtitle { margin-top: 10px; color: #9293a0; font-size: 13px; }
.hero-card { position: relative; height: 253px; overflow: hidden; border-radius: 24px; background: linear-gradient(125deg, #8e78f5 0%, #6f5bea 52%, #5946d3 100%); box-shadow: 0 18px 28px #6653d338; }
.hero-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.hero-content { position: relative; z-index: 1; height: 100%; padding: 22px 24px; color: #fff; }
.hero-topline { display: flex; justify-content: space-between; align-items: center; }
.hero-pill { padding: 6px 11px; background: #ffffff30; border: 1px solid #ffffff30; border-radius: 30px; font-size: 11px; font-weight: 700; }
.hero-number { color: #ffffffa8; font-size: 11px; letter-spacing: .1em; }
.sunrise { position: absolute; top: 48px; right: 17px; width: 76px; height: 76px; opacity: .94; }
.hero-title { display: block; margin-top: 45px; font-size: 23px; font-weight: 800; letter-spacing: -.03em; }
.hero-copy { display: block; margin-top: 5px; color: #ffffffc4; font-size: 12px; }
.hero-button { margin-top: 17px; height: 34px; padding: 0 15px; color: #6957e3 !important; font-size: 12px; font-weight: 700; }
.hero-button :deep(.van-button__content) { gap: 5px; }
.summary { align-items: flex-start; gap: 14px; margin-top: 22px; padding: 18px 17px; border-radius: 18px; background: #fff; box-shadow: 0 7px 22px #48406a0a; }
.summary-icon { flex: none; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 13px; color: #7561ec; background: #f0edff; }
.summary-content { flex: 1; min-width: 0; }
.summary-head { margin: 1px 0 12px; font-size: 13px; font-weight: 800; }
.summary-count { color: #7561ec; font-size: 13px; }
.summary-caption { display: block; margin-top: 9px; color: #a5a4ae; font-size: 11px; }
.section-heading { align-items: end; margin: 32px 0 15px; }
.section-heading > view { display: flex; flex-direction: column; }
.section-kicker { color: #9b8fdb; font-size: 10px; letter-spacing: .16em; font-weight: 800; }
.section-title { margin-top: 3px; font-size: 20px; font-weight: 800; }
.section-total { margin-bottom: 3px; color: #aaa8b4; font-size: 12px; }
.task-list { display: flex; flex-direction: column; gap: 11px; }
.task-card { align-items: center; gap: 13px; min-height: 91px; padding: 15px 15px; border-radius: 16px; background: #fff; box-shadow: 0 5px 18px #48406a09; cursor: pointer; transition: transform .15s ease; }
.task-card:active { transform: scale(.985); }
.task-icon { flex: none; display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 14px; }
.lavender { background: #eeeafe; color: #7a64e8; }.peach { background: #fff0e5; color: #e9a071; }.mint { background: #e5f6ef; color: #69b894; }
.task-body { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.task-title { color: #303044; font-size: 13px; font-weight: 800; }
.task-detail { margin-top: 3px; color: #a5a5af; font-size: 10px; }
.task-time { margin-top: 6px; color: #8e80ca; font-size: 10px; font-weight: 700; }
.task-check { flex: none; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; border: 1.5px solid #dcdbe5; border-radius: 50%; color: #fff; }
.task-check.checked { border-color: #7561ec; background: #7561ec; }
.task-done .task-title { text-decoration: line-through; color: #aaa8b4; }
.closing-note { align-items: center; justify-content: center; gap: 13px; margin-top: 30px; color: #b4adbc; font-size: 11px; letter-spacing: .07em; }
.closing-note text:first-child, .closing-note text:last-child { color: #c1a9e4; }
@media (max-width: 360px) { .home { padding-left: 16px; padding-right: 16px; }.sunrise { width: 60px; height: 60px; right: 9px; }.hero-title { font-size: 20px; } }
</style>
