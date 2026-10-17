const fs=require("fs");
const p="C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue";
let c=fs.readFileSync(p,"utf8");
// 1. hide AppBottomNavigation when reader
c=c.replace('<AppBottomNavigation active-tab="reading" @unavailable="handleUnavailable" />','<AppBottomNavigation v-if="viewMode === \'library\'" active-tab="reading" @unavailable="handleUnavailable" />');
// 2. replace reader-view-wrap block : from <view v-else class="reader-view-wrap"> to before auto-reading-actions + AppBottomNavigation
// Find start marker
const startMarker="<view v-else class=\"reader-view-wrap\">";
const endMarker="    <view v-if=\"isAutoReadingActive\" class=\"auto-reading-actions\"";
let startIdx=c.indexOf(startMarker);
let endIdx=c.indexOf(endMarker);
if(startIdx===-1 || endIdx===-1){ console.log("markers not found",startIdx,endIdx); process.exit(1); }
const before=c.slice(0,startIdx);
const after=c.slice(endIdx); // includes auto-reading-actions and AppBottom...
// Build new immersive reader block
const newBlock=`<view v-else class="reader-view-wrap reader-immersive" :data-theme="currentThemeId">
      <view class="reader-status-cover" aria-hidden="true" />

      <!-- 顶栏浮层：点屏呼出 -->
      <view v-if="showReaderChrome" class="reader-top-overlay" @click.stop>
        <view class="top-overlay-left">
          <view class="top-back-btn" role="button" tabindex="0" aria-label="返回书库" @click="handleExitReader" @keydown.enter="handleExitReader" @keydown.space.prevent="handleExitReader">
            <text class="top-back-icon">‹</text>
          </view>
          <view class="top-title-wrap">
            <text class="top-title">{{ activeBook?.name ?? "对照阅读" }}</text>
            <text v-if="activeBook?.fileName" class="top-subtitle">{{ activeBook.fileName }}</text>
          </view>
        </view>
        <view class="top-overlay-actions">
          <view class="top-icon-btn" role="button" tabindex="0" aria-label="目录" @click="handleCatalogToggle" @keydown.enter="handleCatalogToggle" @keydown.space.prevent="handleCatalogToggle"><text class="top-icon-text">≡</text></view>
          <view class="top-icon-btn" role="button" tabindex="0" aria-label="交换字体" @click="handleSwapFonts" @keydown.enter="handleSwapFonts" @keydown.space.prevent="handleSwapFonts"><text class="top-icon-text">⇄</text></view>
          <view class="top-icon-btn top-icon-btn--more" role="button" tabindex="0" aria-label="更多设置" @click="handleOpenSettings" @keydown.enter="handleOpenSettings" @keydown.space.prevent="handleOpenSettings"><text class="top-icon-text">⋯</text></view>
        </view>
      </view>

      <!-- 主滚动区：沉浸式仅稿纸，点屏切换 chrome -->
      <scroll-view
        id="reading-scroll"
        class="reader-body immersive-reader-body"
        scroll-y
        :scroll-top="readingScrollTop"
        :scroll-with-animation="false"
        :show-scrollbar="false"
        :bounces="false"
        @scroll="handleReadingScroll"
        @touchmove.passive="handleReadingScrollIntent"
        @wheel.passive="handleReadingScrollIntent"
        @click="handleReaderTap"
      >
        <view class="reader-content-inner">
          <view v-if="loading" class="state-card">
            <text class="state-title">正在加载书籍…</text>
            <text class="state-desc">正在解析文本，请稍候</text>
          </view>

          <view v-else-if="loadError" class="state-card state-card--error">
            <text class="state-title">加载失败</text>
            <text class="state-desc">{{ loadError }}</text>
            <view class="retry-btn" role="button" tabindex="0" @click="fetchBook" @keydown.enter="fetchBook" @keydown.space.prevent="fetchBook"><text class="retry-text">重试</text></view>
            <text v-if="activeBook?.ext === '\''pdf'\''" class="state-hint">PDF 需要 pdfjs-dist 支持，或转为 TXT 后放入 books 目录</text>
          </view>

          <ReadingTable
            v-else
            :rows="pageRows"
            :table-style-id="tableStyleId"
            :learning-font-family="currentFont.fontFamily"
            :reference-font-family="referenceFont.fontFamily"
            :page="currentPage"
            :total-pages="totalPages"
            :auto-progress="autoProgress"
            :is-auto-reading="isAutoReadingActive"
          />
        </view>
      </scroll-view>

      <!-- 底栏浮层：上一章 / slider / 下一章 + 目录 夜间 设置 -->
      <view v-if="showReaderChrome" class="reader-bottom-overlay" @click.stop>
        <view class="bottom-slider-row">
          <view class="slider-label" :class="{ '\''is-disabled'\'': !canPrevPage }" role="button" tabindex="0" aria-label="上一章" @click="handlePrevPage" @keydown.enter="handlePrevPage" @keydown.space.prevent="handlePrevPage"><text class="slider-label-text">上一章</text></view>
          <slider class="page-slider" :value="currentPage" :min="1" :max="totalPages" :activeColor="currentThemeId === '\''ink-night'\'' ? '\''#7da2ff'\'' : '\''var(--color-primary)'\''" backgroundColor="var(--color-border)" block-size="18" @change="handleSliderChange" />
          <view class="slider-label" :class="{ '\''is-disabled'\'': !canNextPage }" role="button" tabindex="0" aria-label="下一章" @click="handleNextPage" @keydown.enter="handleNextPage" @keydown.space.prevent="handleNextPage"><text class="slider-label-text">下一章</text></view>
        </view>
        <view class="bottom-actions-row">
          <view class="bottom-action" role="button" tabindex="0" aria-label="目录" @click="handleCatalogToggle" @keydown.enter="handleCatalogToggle" @keydown.space.prevent="handleCatalogToggle">
            <text class="bottom-action-icon">☰</text>
            <text class="bottom-action-label">目录</text>
          </view>
          <view class="bottom-action" role="button" tabindex="0" :aria-label="currentThemeId === '\''ink-night'\'' ? '\''日间模式'\'' : '\''夜间模式'\''" @click="handleNightToggle" @keydown.enter="handleNightToggle" @keydown.space.prevent="handleNightToggle">
            <text class="bottom-action-icon">{{ currentThemeId === "ink-night" ? "☀" : "☾" }}</text>
            <text class="bottom-action-label">{{ currentThemeId === '\''ink-night'\'' ? '\''日间'\'' : '\''夜间'\'' }}</text>
          </view>
          <view class="bottom-action" role="button" tabindex="0" aria-label="设置" @click="handleOpenSettings" @keydown.enter="handleOpenSettings" @keydown.space.prevent="handleOpenSettings">
            <text class="bottom-action-icon">⚙</text>
            <text class="bottom-action-label">设置</text>
          </view>
        </view>
        <view class="bottom-progress-hint" aria-hidden="true">
          <text class="hint-text">{{ currentPage }} / {{ totalPages }} · {{ rangeLabel }}</text>
        </view>
      </view>

      <!-- 目录抽屉 -->
      <view v-if="showReaderCatalog" class="reader-drawer-mask" @click="showReaderCatalog = false">
        <view class="reader-drawer" @click.stop>
          <BookCatalogPanel
            :books="books"
            :active-book-id="activeBookId"
            :total-rows="rows.length"
            :loading="loading"
            :closable="true"
            @select="handleSelectBook"
            @close="showReaderCatalog = false"
          />
        </view>
      </view>

      <!-- 设置抽屉：样式 + 自动阅读 + 交换 -->
      <view v-if="showReaderSettings" class="reader-drawer-mask reader-drawer-mask--settings" @click="showReaderSettings = false">
        <view class="reader-drawer reader-drawer--settings" @click.stop>
          <view class="settings-drawer">
            <view class="drawer-head">
              <text class="drawer-title">阅读设置</text>
              <view class="drawer-close" role="button" tabindex="0" aria-label="关闭设置" @click="showReaderSettings = false" @keydown.enter="showReaderSettings = false" @keydown.space.prevent="showReaderSettings = false"><text class="close-text">×</text></view>
            </view>
            <scroll-view class="settings-scroll" scroll-y :show-scrollbar="false" :bounces="false">
              <view class="settings-section">
                <TableStyleSwitcher
                  :model-value="tableStyleId"
                  :rows-per-page="rowsPerPage"
                  @update:modelValue="handleStyleChange"
                  @update:rowsPerPage="handleRowsPerPageChange"
                />
              </view>
              <view class="settings-section">
                <AutoPageControl
                  :seconds="autoPageSeconds"
                  :progress="autoProgress"
                  :is-running="isAutoReading"
                  :is-paused="isAutoReadingPaused"
                  :disabled="loading || Boolean(loadError) || rows.length === 0"
                  @update:seconds="handleAutoPageSecondsChange"
                  @toggle="handleToggleAutoReading"
                  @stop="stopAutoReading"
                />
              </view>
              <view class="settings-section">
                <view class="swap-row">
                  <text class="swap-label">学习：{{ currentFont.name }} / 对照：{{ referenceFont.name }}</text>
                  <view class="swap-btn" role="button" tabindex="0" aria-label="交换字体" @click="handleSwapFonts" @keydown.enter="handleSwapFonts" @keydown.space.prevent="handleSwapFonts"><text class="swap-btn-text">交换字体</text></view>
                </view>
              </view>
            </scroll-view>
          </view>
        </view>
      </view>

`;
const patched=before+newBlock+after;
fs.writeFileSync(p,c,"utf8");
let afterCheck=fs.readFileSync(p,"utf8");
console.log("template patched, size",afterCheck.length);
