import io
p = r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
with io.open(p, "r", encoding="utf-8") as f:
    s = f.read()
old = "            </view>\n          </view>\n        <view class=\"library-tip\">"
new = "              </view>\n            </scroll-view>\n          </view>\n        </view>\n\n        <view class=\"library-tip\">"
if old in s:
    s = s.replace(old, new, 1)
    print("fixed custom close now")
else:
    print("not found old")
    idx = s.find("library-tip")
    print(repr(s[idx-1000:idx+200]))

# Also need to ensure library-body outer view closes correctly - already fixed as </view>
# But we now added extra </view> for library-columns, check balance

# Debug: count views
print(s.count("<view"), s.count("</view>"))
print(s.count("<scroll-view"), s.count("</scroll-view>"))
print(s.count("<template"), s.count("</template>"))

with io.open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("done")
