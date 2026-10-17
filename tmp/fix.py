import io
p = r"C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
with io.open(p, "r", encoding="utf-8") as f:
    s = f.read()
idx = s.find("library-tip")
print(repr(s[idx-800:idx+400]))
