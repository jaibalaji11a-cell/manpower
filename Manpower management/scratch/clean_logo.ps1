Add-Type -AssemblyName System.Drawing

$inputPath = "d:\Manpower management\public\logo.png"
$outputPath = "d:\Manpower management\public\logo.png"

$bmp = New-Object System.Drawing.Bitmap($inputPath)
$w = $bmp.Width
$h = $bmp.Height

Write-Host "Processing logo dimensions: ${w}x${h}"

# Hexagon center and radius
$cx = $w / 2.0
$cy = $h / 2.0
$radius = [Math]::Min($w, $h) / 2.0 - 5.0

# Point in polygon / mathematical hexagon check:
# Hexagon vertices:
# Top: (cx, cy - r)
# Top-Right: (cx + r * cos(30°), cy - r * sin(30°))
# Bottom-Right: (cx + r * cos(30°), cy + r * sin(30°))
# Bottom: (cx, cy + r)
# Bottom-Left: (cx - r * cos(30°), cy + r * sin(30°))
# Top-Left: (cx - r * cos(30°), cy - r * sin(30°))

# A pixel is outside the hexagon or white/black background
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        $c = $bmp.GetPixel($x, $y)
        
        # Check if color is white background or near-white
        $isWhite = ($c.R -gt 240) -and ($c.G -gt 240) -and ($c.B -gt 240)
        # Check if color is black background around hexagon corners
        $isCornerBlack = ($c.R -lt 25) -and ($c.G -lt 25) -and ($c.B -lt 25)

        # Distance from center normalized
        $dx = [Math]::Abs($x - $cx)
        $dy = [Math]::Abs($y - $cy)
        
        # Hexagon equation: dx * sqrt(3) + dy <= r * sqrt(3) AND dy <= r * (sqrt(3)/2)
        # Flat topped / Pointy topped hexagon check
        $sqrt3 = 1.7320508
        $rNorm = $radius
        
        # Distance test for hexagon:
        # dx * 1 + dy * 0.57735 <= r * 0.866025
        $outsideHex = ($dx * 0.57735 + $dy) -gt $rNorm -or $dx -gt ($rNorm * 0.866025)

        if ($isWhite -or $outsideHex) {
            $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

# Save as clean 32-bit transparent PNG
$bmp.Save($outputPath + ".tmp", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Remove-Item $outputPath -Force
Rename-Item ($outputPath + ".tmp") $outputPath

Write-Host "Logo background removed successfully!"
