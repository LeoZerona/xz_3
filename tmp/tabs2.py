# -*- coding: utf-8 -*-
import io
p = r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
with io.open(p, "r", encoding="utf-8") as f:
    s = f.read()

old_script = "const builtinCount = computed(() => builtinBooks.value.length)\nconst customCount = computed(() => customBooks.value.length)"
new_script = u"""const builtinCount = computed(() => builtinBooks.value.length)
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

# Now template replacement - check existence
needle = "library-columns"
if needle in s:
    print("found columns")
else:
    print("no columns")

# Write interim script change first then handle template separately
with io.open(p, "w", encoding="utf-8") as f:
    f.write(s)
print("saved script part")
