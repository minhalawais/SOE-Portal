$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path '.').Path
$outputPath = Join-Path $workspace 'artifacts\Data-Authenticity-by-Design-MOIP-v2.pptx'
$previewPath = Join-Path $workspace '.tmp\data-auth-slide\preview-v2.png'

function Color([int]$r, [int]$g, [int]$b) {
    return $r + ($g * 256) + ($b * 65536)
}

function Add-Rect($slide, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill, [int]$line, [double]$lineWidth = 0) {
    $shape = $slide.Shapes.AddShape(1, $x, $y, $w, $h)
    $shape.Fill.ForeColor.RGB = $fill
    $shape.Fill.Solid()
    if ($lineWidth -le 0) {
        $shape.Line.Visible = 0
    } else {
        $shape.Line.Visible = -1
        $shape.Line.ForeColor.RGB = $line
        $shape.Line.Weight = $lineWidth
    }
    return $shape
}

function Add-Oval($slide, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill, [int]$line, [double]$lineWidth = 0) {
    $shape = $slide.Shapes.AddShape(9, $x, $y, $w, $h)
    $shape.Fill.ForeColor.RGB = $fill
    $shape.Fill.Solid()
    if ($lineWidth -le 0) {
        $shape.Line.Visible = 0
    } else {
        $shape.Line.Visible = -1
        $shape.Line.ForeColor.RGB = $line
        $shape.Line.Weight = $lineWidth
    }
    return $shape
}

function Add-Text($slide, [string]$text, [double]$x, [double]$y, [double]$w, [double]$h, [double]$size, [int]$color, [bool]$bold = $false, [int]$align = 1, [string]$font = 'Aptos Display') {
    $box = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
    $box.Fill.Visible = 0
    $box.Line.Visible = 0
    $box.TextFrame.MarginLeft = 0
    $box.TextFrame.MarginRight = 0
    $box.TextFrame.MarginTop = 0
    $box.TextFrame.MarginBottom = 0
    $box.TextFrame.WordWrap = -1
    $box.TextFrame.AutoSize = 0
    $range = $box.TextFrame.TextRange
    $range.Text = $text
    $range.Font.Name = $font
    $range.Font.Size = $size
    $range.Font.Color.RGB = $color
    $range.Font.Bold = $(if ($bold) { -1 } else { 0 })
    $range.ParagraphFormat.Alignment = $align
    $box.Width = $w
    $box.Height = $h
    return $box
}

$canvas = Color 246 248 251
$white = Color 255 255 255
$navy = Color 9 39 63
$navy2 = Color 12 52 80
$ink = Color 20 46 70
$muted = Color 92 111 131
$pale = Color 226 233 240
$teal = Color 36 155 137
$tealLight = Color 133 218 204
$tealGhost = Color 18 88 91
$amber = Color 240 164 47
$amberDark = Color 177 105 4
$amberPale = Color 255 246 229
$amberGhost = Color 246 219 174
$coral = Color 210 92 76

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = -1
$presentation = $ppt.Presentations.Add()
$presentation.PageSetup.SlideWidth = 960
$presentation.PageSetup.SlideHeight = 540
$slide = $presentation.Slides.Add(1, 12)

try {
    Add-Rect $slide 0 0 960 540 $canvas $canvas | Out-Null

    # Editorial header
    Add-Text $slide 'SOE DATA ASSURANCE  /  MOIP EXECUTIVE BRIEF' 46 24 580 16 10.5 $teal $true | Out-Null
    Add-Text $slide 'Data Authenticity by Design' 46 42 665 40 31 $navy $true | Out-Null
    Add-Text $slide 'Authenticating the source is not the same as verifying the facts.' 48 82 655 18 13.5 $muted | Out-Null
    Add-Rect $slide 760 29 154 2 $teal $teal | Out-Null
    Add-Text $slide 'THE DISTINCTION' 760 39 154 17 10 $navy $true 3 | Out-Null
    Add-Text $slide 'SUBMISSION  vs  CONTENT' 760 59 154 19 11.5 $muted $true 3 | Out-Null

    # Full-height comparison fields
    Add-Rect $slide 0 112 484 428 $navy $navy | Out-Null
    Add-Rect $slide 484 112 476 428 $amberPale $amberPale | Out-Null
    Add-Rect $slide 0 112 484 5 $teal $teal | Out-Null
    Add-Rect $slide 484 112 476 5 $amber $amber | Out-Null

    # Diagonal divider and depth, inspired by the supplied reference
    $shadowSlash = Add-Rect $slide 466 95 30 476 (Color 189 198 207) (Color 189 198 207)
    $shadowSlash.Rotation = 8
    try {
        $shadowSlash.Fill.Transparency = 0.58
        $shadowSlash.Shadow.Visible = -1
        $shadowSlash.Shadow.Blur = 12
        $shadowSlash.Shadow.OffsetX = 8
        $shadowSlash.Shadow.OffsetY = 7
        $shadowSlash.Shadow.Transparency = 0.58
    } catch {}
    $slash = Add-Rect $slide 458 92 24 482 $white $white
    $slash.Rotation = 8

    # Large editorial numerals
    Add-Text $slide '01' 28 126 118 105 72 $tealGhost $true | Out-Null
    Add-Text $slide '02' 502 126 118 105 72 $amberGhost $true | Out-Null

    # Side titles
    Add-Oval $slide 123 135 30 30 $teal $teal | Out-Null
    Add-Text $slide ([char]0x2713) 123 139 30 20 17 $white $true 2 'Arial' | Out-Null
    Add-Text $slide 'WE CAN AUTHENTICATE' 164 134 278 22 18 $white $true | Out-Null
    Add-Text $slide 'Origin, authority and chain of custody' 164 158 282 16 10.5 (Color 176 205 220) | Out-Null

    Add-Oval $slide 598 135 30 30 $amber $amber | Out-Null
    Add-Text $slide '!' 598 137 30 22 18 $white $true 2 | Out-Null
    Add-Text $slide 'WE CANNOT PROVE ALONE' 639 134 274 22 18 $ink $true | Out-Null
    Add-Text $slide 'Truth and completeness need corroboration' 639 158 276 16 10.5 $muted | Out-Null

    $leftItems = @(
        @('ID', 'Authorized identity', 'Named SOE account secured by MFA or SSO'),
        @('ROLE', 'SOE authority', 'Approved role and nominated data owner'),
        @('LOG', 'Submission provenance', 'User, timestamp, session and device recorded'),
        @('HASH', 'Record integrity', 'Version history, hashes and tamper-evident logs'),
        @('SIGN', 'Accountability', 'Maker-checker approval and digital sign-off')
    )
    $rightItems = @(
        @('FACT', 'Factual truth', 'Whether reported figures reflect real operations'),
        @('ALL', 'Completeness', 'Whether assets, liabilities or events were omitted'),
        @('DOC', 'Source genuineness', 'Whether evidence is genuine without issuer validation'),
        @('USER', 'Credential misuse', 'Whether an approved account was shared or coerced'),
        @('OFF', 'Offline conduct', 'Collusion, backdating or activity outside the system')
    )

    for ($i = 0; $i -lt 5; $i++) {
        $rowY = 195 + ($i * 65)

        if ($i -gt 0) {
            Add-Rect $slide 123 ($rowY - 9) 318 0.65 (Color 50 82 105) (Color 50 82 105) | Out-Null
            Add-Rect $slide 598 ($rowY - 9) 318 0.65 (Color 232 211 178) (Color 232 211 178) | Out-Null
        }

        Add-Oval $slide 123 ($rowY + 2) 38 38 (Color 15 68 84) (Color 47 170 151) 1.2 | Out-Null
        Add-Text $slide $leftItems[$i][0] 123 ($rowY + 13) 38 12 7.5 $tealLight $true 2 | Out-Null
        Add-Text $slide $leftItems[$i][1] 174 $rowY 255 19 14.5 $white $true | Out-Null
        Add-Text $slide $leftItems[$i][2] 174 ($rowY + 22) 260 25 10.5 (Color 174 201 216) | Out-Null

        Add-Oval $slide 598 ($rowY + 2) 38 38 $white (Color 237 181 93) 1.1 | Out-Null
        Add-Text $slide $rightItems[$i][0] 598 ($rowY + 13) 38 12 7.5 $amberDark $true 2 | Out-Null
        Add-Text $slide $rightItems[$i][1] 649 $rowY 255 19 14.5 $ink $true | Out-Null
        Add-Text $slide $rightItems[$i][2] 649 ($rowY + 22) 263 25 10.5 $muted | Out-Null
    }

    # Small visual anchor at the boundary
    Add-Oval $slide 453 122 54 54 $white (Color 213 221 229) 0.9 | Out-Null
    Add-Text $slide 'VS' 453 138 54 20 14 $navy $true 2 | Out-Null

    $presentation.SaveAs($outputPath, 24)
    $slide.Export($previewPath, 'PNG', 1600, 900)
}
finally {
    $presentation.Close()
    $ppt.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($slide) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

Write-Output $outputPath
Write-Output $previewPath
