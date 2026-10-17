import io
p = r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
with io.open(p, "r", encoding="utf-8") as f:
    s = f.read()

# 1) Add script logic for tabs + search
old_script = "const builtinCount = computed(() => builtinBooks.value.length)\nconst customCount = computed(() => customBooks.value.length)"
new_script = """const builtinCount = computed(() => builtinBooks.value.length)
const customCount = computed(() => customBooks.value.length)
type LibraryTab = 'builtin' | 'custom'
const libraryTab = ref<LibraryTab>('builtin')
const searchQuery = ref('')
const filteredBuiltinBooks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return builtinBooks.value
  return builtinBooks.value.filter((b) => b.name.toLowerCase().includes(q) || b.fileName.toLowerCase().includes(q))
})
const filteredCustomBooks = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return customBooks.value
  return customBooks.value.filter((b) => b.name.toLowerCase().includes(q) || b.fileName.toLowerCase().includes(q))
})"""
if old_script in s:
    s = s.replace(old_script, new_script, 1)
    print("added script for tabs/search")
else:
    print("script old not found")

# 2) Replace library-body template from v-else columns to tabs
old_template = """        <view v-else class=\"library-columns\">
          <view class=\"library-column library-column--builtin\">
            <view class=\"section-head\">
              <view class=\"section-head-left\">
                <text class=\"section-title\">内置文件</text>
                <text class=\"section-badge section-badge--builtin\">内置</text>
              </view>
              <text class=\"section-count\">{{ builtinCount }} 本</text>
            </view>
            <view v-if=\"builtinBooks.length === 0\" class=\"section-empty\">
              <text class=\"section-empty-text\">暂无内置文件</text>
            </view>
            <scroll-view v-else class=\"column-scroll\" scroll-y :show-scrollbar=\"true\" :enhanced=\"true\" :bounces=\"false\">
              <view class=\"book-grid\">
              <view
                v-for=\"book in builtinBooks\"
                :key=\"book.id\"
                class=\"book-card\"
                :class=\"{ 'is-active': book.id === activeBookId }\"
                role=\"button\"
                tabindex=\"0\"
                :aria-label=\"book.name\"
                @click=\"handleEnterReader(book.id)\"
                @keydown.enter=\"handleEnterReader(book.id)\"
                @keydown.space.prevent=\"handleEnterReader(book.id)\"
              >
                <view class=\"book-cover\" :data-ext=\"book.ext\">
                  <text class=\"cover-ext\">{{ book.ext.toUpperCase() }}</text>
                  <text class=\"cover-icon\">{{ book.ext === 'pdf' ? '◰' : '≡' }}</text>
                </view>
                <view class=\"book-info\">
                  <text class=\"book-name\">{{ book.name }}</text>
                  <text class=\"book-file\">{{ book.fileName }}</text>
                  <text class=\"book-meta\">{{ getBookProgressLabel(book) }}</text>
                </view>
                <view class=\"book-action\">
                  <text class=\"action-text\">{{ book.id === activeBookId && rows.length > 0 ? '继续阅读' : '开始阅读' }}</text>
                  <text class=\"action-arrow\">›</text>
                </view>
                <view v-if=\"book.id === activeBookId\" class=\"book-active-bar\" aria-hidden=\"true\" />
              </view>
              </view>
            </scroll-view>
          </view>

          <view class=\"library-column library-column--custom\">
            <view class=\"section-head\">
              <view class=\"section-head-left\">
                <text class=\"section-title\">我的上传</text>
                <text class=\"section-badge section-badge--custom\">本地</text>
              </view>
              <text class=\"section-count\">{{ customCount }} 本</text>
            </view>
            <view v-if=\"customBooks.length === 0\" class=\"section-empty\">
              <text class=\"section-empty-text\">暂未上传文件，点击底部按钮上传 .txt / .pdf</text>
            </view>
            <scroll-view v-else class=\"column-scroll\" scroll-y :show-scrollbar=\"true\" :enhanced=\"true\" :bounces=\"false\">
              <view class=\"book-grid\">
              <view
                v-for=\"book in customBooks\"
                :key=\"book.id\"
                class=\"book-card book-card--custom\"
                :class=\"{ 'is-active': book.id === activeBookId }\"
                role=\"button\"
                tabindex=\"0\"
                :aria-label=\"book.name\"
                @click=\"handleEnterReader(book.id)\"
                @keydown.enter=\"handleEnterReader(book.id)\"
                @keydown.space.prevent=\"handleEnterReader(book.id)\"
              >
                <view class=\"book-cover\" :data-ext=\"book.ext\">
                  <text class=\"cover-ext\">{{ book.ext.toUpperCase() }}</text>
                  <text class=\"cover-icon\">{{ book.ext === 'pdf' ? '◰' : '≡' }}</text>
                </view>
                <view class=\"book-info\">
                  <text class=\"book-name\">{{ book.name }}</text>
                  <text class=\"book-file\">{{ book.fileName }}</text>
                  <text class=\"book-meta\">{{ getBookProgressLabel(book) }}</text>
                </view>
                <view class=\"book-actions\">
                  <view class=\"book-delete\" role=\"button\" tabindex=\"0\" aria-label=\"删除文件\" @click.stop=\"handleRemoveCustomBook(book.id)\" @keydown.enter.stop=\"handleRemoveCustomBook(book.id)\" @keydown.space.prevent.stop=\"handleRemoveCustomBook(book.id)\">
                    <text class=\"delete-text\">删除</text>
                  </view>
                  <view class=\"book-action\">
                    <text class=\"action-text\">{{ book.id === activeBookId && rows.length > 0 ? '继续阅读' : '开始阅读' }}</text>
                    <text class=\"action-arrow\">›</text>
                  </view>
                </view>
                <view v-if=\"book.id === activeBookId\" class=\"book-active-bar\" aria-hidden=\"true\" />
              </view>
              </view>
            </scroll-view>
          </view>
        </view>"""

new_template = """        <view v-else class=\"library-tab-wrap\">
          <view class=\"library-search\">
            <view class=\"search-field\">
              <text class=\"search-icon\">⌕</text>
              <input class=\"search-input\" type=\"text\" :value=\"searchQuery\" placeholder=\"检索文件名称\" placeholder-class=\"search-placeholder\" @input=\"searchQuery = ($event.detail ? $event.detail.value : $event.target.value)\" />
              <view v-if=\"searchQuery\" class=\"search-clear\" role=\"button\" tabindex=\"0\" aria-label=\"清除搜索\" @click=\"searchQuery = ''\" @keydown.enter=\"searchQuery = ''\" @keydown.space.prevent=\"searchQuery = ''\">
                <text class=\"search-clear-text\">×</text>
              </view>
            </view>
          </view>
          <view class=\"library-tabs\" role=\"tablist\" aria-label=\"文件分类\">
            <view class=\"library-tab\" :class=\"{ 'is-active': libraryTab === 'builtin' }\" role=\"tab\" :aria-selected=\"libraryTab === 'builtin'\" tabindex=\"0\" @click=\"libraryTab = 'builtin'\" @keydown.enter=\"libraryTab = 'builtin'\" @keydown.space.prevent=\"libraryTab = 'builtin'\">
              <text class=\"tab-label\">内置文件</text>
              <text class=\"tab-count\">{{ builtinCount }} 本</text>
            </view>
            <view class=\"library-tab\" :class=\"{ 'is-active': libraryTab === 'custom' }\" role=\"tab\" :aria-selected=\"libraryTab === 'custom'\" tabindex=\"0\" @click=\"libraryTab = 'custom'\" @keydown.enter=\"libraryTab = 'custom'\" @keydown.space.prevent=\"libraryTab = 'custom'\">
              <text class=\"tab-label\">我的上传</text>
              <text class=\"tab-count\">{{ customCount }} 本</text>
            </view>
          </view>
          <view class=\"library-tab-panel\">
            <template v-if=\"libraryTab === 'builtin'\">
              <view v-if=\"builtinBooks.length === 0\" class=\"section-empty\">
                <text class=\"section-empty-text\">暂无内置文件</text>
              </view>
              <view v-else-if=\"filteredBuiltinBooks.length === 0\" class=\"section-empty\">
                <text class=\"section-empty-text\">未找到匹配 \"{{ searchQuery }}\" 的文件</text>
              </view>
              <scroll-view v-else class=\"column-scroll\" scroll-y :show-scrollbar=\"true\" :enhanced=\"true\" :bounces=\"false\">
                <view class=\"book-grid\">
                  <view
                    v-for=\"book in filteredBuiltinBooks\"
                    :key=\"book.id\"
                    class=\"book-card\"
                    :class=\"{ 'is-active': book.id === activeBookId }\"
                    role=\"button\"
                    tabindex=\"0\"
                    :aria-label=\"book.name\"
                    @click=\"handleEnterReader(book.id)\"
                    @keydown.enter=\"handleEnterReader(book.id)\"
                    @keydown.space.prevent=\"handleEnterReader(book.id)\"
                  >
                    <view class=\"book-cover\" :data-ext=\"book.ext\">
                      <text class=\"cover-ext\">{{ book.ext.toUpperCase() }}</text>
                      <text class=\"cover-icon\">{{ book.ext === 'pdf' ? '◰' : '≡' }}</text>
                    </view>
                    <view class=\"book-info\">
                      <text class=\"book-name\">{{ book.name }}</text>
                      <text class=\"book-file\">{{ book.fileName }}</text>
                      <text class=\"book-meta\">{{ getBookProgressLabel(book) }}</text>
                    </view>
                    <view class=\"book-action\">
                      <text class=\"action-text\">{{ book.id === activeBookId && rows.length > 0 ? '继续阅读' : '开始阅读' }}</text>
                      <text class=\"action-arrow\">›</text>
                    </view>
                    <view v-if=\"book.id === activeBookId\" class=\"book-active-bar\" aria-hidden=\"true\" />
                  </view>
                </view>
              </scroll-view>
            </template>
            <template v-else>
              <view v-if=\"customBooks.length === 0\" class=\"section-empty\">
                <text class=\"section-empty-text\">暂未上传文件，点击底部按钮上传 .txt / .pdf</text>
              </view>
              <view v-else-if=\"filteredCustomBooks.length === 0\" class=\"section-empty\">
                <text class=\"section-empty-text\">未找到匹配 \"{{ searchQuery }}\" 的文件</text>
              </view>
              <scroll-view v-else class=\"column-scroll\" scroll-y :show-scrollbar=\"true\" :enhanced=\"true\" :bounces=\"false\">
                <view class=\"book-grid\">
                  <view
                    v-for=\"book in filteredCustomBooks\"
                    :key=\"book.id\"
                    class=\"book-card book-card--custom\"
                    :class=\"{ 'is-active': book.id === activeBookId }\"
                    role=\"button\"
                    tabindex=\"0\"
                    :aria-label=\"book.name\"
                    @click=\"handleEnterReader(book.id)\"
                    @keydown.enter=\"handleEnterReader(book.id)\"
                    @keydown.space.prevent=\"handleEnterReader(book.id)\"
                  >
                    <view class=\"book-cover\" :data-ext=\"book.ext\">
                      <text class=\"cover-ext\">{{ book.ext.toUpperCase() }}</text>
                      <text class=\"cover-icon\">{{ book.ext === 'pdf' ? '◰' : '≡' }}</text>
                    </view>
                    <view class=\"book-info\">
                      <text class=\"book-name\">{{ book.name }}</text>
                      <text class=\"book-file\">{{ book.fileName }}</text>
                      <text class=\"book-meta\">{{ getBookProgressLabel(book) }}</text>
                    </view>
                    <view class=\"book-actions\">
                      <view class=\"book-delete\" role=\"button\" tabindex=\"0\" aria-label=\"删除文件\" @click.stop=\"handleRemoveCustomBook(book.id)\" @keydown.enter.stop=\"handleRemoveCustomBook(book.id)\" @keydown.space.prevent.stop=\"handleRemoveCustomBook(book.id)\">
                        <text class=\"delete-text\">删除</text>
                      </view>
                      <view class=\"book-action\">
                        <text class=\"action-text\">{{ book.id === activeBookId && rows.length > 0 ? '继续阅读' : '开始阅读' }}</text>
                        <text class=\"action-arrow\">›</text>
                      </view>
                    </view>
                    <view v-if=\"book.id === activeBookId\" class=\"book-active-bar\" aria-hidden=\"true\" />
                  </view>
                </view>
              </scroll-view>
            </template>
          </view>
        </view>"""

if old_template in s:
    s = s.replace(old_template, new_template, 1)
    print("replaced template to tabs")
else:
    print("old_template not found")
    # debug
    idx = s.find("library-columns")
    print(repr(s[idx-500:idx+800]))

with io.open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("done")
