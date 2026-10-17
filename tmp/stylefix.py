import io
p = r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
with io.open(p, "r", encoding="utf-8") as f:
    s = f.read()

old_style = """.library-body {
  flex: 1;
  min-height: 0;
  padding: 14px 14px 14px;
  box-sizing: border-box;
}"""

new_style = """.library-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  box-sizing: border-box;
  overflow: hidden;
}
.library-columns {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 12px;
  overflow: hidden;
}
.library-column {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 12px;
  box-sizing: border-box;
}
.library-column--custom {
  border-style: dashed;
  background: var(--color-surface);
}
.column-scroll {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.library-continue {
  flex: none;
  margin-bottom: 0;
}
.library-tip {
  flex: none;
  margin-top: 0;
  text-align: center;
}"""

if old_style in s:
    s = s.replace(old_style, new_style, 1)
    print("replaced library-body style")
else:
    print("not found old_style")
    print(repr(s[s.find(".library-body"):s.find(".library-body")+500]))

# Keep old .library-continue etc but we already redefined; need to remove duplicate later definitions
# Check if duplicate exists further down
# Original file had .library-continue { margin-bottom: 14px; } - we already set margin-bottom 0 above, but later there is still definition
# We should adjust later definitions to avoid conflict: remove or comment
# Let's find the later .library-continue block
import re
# Remove duplicate library-tip and library-continue old blocks that appear later before .library-section
# We had set new .library-continue and .library-tip, but later there is:
# .library-continue { margin-bottom: 14px; } etc and .library-tip { margin-top: 14px ... }
# Let's replace those duplicates to avoid overriding
old_continue = ".library-continue { margin-bottom: 14px; }"
if old_continue in s:
    s = s.replace(old_continue, "/* .library-continue migrated to flex layout - see .library-body */", 1)
    print("removed old continue margin")
else:
    # variant with line break
    print("old continue not found exact")

old_tip = ".library-tip { margin-top: 14px; text-align: center; }"
if old_tip in s:
    s = s.replace(old_tip, "/* .library-tip migrated - see above */", 1)
    print("removed old tip")
else:
    print("old tip not found")

# Adjust .library-section leftover - keep but no effect
# Add responsive tweak inside style: if viewport narrow, keep side by side but reduce gap
# Insert before .library-upload-bar
insert_target = ".library-upload-bar {"
new_media = """@media (max-width: 640px) {
  .library-columns { gap: 8px; }
  .library-column { padding: 8px; border-radius: 12px; }
  .column-scroll { padding-right: 2px; }
  .book-card { padding: 10px 10px; gap: 8px; }
  .book-cover { width: 38px; height: 48px; }
}
.library-upload-bar {"""
if insert_target in s:
    s = s.replace(insert_target, new_media, 1)
    print("added media query")

with io.open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("done style")
