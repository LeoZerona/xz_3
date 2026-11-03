<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LearningHistory } from './history'
import type { HistoryPageKind } from './useHistoryPage'
import type { StudyCharacterEntry } from '../study/types'
const props = defineProps<{ kind: HistoryPageKind; history: LearningHistory; date: string; month: Date; monthLabel: string; rangeDays: number; sessionId: string; characters: StudyCharacterEntry[] }>()
const emit = defineEmits<{ (event: 'open', url: string): void; (event: 'month-change', delta: number): void; (event: 'range-change', days: number): void }>()
const pageSize = ref(50)
const sessions = computed(() => [...new Set(props.history.events.map(event => event.sessionId))].map(id => ({ id, source: props.history.events.find(event => event.sessionId === id)!.source, count: props.history.events.filter(event => event.sessionId === id && event.kind === 'answer').length })))
const labels: Record<string, string> = { daily: '日常学习', level: '关卡学习', review: '正式复习', practice: '独立专项', reading: '阅读' }
const events = computed(() => props.history.events.filter(event => !props.sessionId || event.sessionId === props.sessionId).slice().reverse().slice(0, pageSize.value))
const calendar = computed(() => [...Array.from({ length: props.month.getDay() }, () => null), ...props.history.days])
const totals = computed(() => props.history.days.reduce((sum, day) => ({ newCount: sum.newCount + day.newCount, reviewCount: sum.reviewCount + day.reviewCount, seconds: sum.seconds + day.studySeconds, practiceCount: sum.practiceCount + day.practiceCount }), { newCount: 0, reviewCount: 0, seconds: 0, practiceCount: 0 }))
function glyph(id: string | null): string { return props.characters.find(entry => entry.id === id)?.script_forms.simplified ?? '' }
function openDay(date: string): void { emit('open', `/pages/learning-day/index?date=${encodeURIComponent(date)}`) }
</script>
<template>
  <template v-if="kind === 'overview'">
    <div class="feature-hero"><p class="feature-muted">本机学习档案</p><h2>累计已学 {{ history.summary.learnedCount }} 字</h2><p class="feature-muted">当前连续 {{ history.summary.currentStreak }} 天 · 最长连续 {{ history.summary.longestStreak }} 天</p></div>
    <div class="feature-stats"><div><strong>{{ Math.floor(history.summary.studySeconds / 60) }}</strong><span>有效学习分钟</span></div><div><strong>{{ history.summary.reviewCount }}</strong><span>正式复习次数</span></div><div><strong>{{ history.summary.activeDates.length }}</strong><span>有学习活动的日期</span></div></div>
    <div class="feature-list"><button v-for="item in [{label:'学习日历',path:'learning-calendar'},{label:'复习中心与错题',path:'review-center'},{label:'专项练习',path:'practice-setup'},{label:'识字测评',path:'literacy'},{label:'7 / 30 天学习回顾',path:'learning-report'},{label:'学习设置',path:'learning-settings'}]" :key="item.path" role="button" class="feature-row" @click="emit('open', `/pages/${item.path}/index`)"><span class="feature-row-copy">{{ item.label }}</span><span>→</span></button></div>
    <h2 class="feature-section-title">课程覆盖</h2><div v-for="item in history.coverage" :key="item.level" class="coverage-line"><p>第 {{ item.level }} 级 · {{ item.learned }}/{{ item.total }} 字</p><div class="history-track" role="meter" :aria-label="`第${item.level}级课程覆盖`" :aria-valuenow="item.learned" aria-valuemin="0" :aria-valuemax="item.total"><i :style="{ width: `${item.total ? item.learned / item.total * 100 : 0}%` }" /></div></div>
  </template>
  <template v-else-if="kind === 'calendar'">
    <div class="feature-row"><button role="button" class="feature-link" aria-label="上个月" @click="emit('month-change', -1)">‹ 上月</button><strong class="feature-row-copy">{{ monthLabel }}</strong><button role="button" class="feature-link" aria-label="下个月" @click="emit('month-change', 1)">下月 ›</button></div>
    <div class="history-calendar"><span v-for="day in ['日','一','二','三','四','五','六']" :key="day" class="feature-muted">{{ day }}</span><template v-for="(day,index) in calendar" :key="index"><button v-if="day" role="button" class="calendar-day" :class="{ active: day.hasActivity }" :aria-label="`${day.dateKey}${day.hasActivity ? ' 有学习活动' : ' 无学习活动'}`" @click="openDay(day.dateKey)"><strong>{{ day.dateKey.split('-')[2] }}</strong><small>{{ day.hasActivity ? '已学习' : '—' }}</small></button><span v-else /></template></div>
    <p class="feature-note">完成正式题目、复习或有效阅读达到一分钟会记为学习活动。点击日期查看详情；空日期保留真实空记录。</p>
  </template>
  <template v-else-if="kind === 'report'">
    <div class="feature-tabs"><button v-for="days in [7,30]" :key="days" role="tab" class="feature-tab" :class="{active:rangeDays===days}" :aria-selected="rangeDays===days" @click="emit('range-change', days)">最近 {{ days }} 天</button></div>
    <div class="feature-stats"><div><strong>{{ totals.newCount }}</strong><span>新学文字</span></div><div><strong>{{ totals.reviewCount }}</strong><span>正式复习</span></div><div><strong>{{ Math.floor(totals.seconds / 60) }}</strong><span>有效分钟</span></div></div>
    <p class="feature-muted">独立专项共作答 {{ totals.practiceCount }} 次，测评单独查看，不混入正式新学。</p>
    <button v-for="day in history.days.slice().reverse()" :key="day.dateKey" role="button" class="feature-row" @click="openDay(day.dateKey)"><span class="feature-row-copy"><strong>{{ day.dateKey }}</strong><p class="feature-muted">{{ day.hasActivity ? `新学${day.newCount} · 复习${day.reviewCount} · 专项${day.practiceCount}` : '当日暂无学习活动' }}</p></span><span>{{ Math.floor(day.studySeconds / 60) }} 分钟 →</span></button>
  </template>
  <template v-else>
    <h2>{{ date }}</h2>
    <div v-if="kind === 'day'" class="feature-stats"><div><strong>{{ totals.newCount }}</strong><span>新学字</span></div><div><strong>{{ totals.reviewCount }}</strong><span>复习次数</span></div><div><strong>{{ Math.floor(totals.seconds / 60) }}</strong><span>有效分钟</span></div></div>
    <template v-if="kind === 'day'"><h2 class="feature-section-title">当日会话 · {{ sessions.length }}</h2><button v-for="session in sessions" :key="session.id" role="button" class="feature-row" @click="emit('open', `/pages/learning-session/index?date=${encodeURIComponent(date)}&session=${encodeURIComponent(session.id)}`)"><span class="feature-row-copy">{{ labels[session.source] }}</span><span>{{ session.count }} 次作答 →</span></button></template>
    <p v-if="!events.length" class="feature-note">没有逐题事件。历史累计统计会保留，但不会补造作答时间。</p>
    <template v-if="kind === 'session'"><h2 class="feature-section-title">活动明细</h2><button v-for="event in events" :key="event.id" role="button" class="feature-row" :disabled="!event.characterId" @click="emit('open', `/pages/character-detail/index?id=${encodeURIComponent(event.characterId!)}`)"><strong class="feature-glyph">{{ glyph(event.characterId) }}</strong><span class="feature-row-copy"><strong>{{ event.kind === 'time' ? `有效时长 ${event.seconds} 秒` : event.kind === 'completed' ? '首次完成正式学习' : event.correct ? '回答正确' : '回答错误' }}</strong><p class="feature-muted">{{ labels[event.source] }} · {{ new Date(event.at).toLocaleTimeString() }}</p></span></button><button v-if="events.length >= pageSize" role="button" class="feature-link" @click="pageSize += 50">加载更多活动</button></template>
  </template>
</template>
<style scoped>
.history-calendar { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; margin: 24px 0; text-align: center; }
.feature-page .calendar-day { width: 100%; min-height: 58px; padding: 8px 2px; background: var(--color-surface-muted); border-radius: 5px; font-size: 13px; }
.calendar-day small { display: block; margin-top: 4px; font-size: 9px; color: var(--color-text-secondary); }
.feature-page .calendar-day.active { color: var(--color-primary); background: var(--color-primary-soft); }
.coverage-line { margin: 20px 0; font-size: 13px; }
.history-track { height: 5px; background: var(--color-border); border-radius: 2px; overflow: hidden; }
.history-track i { display: block; height: 100%; background: var(--color-primary); }
</style>
