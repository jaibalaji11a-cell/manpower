Add-Type -AssemblyName System.Drawing

$path = "d:\Manpower management\public\logo.png"
$bmp = New-Object System.Drawing.Bitmap($path)
$w = $bmp.Width
$h = $bmp.Height

$cx = $w / 2.0
$cy = $h / 2.0
# Exact radius of the golden hexagon inside logo.png
$radius = ($w / 2.0) * 0.94

Write-Host "Trimming logo background outside hexagon... (${w}x${h})"

for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $dx = [Math]::Abs($x - $cx)
        $dy = [Math]::Abs($y - $cy)

        # Flat-topped/Pointy-topped Hexagon distance formula:
        # For vertical pointy hexagon: dx * sqrt(3)/2 + dy * 0.5 <= radius * sqrt(3)/2
        # dy <= radius, dx <= radius * sqrt(3)/2
        $inHex = ($dx * 0.866025 + $dy * 0.5 -le $radius * 0.866025) -and ($dx -le $radius * 0.866025)

        if (-not $inHex) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$tmpPath = "d:\Manpower management\public\logo_clean.png"
$bmp.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Remove-Item $path -Force
Rename-Item $tmpPath $path
Write-Host "Logo successfully clipped to pure transparent hexagon!"
