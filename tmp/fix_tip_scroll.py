import io
p = r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
with io.open(p, "r", encoding="utf-8") as f:
    s = f.read()

# Fix show-scrollbar: set to true so visible inside list
old_scroll = "class=\"column-scroll\" scroll-y :show-scrollbar=\"false\""
new_scroll = "class=\"column-scroll\" scroll-y :show-scrollbar=\"true\""
if s.count(old_scroll) == 2:
    s = s.replace(old_scroll, new_scroll)
    print("fixed scrollbar visibility")
else:
    print("scroll count", s.count(old_scroll))

# Fix tip v-if
old_tip = "<view class=\"library-tip\"><text class=\"tip-text\">"
new_tip = "<view v-if=\"books.length > 0\" class=\"library-tip\"><text class=\"tip-text\">"
if old_tip in s and new_tip not in s:
    s = s.replace(old_tip, new_tip, 1)
    print("fixed tip v-if")
else:
    print("tip already fixed or not found")

with io.open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("done fix tip scroll")
