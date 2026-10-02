<template>
  <view class="home">
    <view class="topbar">
      <button class="icon-button" role="button" aria-label="搜索"><van-icon name="search" size="24" aria-hidden="true" /></button>
      <button class="icon-button" role="button" aria-label="消息提示"><van-icon name="envelop-o" size="24" aria-hidden="true" /></button>
    </view>

    <view class="font-list">
      <view class="font-row">
        <view class="font-cover font-cover-one" aria-hidden="true" />
        <view class="font-detail"><text class="font-title">字体一</text><text class="font-placeholder">。。。</text></view>
      </view>
      <view class="font-row">
        <view class="font-cover font-cover-two" aria-hidden="true" />
        <view class="font-detail"><text class="font-title">字体二</text><text class="font-placeholder">。。。</text></view>
      </view>
    </view>

    <view class="plan">
      <view class="section-heading">
        <text class="section-title">今日计划</text>
        <navigator class="edit-plan" url="/pages/plan/index" hover-class="none" role="button" aria-label="修改">修改</navigator>
      </view>
      <view class="plan-stats">
        <view class="stat"><text class="stat-label">已新学</text><text class="stat-value">x/y</text></view>
        <view class="stat"><text class="stat-label">已复习</text><text class="stat-value">x/y</text></view>
        <view class="stat"><text class="stat-label">已学习时长</text><text class="stat-value stat-time">xxx min</text></view>
      </view>
      <view class="plan-actions">
        <button class="action-button action-primary" role="button">学习</button>
        <button class="action-button action-secondary" role="button">复习</button>
      </view>
    </view>

    <view class="tabs" role="navigation">
      <view class="tab active"><van-icon name="desktop-o" size="23" aria-hidden="true" /><text>学习</text></view>
      <view class="tab"><van-icon name="edit" size="23" aria-hidden="true" /><text>单字练习</text></view>
      <view class="tab"><van-icon name="notes-o" size="23" aria-hidden="true" /><text>对照阅读</text></view>
      <navigator class="tab" url="/pages/profile/index" hover-class="none" aria-label="我">
        <view class="tab-content">
          <van-icon name="contact-o" size="23" aria-hidden="true" />
          <text>我</text>
        </view>
      </navigator>
    </view>
  </view>
</template>

<style scoped>
.home { width: min(100%, 560px); min-height: 100vh; min-height: 100dvh; margin: 0 auto; display: flex; flex-direction: column; background: var(--color-page); color: var(--color-text); }
.topbar { height: calc(64px + env(safe-area-inset-top)); padding: env(safe-area-inset-top) 20px 0; display: flex; align-items: center; justify-content: flex-end; gap: 10px; background: var(--color-topbar); }
.icon-button { width: 38px; height: 38px; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; color: var(--color-text); }
.icon-button::after, .action-button::after { border: 0; }
.font-list { padding: 10px 16px 0; }
.font-row { min-height: 112px; display: flex; align-items: center; gap: 18px; border-bottom: 1px solid var(--color-border); }
.font-cover { flex: none; width: 63px; height: 82px; border-radius: 3px; box-shadow: inset 4px 0 0 #ffffff50, 0 2px 3px var(--color-shadow); }
.font-cover-one { background: var(--color-cover-one); }
.font-cover-two { background: var(--color-cover-two); }
.font-detail { display: flex; flex-direction: column; gap: 10px; }
.font-title { font-size: 18px; font-weight: 600; }
.font-placeholder { color: var(--color-text-muted); font-size: 14px; }
.plan { padding: 26px 16px 34px; }
.section-title { display: block; font-size: 19px; font-weight: 700; }
.section-heading { display: flex; align-items: center; justify-content: space-between; }
.edit-plan { height: 34px; padding: 0 4px; display: flex; align-items: center; color: var(--color-primary); font-size: 14px; }
.plan-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 28px; }
.stat { min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.stat-label { color: var(--color-text-secondary); font-size: 14px; white-space: nowrap; }
.stat-value { font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -.03em; }
.stat-time { font-size: 24px; white-space: nowrap; }
.plan-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 34px; }
.action-button { width: 100%; min-width: 0; height: 64px; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 9px; font-size: 21px; font-weight: 600; line-height: 1; }
.action-primary { background: var(--color-primary); color: var(--color-on-primary); }
.action-secondary { background: var(--color-primary-soft); color: var(--color-primary); }
.tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); min-height: 78px; margin-top: auto; padding-bottom: env(safe-area-inset-bottom); border-top: 1px solid var(--color-border); background: var(--color-surface); }
.tab { min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: var(--color-text-muted); font-size: 11px; }
.tab-content { width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; }
.tab.active { color: var(--color-primary); }
.tab text { white-space: nowrap; }
@media (max-width: 360px) { .font-row { min-height: 100px; } .font-cover { width: 55px; height: 72px; } .stat-label { font-size: 12px; } .stat-value { font-size: 24px; } .stat-time { font-size: 19px; } }
</style>
