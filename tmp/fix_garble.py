# -*- coding: utf-8 -*-
import io
vue_path = r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
segment_path = r"C:/Users/22640/Documents/ChatGPT/xz_3/tmp/correct_segment.txt"

# Create correct segment with proper UTF-8
correct = u"""        <view v-else class="library-tab-wrap">
          <view class="library-search">
            <view class="search-field">
              <text class="search-icon">\u2315</text>
              <input class="search-input" type="text" :value="searchQuery" placeholder="\u68c0\u7d22\u6587\u4ef6\u540d\u79f0" placeholder-class="search-placeholder" @input="searchQuery = ($event.detail ? $event.detail.value : $event.target.value)" />
              <view v-if="searchQuery" class="search-clear" role="button" tabindex="0" aria-label="\u6e05\u9664\u641c\u7d22" @click="searchQuery = ''" @keydown.enter="searchQuery = ''" @keydown.space.prevent="searchQuery = ''">
                <text class="search-clear-text">\u00d7</text>
              </view>
            </view>
          </view>
          <view class="library-tabs" role="tablist" aria-label="\u6587\u4ef6\u5206\u7c7b">
            <view class="library-tab" :class="{ \'is-active\': libraryTab === \'builtin\' }" role="tab" :aria-selected="libraryTab === \'builtin\'" tabindex="0" @click="libraryTab = \'builtin\'" @keydown.enter="libraryTab = \'builtin\'" @keydown.space.prevent="libraryTab = \'builtin\'">
              <text class="tab-label">\u5185\u7f6e\u6587\u4ef6</text>
              <text class="tab-count">{{ builtinCount }} \u672c</text>
            </view>
            <view class="library-tab" :class="{ \'is-active\': libraryTab === \'custom\' }" role="tab" :aria-selected="libraryTab === \'custom\'" tabindex="0" @click="libraryTab = \'custom\'" @keydown.enter="libraryTab = \'custom\'" @keydown.space.prevent="libraryTab = \'custom\'">
              <text class="tab-label">\u6211\u7684\u4e0a\u4f20</text>
              <text class="tab-count">{{ customCount }} \u672c</text>
            </view>
          </view>
          <view class="library-tab-panel">
            <template v-if="libraryTab === \'builtin\'">
              <view v-if="builtinBooks.length === 0" class="section-empty">
                <text class="section-empty-text">\u6682\u65e0\u5185\u7f6e\u6587\u4ef6</text>
              </view>
              <view v-else-if="filteredBuiltinBooks.length === 0" class="section-empty">
                <text class="section-empty-text">\u672a\u627e\u5230\u5339\u914d "{{ searchQuery }}" \u7684\u6587\u4ef6</text>
              </view>
              <scroll-view v-else class="column-scroll" scroll-y :show-scrollbar="true" :enhanced="true" :bounces="false">
                <view class="book-grid">
                  <view
                    v-for="book in filteredBuiltinBooks"
                    :key="book.id"
                    class="book-card"
                    :class="{ \'is-active\': book.id === activeBookId }"
                    role="button"
                    tabindex="0"
                    :aria-label="book.name"
                    @click="handleEnterReader(book.id)"
                    @keydown.enter="handleEnterReader(book.id)"
                    @keydown.space.prevent="handleEnterReader(book.id)"
                  >
                    <view class="book-cover" :data-ext="book.ext">
                      <text class="cover-ext">{{ book.ext.toUpperCase() }}</text>
                      <text class="cover-icon">{{ book.ext === \'pdf\' ? \'\u25f0\' : \'\u2261\' }}</text>
                    </view>
                    <view class="book-info">
                      <text class="book-name">{{ book.name }}</text>
                      <text class="book-file">{{ book.fileName }}</text>
                      <text class="book-meta">{{ getBookProgressLabel(book) }}</text>
                    </view>
                    <view class="book-action">
                      <text class="action-text">{{ book.id === activeBookId && rows.length > 0 ? \'\u7ee7\u7eed\u9605\u8bfb\' : \'\u5f00\u59cb\u9605\u8bfb\' }}</text>
                      <text class="action-arrow">\u203a</text>
                    </view>
                    <view v-if="book.id === activeBookId" class="book-active-bar" aria-hidden="true" />
                  </view>
                </view>
              </scroll-view>
            </template>
            <template v-else>
              <view v-if="customBooks.length === 0" class="section-empty">
                <text class="section-empty-text">\u6682\u672a\u4e0a\u4f20\u6587\u4ef6\uff0c\u70b9\u51fb\u5e95\u90e8\u6309\u94ae\u4e0a\u4f20 .txt / .pdf</text>
              </view>
              <view v-else-if="filteredCustomBooks.length === 0" class="section-empty">
                <text class="section-empty-text">\u672a\u627e\u5230\u5339\u914d "{{ searchQuery }}" \u7684\u6587\u4ef6</text>
              </view>
              <scroll-view v-else class="column-scroll" scroll-y :show-scrollbar="true" :enhanced="true" :bounces="false">
                <view class="book-grid">
                  <view
                    v-for="book in filteredCustomBooks"
                    :key="book.id"
                    class="book-card book-card--custom"
                    :class="{ \'is-active\': book.id === activeBookId }"
                    role="button"
                    tabindex="0"
                    :aria-label="book.name"
                    @click="handleEnterReader(book.id)"
                    @keydown.enter="handleEnterReader(book.id)"
                    @keydown.space.prevent="handleEnterReader(book.id)"
                  >
                    <view class="book-cover" :data-ext="book.ext">
                      <text class="cover-ext">{{ book.ext.toUpperCase() }}</text>
                      <text class="cover-icon">{{ book.ext === \'pdf\' ? \'\u25f0\' : \'\u2261\' }}</text>
                    </view>
                    <view class="book-info">
                      <text class="book-name">{{ book.name }}</text>
                      <text class="book-file">{{ book.fileName }}</text>
                      <text class="book-meta">{{ getBookProgressLabel(book) }}</text>
                    </view>
                    <view class="book-actions">
                      <view class="book-delete" role="button" tabindex="0" aria-label="\u5220\u9664\u6587\u4ef6" @click.stop="handleRemoveCustomBook(book.id)" @keydown.enter.stop="handleRemoveCustomBook(book.id)" @keydown.space.prevent.stop="handleRemoveCustomBook(book.id)">
                        <text class="delete-text">\u5220\u9664</text>
                      </view>
                      <view class="book-action">
                        <text class="action-text">{{ book.id === activeBookId && rows.length > 0 ? \'\u7ee7\u7eed\u9605\u8bfb\' : \'\u5f00\u59cb\u9605\u8bfb\' }}</text>
                        <text class="action-arrow">\u203a</text>
                      </view>
                    </view>
                    <view v-if="book.id === activeBookId" class="book-active-bar" aria-hidden="true" />
                  </view>
                </view>
              </scroll-view>
            </template>
          </view>
        </view>
"""
with io.open(segment_path, "w", encoding="utf-8") as f:
    f.write(correct)
print("wrote correct segment")

# Now replace in vue file
with io.open(vue_path, "r", encoding="utf-8") as f:
    s = f.read()

start_marker = u"<view v-else class=\"library-tab-wrap\">"
end_marker = u"<view v-if=\"books.length > 0\" class=\"library-tip\">"
start_idx = s.find(start_marker)
end_idx = s.find(end_marker)
print("start", start_idx, "end", end_idx)
if start_idx >=0 and end_idx >=0:
    before = s[:start_idx]
    after = s[end_idx:]
    # correct already includes trailing newline, ensure one newline before after
    new_content = before + correct + u"\n        " + after
    with io.open(vue_path, "w", encoding="utf-8") as out:
        out.write(new_content)
    print("replaced correctly")
else:
    print("markers not found")
