import pathlib
p = pathlib.Path(r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue")
s = p.read_text(encoding="utf-8")

target_open = "<scroll-view class=\"library-body\" scroll-y :show-scrollbar=\"false\" :enhanced=\"true\" :bounces=\"false\">"
replacement_open = "<view class=\"library-body\">"
if target_open in s:
    s = s.replace(target_open, replacement_open, 1)
    print("replaced opening scroll-view")
else:
    print("not found opening")

old1 = "<template v-else>\n          <view class=\"library-section\">"
new1 = "<view v-else class=\"library-columns\">\n          <view class=\"library-column library-column--builtin\">"
if old1 in s:
    s = s.replace(old1, new1, 1)
    print("replaced template v-else -> library-columns")
else:
    print("not found old1")

old2 = "<view class=\"library-section library-section--custom\">"
new2 = "<view class=\"library-column library-column--custom\">"
if old2 in s:
    s = s.replace(old2, new2, 1)
    print("replaced second section")
else:
    print("not found old2")

count = s.count("<view v-else class=\"book-grid\">")
print("count book-grid v-else", count)
if count == 2:
    s = s.replace("<view v-else class=\"book-grid\">", "<scroll-view v-else class=\"column-scroll\" scroll-y :show-scrollbar=\"false\" :enhanced=\"true\" :bounces=\"false\">\n              <view class=\"book-grid\">", 1)
    s = s.replace("<view v-else class=\"book-grid\">", "<scroll-view v-else class=\"column-scroll\" scroll-y :show-scrollbar=\"false\" :enhanced=\"true\" :bounces=\"false\">\n              <view class=\"book-grid\">", 1)
    print("wrapped both grids")
else:
    print("unexpected count")

old_close_builtin = "            </view>\n          </view>\n\n          <view class=\"library-column library-column--custom\">"
new_close_builtin = "              </view>\n            </scroll-view>\n          </view>\n\n          <view class=\"library-column library-column--custom\">"
if old_close_builtin in s:
    s = s.replace(old_close_builtin, new_close_builtin, 1)
    print("fixed builtin close")
else:
    print("not found builtin close")
    idx = s.find("library-column--custom")
    print(repr(s[idx-800:idx+200]))

old_close_custom = "            </view>\n          </view>\n        </view>\n\n        <view class=\"library-tip\">"
new_close_custom = "              </view>\n            </scroll-view>\n          </view>\n        </view>\n\n        <view class=\"library-tip\">"
if old_close_custom in s:
    s = s.replace(old_close_custom, new_close_custom, 1)
    print("fixed custom close")
else:
    print("not found custom close")
    idx = s.find("library-tip")
    print(repr(s[idx-800:idx+300]))

old_outer = "        <view class=\"library-tip\"><text class=\"tip-text\">"
# check closing
if "</scroll-view>" in s[s.find("library-tip"):s.find("library-tip")+600]:
    # find library-body closing
    segment = s[s.find("library-tip"):s.find("library-tip")+800]
    print("outer still scroll-view:", repr(segment))
    s = s.replace("        <view class=\"library-tip\"><text class=\"tip-text\">", "        <view class=\"library-tip\"><text class=\"tip-text\">", 1)
    # now replace final scroll-view closing after tip
    # The pattern after tip: </view>\n      </scroll-view>
    if "      </scroll-view>\n\n      <view class=\"library-upload-bar\">" in s:
        s = s.replace("      </scroll-view>\n\n      <view class=\"library-upload-bar\">", "      </view>\n\n      <view class=\"library-upload-bar\">", 1)
        print("fixed outer close variant")
    else:
        print("outer close variant not found")
        idx = s.find("library-upload-bar")
        print(repr(s[idx-400:idx+100]))
else:
    print("outer already view")

# Ensure there is no leftover </template> after conversion
if "</template>" in s[s.find("library-columns"):s.find("library-tip")+200]:
    # there might be leftover </template> closing
    snippet = s[s.find("library-columns"):s.find("library-tip")+1000]
    # remove stray </template> that was closed for v-else
    # The inner columns view closed with </view>, but template also closed
    s = s.replace("          </view>\n        </view>\n\n        <view class=\"library-tip\">", "          </view>\n        </view>\n\n        <view class=\"library-tip\">", 1)
    # generic remove first </template> after library-columns
    if "</template>" in s:
        # find and check if between columns and tip
        # remove the one that was originally template v-else closing
        # look for pattern "\n        </template>\n\n        <view class=\"library-tip\">"
        if "\n        </template>\n\n        <view class=\"library-tip\">" in s:
            s = s.replace("\n        </template>\n\n        <view class=\"library-tip\">", "\n        <view class=\"library-tip\">", 1)
            print("removed stray template")
        else:
            print("check template location")
            print(repr(s[s.find("</template>")-200:s.find("</template>")+400]))

p.write_text(s, encoding="utf-8")
print("done")
