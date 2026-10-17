$path = "C:/Users/22640/Documents/ChatGPT/xz_3/src/pages/reading/index.vue"
$newSegmentPath = "C:/Users/22640/Documents/ChatGPT/xz_3/tmp/new_tab_segment.vue"
$s = Get-Content -Raw -Path $path
$newSeg = Get-Content -Raw -Path $newSegmentPath
$startMarker = ''<view v-else class="library-columns">'' 
$endMarker = ''<view v-if="books.length > 0" class="library-tip">'' 
$startIdx = $s.IndexOf($startMarker)
$endIdx = $s.IndexOf($endMarker)
if ($startIdx -lt 0 -or $endIdx -lt 0) { Write-Output "marker not found start=$startIdx end=$endIdx"; exit 1 }
# Include the tip marker in the kept tail, so endIdx is where to insert new segment before tip
$before = $s.Substring(0, $startIdx)
$after = $s.Substring($endIdx)  # keeps tip and rest
$newContent = $before + $newSeg + "`n        " + $after
Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Output "replaced, before len $($before.Length) after len $($after.Length) newSeg len $($newSeg.Length)"
