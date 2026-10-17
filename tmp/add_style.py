# -*- coding: utf-8 -*-
import io
p = r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
with io.open(p, "r", encoding="utf-8") as f:
    s = f.read()

old_block = """.library-columns {
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

new_block = """.library-tab-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}
.library-search {
  flex: none;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-sizing: border-box;
}
.search-icon {
  flex: none;
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1;
}
.search-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  margin: 0;
}
.search-placeholder {
  color: var(--color-text-muted);
}
.search-clear {
  flex: none;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  cursor: pointer;
}
.search-clear-text {
  font-size: 14px;
  color: var(--color-text-muted);
  line-height: 1;
}
.library-tabs {
  flex: none;
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-sizing: border-box;
}
.library-tab {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.library-tab.is-active {
  background: var(--color-surface);
  border-color: var(--color-border);
  box-shadow: 0 2px 10px var(--color-shadow);
}
.library-tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}
.tab-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.library-tab.is-active .tab-label {
  color: var(--color-text);
}
.tab-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 2px 7px;
  border-radius: 999px;
  white-space: nowrap;
}
.library-tab.is-active .tab-count {
  color: var(--color-primary);
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
}
.library-tab-panel {
  flex: 1;
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
}
/* 兼容旧左右布局类，保留但不再使用 */
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
}"""

if old_block in s:
    s = s.replace(old_block, new_block, 1)
    print("replaced style block")
else:
    print("old_block not found")
    # debug
    idx = s.find(".library-columns")
    print(repr(s[idx-500:idx+2000]))

with io.open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("done style")
