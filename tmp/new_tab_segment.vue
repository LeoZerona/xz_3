        <view v-else class="library-tab-wrap">
          <view class="library-search">
            <view class="search-field">
              <text class="search-icon">⌕</text>
              <input class="search-input" type="text" :value="searchQuery" placeholder="检索文件名称" placeholder-class="search-placeholder" @input="searchQuery = ($event.detail ? $event.detail.value : $event.target.value)" />
              <view v-if="searchQuery" class="search-clear" role="button" tabindex="0" aria-label="清除搜索" @click="searchQuery = ''" @keydown.enter="searchQuery = ''" @keydown.space.prevent="searchQuery = ''">
                <text class="search-clear-text">×</text>
              </view>
            </view>
          </view>
          <view class="library-tabs" role="tablist" aria-label="文件分类">
            <view class="library-tab" :class="{ 'is-active': libraryTab === 'builtin' }" role="tab" :aria-selected="libraryTab === 'builtin'" tabindex="0" @click="libraryTab = 'builtin'" @keydown.enter="libraryTab = 'builtin'" @keydown.space.prevent="libraryTab = 'builtin'">
              <text class="tab-label">内置文件</text>
              <text class="tab-count">{{ builtinCount }} 本</text>
            </view>
            <view class="library-tab" :class="{ 'is-active': libraryTab === 'custom' }" role="tab" :aria-selected="libraryTab === 'custom'" tabindex="0" @click="libraryTab = 'custom'" @keydown.enter="libraryTab = 'custom'" @keydown.space.prevent="libraryTab = 'custom'">
              <text class="tab-label">我的上传</text>
              <text class="tab-count">{{ customCount }} 本</text>
            </view>
          </view>
          <view class="library-tab-panel">
            <template v-if="libraryTab === 'builtin'">
              <view v-if="builtinBooks.length === 0" class="section-empty">
                <text class="section-empty-text">暂无内置文件</text>
              </view>
              <view v-else-if="filteredBuiltinBooks.length === 0" class="section-empty">
                <text class="section-empty-text">未找到匹配 "{{ searchQuery }}" 的文件</text>
              </view>
              <scroll-view v-else class="column-scroll" scroll-y :show-scrollbar="true" :enhanced="true" :bounces="false">
                <view class="book-grid">
                  <view
                    v-for="book in filteredBuiltinBooks"
                    :key="book.id"
                    class="book-card"
                    :class="{ 'is-active': book.id === activeBookId }"
                    role="button"
                    tabindex="0"
                    :aria-label="book.name"
                    @click="handleEnterReader(book.id)"
                    @keydown.enter="handleEnterReader(book.id)"
                    @keydown.space.prevent="handleEnterReader(book.id)"
                  >
                    <view class="book-cover" :data-ext="book.ext">
                      <text class="cover-ext">{{ book.ext.toUpperCase() }}</text>
                      <text class="cover-icon">{{ book.ext === 'pdf' ? '◰' : '≡' }}</text>
                    </view>
                    <view class="book-info">
                      <text class="book-name">{{ book.name }}</text>
                      <text class="book-file">{{ book.fileName }}</text>
                      <text class="book-meta">{{ getBookProgressLabel(book) }}</text>
                    </view>
                    <view class="book-action">
                      <text class="action-text">{{ book.id === activeBookId && rows.length > 0 ? '继续阅读' : '开始阅读' }}</text>
                      <text class="action-arrow">›</text>
                    </view>
                    <view v-if="book.id === activeBookId" class="book-active-bar" aria-hidden="true" />
                  </view>
                </view>
              </scroll-view>
            </template>
            <template v-else>
              <view v-if="customBooks.length === 0" class="section-empty">
                <text class="section-empty-text">暂未上传文件，点击底部按钮上传 .txt / .pdf</text>
              </view>
              <view v-else-if="filteredCustomBooks.length === 0" class="section-empty">
                <text class="section-empty-text">未找到匹配 "{{ searchQuery }}" 的文件</text>
              </view>
              <scroll-view v-else class="column-scroll" scroll-y :show-scrollbar="true" :enhanced="true" :bounces="false">
                <view class="book-grid">
                  <view
                    v-for="book in filteredCustomBooks"
                    :key="book.id"
                    class="book-card book-card--custom"
                    :class="{ 'is-active': book.id === activeBookId }"
                    role="button"
                    tabindex="0"
                    :aria-label="book.name"
                    @click="handleEnterReader(book.id)"
                    @keydown.enter="handleEnterReader(book.id)"
                    @keydown.space.prevent="handleEnterReader(book.id)"
                  >
                    <view class="book-cover" :data-ext="book.ext">
                      <text class="cover-ext">{{ book.ext.toUpperCase() }}</text>
                      <text class="cover-icon">{{ book.ext === 'pdf' ? '◰' : '≡' }}</text>
                    </view>
                    <view class="book-info">
                      <text class="book-name">{{ book.name }}</text>
                      <text class="book-file">{{ book.fileName }}</text>
                      <text class="book-meta">{{ getBookProgressLabel(book) }}</text>
                    </view>
                    <view class="book-actions">
                      <view class="book-delete" role="button" tabindex="0" aria-label="删除文件" @click.stop="handleRemoveCustomBook(book.id)" @keydown.enter.stop="handleRemoveCustomBook(book.id)" @keydown.space.prevent.stop="handleRemoveCustomBook(book.id)">
                        <text class="delete-text">删除</text>
                      </view>
                      <view class="book-action">
                        <text class="action-text">{{ book.id === activeBookId && rows.length > 0 ? '继续阅读' : '开始阅读' }}</text>
                        <text class="action-arrow">›</text>
                      </view>
                    </view>
                    <view v-if="book.id === activeBookId" class="book-active-bar" aria-hidden="true" />
                  </view>
                </view>
              </scroll-view>
            </template>
          </view>
        </view>
