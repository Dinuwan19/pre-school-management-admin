Add-Type -AssemblyName System.Drawing
$files = @("icon.png", "adaptive-icon.png", "splash-icon.png", "logo.png")

foreach ($file in $files) {
    $path = "$PWD\assets\$file"
    $tempPath = "$PWD\assets\$file.tmp.png"
    
    if (Test-Path $path) {
        try {
            $img = [System.Drawing.Image]::FromFile($path)
            $bmp = New-Object System.Drawing.Bitmap $img.Width, $img.Height
            $bmp.SetResolution(72, 72) # Strip all custom DPI/metadata metadata
            
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            $g.Clear([System.Drawing.Color]::Transparent)
            $g.DrawImage($img, 0, 0, $img.Width, $img.Height)
            $g.Dispose()
            $img.Dispose()
            
            # Save to a completely new file to guarantee clean encoding
            $bmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $bmp.Dispose()
            
            # Replace old file (garbage collect to free locks)
            [System.GC]::Collect()
            [System.GC]::WaitForPendingFinalizers()
            Remove-Item $path -Force
            Rename-Item $tempPath -NewName $file
            
            Write-Host "Metadata purged securely for: $file"
        } catch {
            Write-Host "Failed to process: $file - $_"
        }
    } else {
        Write-Host "File not found: $file"
    }
}
