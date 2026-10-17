$path = "C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
$newSegmentPath = "C:/Users/22640/Documents/ChatGPT/xz_3/tmp/new_tab_segment.vue"
$s = Get-Content -Raw -Path $path
$newSeg = Get-Content -Raw -Path $newSegmentPath
$startMarker = "<view v-else class=""library-columns"">"
$endMarker = "<view v-if=""books.length > 0"" class=""library-tip"">"
$startIdx = $s.IndexOf($startMarker)
$endIdx = $s.IndexOf($endMarker)
Write-Output "start=$startIdx end=$endIdx"
if ($startIdx -lt 0 -or $endIdx -lt 0) { exit 1 }
$before = $s.Substring(0, $startIdx)
$after = $s.Substring($endIdx)
$newContent = $before + $newSeg + "`n        " + $after
# Powershell adds BOM, but we want UTF8 without BOM? Use .NET
[System.IO.File]::WriteAllText($path, $newContent, [System.Text.Encoding]::UTF8)
Write-Output "done len $($newContent.Length)"
