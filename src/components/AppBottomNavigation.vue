<script setup lang="ts">
import { ref } from "vue";

type TabKey = "study" | "character" | "reading" | "profile";

type NavigationItem = {
  key: TabKey;
  label: string;
  icon: string;
  url?: string;
};

const TAB_ORDER: TabKey[] = ["study", "character", "reading", "profile"];

const props = withDefaults(defineProps<{
  activeTab: TabKey;
  fixed?: boolean;
}>(), {
  fixed: false,
});

const emit = defineEmits<{
  (event: "unavailable", label: string): void;
}>();

const navigationItems: NavigationItem[] = [
  { key: "study", label: "学习", icon: "desktop-o", url: "/pages/index/index" },
  { key: "character", label: "单字练习", icon: "edit" },
  { key: "reading", label: "对照阅读", icon: "notes-o" },
  { key: "profile", label: "我", icon: "contact-o", url: "/pages/profile/index" },
];

function getAnimationType(target: TabKey): "slide-in-right" | "slide-in-left" {
  const currentIndex = TAB_ORDER.indexOf(props.activeTab);
  const targetIndex = TAB_ORDER.indexOf(target);
  if (currentIndex === -1 || targetIndex === -1) return "slide-in-right";
  return targetIndex > currentIndex ? "slide-in-right" : "slide-in-left";
}

function navigateToTab(item: NavigationItem) {
  if (item.key === props.activeTab) return;
  if (!item.url) {
    emit("unavailable", item.label);
    return;
  }
  const animationType = getAnimationType(item.key);
  const animationDuration = 220;
  // 首页使用 reLaunch 以清空栈，其余使用 navigateTo 保持可返回；动画统一 220ms ease-out
  if (item.key === "study") {
    uni.reLaunch({
      url: item.url,
      animationType,
      animationDuration,
      fail: () => emit("unavailable", item.label),
    });
    return;
  }
  uni.navigateTo({
    url: item.url,
    animationType,
    animationDuration,
    fail: () => {
      // H5 下可能因已在同一页或栈限制失败，降级为 reLaunch
      uni.reLaunch({
        url: item.url as string,
        animationType,
        animationDuration,
      });
    },
  });
}

function handleItemClick(item: NavigationItem) {
  navigateToTab(item);
}

function handleKeydown(event: KeyboardEvent, item: NavigationItem) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    navigateToTab(item);
  }
}

// 手势横划切换：阈值 60px，竖向位移过大时不触发，避免与纵向滚动冲突
const touchStartX = ref(0);
const touchStartY = ref(0);
const touchActive = ref(false);

function handleTouchStart(event: TouchEvent) {
  const touch = event.touches[0];
  if (!touch) return;
  touchStartX.value = touch.clientX;
  touchStartY.value = touch.clientY;
  touchActive.value = true;
}

function handleTouchEnd(event: TouchEvent) {
  if (!touchActive.value) return;
  touchActive.value = false;
  const touch = event.changedTouches[0];
  if (!touch) return;
  const deltaX = touch.clientX - touchStartX.value;
  const deltaY = Math.abs(touch.clientY - touchStartY.value);
  // 竖向滑动过大或横向阈值不足则忽略
  if (deltaY > 50) return;
  if (Math.abs(deltaX) < 60) return;
  const currentIndex = TAB_ORDER.indexOf(props.activeTab);
  if (currentIndex === -1) return;
  if (deltaX < 0 && currentIndex < TAB_ORDER.length - 1) {
    // 向左划 -> 下一个 Tab
    const nextKey = TAB_ORDER[currentIndex + 1];
    const nextItem = navigationItems.find((n) => n.key === nextKey);
    if (nextItem) navigateToTab(nextItem);
  } else if (deltaX > 0 && currentIndex > 0) {
    // 向右划 -> 上一个 Tab
    const prevKey = TAB_ORDER[currentIndex - 1];
    const prevItem = navigationItems.find((n) => n.key === prevKey);
    if (prevItem) navigateToTab(prevItem);
  }
}
</script>

<template>
  <view
    class="bottom-navigation"
    :class="{ 'is-fixed': fixed }"
    role="navigation"
    aria-label="主导航"
    @touchstart.passive="handleTouchStart"
    @touchend.passive="handleTouchEnd"
  >
    <view
      v-for="item in navigationItems"
      :key="item.key"
      class="navigation-item"
      :class="{ 'is-active': item.key === activeTab }"
      :aria-current="item.key === activeTab ? 'page' : undefined"
      :aria-label="item.label"
      role="button"
      tabindex="0"
      @click="handleItemClick(item)"
      @keydown="handleKeydown($event, item)"
    >
      <view class="navigation-content">
        <van-icon :name="item.icon" size="23" aria-hidden="true" />
        <text class="navigation-label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.bottom-navigation {
  min-height: 72px;
  margin-top: auto;
  padding-bottom: env(safe-area-inset-bottom);
  padding-bottom: constant(safe-area-inset-bottom);
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 -4px 16px var(--color-shadow);
  /* 手势区域：支持横向 pan，纵向不干扰 */
  touch-action: pan-y;
}

.bottom-navigation.is-fixed {
  position: fixed;
  z-index: 10;
  right: max(0px, calc((100vw - 560px) / 2));
  bottom: 0;
  left: max(0px, calc((100vw - 560px) / 2));
  margin-top: 0;
}

.navigation-item {
  min-width: 0;
  min-height: 44px;
  color: var(--color-text-muted);
  font-size: 7px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.navigation-item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.navigation-content {
  width: 100%;
  height: 100%;
  min-height: 72px;
  display: grid;
  grid-template-rows: 23px auto;
  align-content: center;
  justify-items: center;
  row-gap: 4px;
}

.navigation-item.is-active {
  color: var(--color-primary);
}

.navigation-label {
  display: block;
  line-height: 1.2;
  white-space: nowrap;
}
</style>
