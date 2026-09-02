$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path '.').Path
$outputPath = Join-Path $workspace 'artifacts\Data-Authenticity-Comparison-MOIP-v3.pptx'
$previewPath = Join-Path $workspace '.tmp\data-auth-slide\preview-v3.png'

function Color([int]$r, [int]$g, [int]$b) {
    return $r + ($g * 256) + ($b * 65536)
}

function Add-Shape($slide, [int]$type, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill, [int]$line, [double]$lineWidth = 0) {
    $shape = $slide.Shapes.AddShape($type, $x, $y, $w, $h)
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

$canvas = Color 246 250 252
$white = Color 255 255 255
$ink = Color 17 35 55
$muted = Color 94 113 133
$leftBlue = Color 52 78 199
$leftDark = Color 39 59 166
$rightBlue = Color 52 148 209
$rightDark = Color 38 123 181
$ringGray = Color 246 247 249
$lineGray = Color 221 229 236

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = -1
$presentation = $ppt.Presentations.Add()
$presentation.PageSetup.SlideWidth = 960
$presentation.PageSetup.SlideHeight = 540
$slide = $presentation.Slides.Add(1, 12)

try {
    Add-Shape $slide 1 0 0 960 540 $canvas $canvas | Out-Null

    Add-Text $slide 'SOE DATA ASSURANCE  /  MOIP EXECUTIVE BRIEF' 0 23 960 15 10.5 $rightDark $true 2 | Out-Null
    Add-Text $slide 'Data Authenticity: What We Can and Cannot Prove' 55 43 850 42 29 $ink $true 2 | Out-Null
    Add-Text $slide 'The platform authenticates the submission chain. Independent checks verify the underlying facts.' 95 88 770 18 12.5 $muted $false 2 | Out-Null

    # Main comparison fields use hexagons to create the angled silhouette in the reference.
    $leftPanel = Add-Shape $slide 10 38 126 440 380 $leftBlue $leftBlue
    $rightPanel = Add-Shape $slide 10 482 126 440 380 $rightBlue $rightBlue
    try {
        $leftPanel.Shadow.Visible = -1
        $leftPanel.Shadow.Blur = 10
        $leftPanel.Shadow.OffsetY = 5
        $leftPanel.Shadow.Transparency = 0.78
        $rightPanel.Shadow.Visible = -1
        $rightPanel.Shadow.Blur = 10
        $rightPanel.Shadow.OffsetY = 5
        $rightPanel.Shadow.Transparency = 0.78
    } catch {}

    # White title capsules.
    Add-Shape $slide 5 103 151 235 41 $white $white | Out-Null
    Add-Text $slide 'CAN AUTHENTICATE' 122 161 198 18 13.5 $leftDark $true 2 | Out-Null
    Add-Shape $slide 5 622 151 235 41 $white $white | Out-Null
    Add-Text $slide 'CANNOT PROVE ALONE' 641 161 198 18 13.5 $rightDark $true 2 | Out-Null

    $leftItems = @(
        @('ID', 'Authorized source', 'Named SOE user, MFA/SSO and approved role'),
        @('LOG', 'Submission provenance', 'Who submitted, when, and from which session'),
        @('HASH', 'Record integrity', 'Versions, document hashes and audit history'),
        @('OK', 'Internal accountability', 'Maker-checker approval and digital attestation')
    )
    $rightItems = @(
        @('FACT', 'Factual accuracy', 'Whether figures reflect actual operations'),
        @('ALL', 'Completeness', 'Whether assets, liabilities or events were omitted'),
        @('DOC', 'Evidence genuineness', 'Whether uploaded evidence is authentic'),
        @('USER', 'Human or offline misuse', 'Sharing, coercion, collusion or backdating')
    )

    for ($i = 0; $i -lt 4; $i++) {
        $rowY = 226 + ($i * 69)

        Add-Shape $slide 9 115 ($rowY - 4) 40 40 $white $white | Out-Null
        Add-Text $slide $leftItems[$i][0] 115 ($rowY + 9) 40 13 8.5 $leftDark $true 2 | Out-Null
        Add-Text $slide $leftItems[$i][1] 171 ($rowY - 3) 188 18 13.5 $white $true | Out-Null
        Add-Text $slide $leftItems[$i][2] 171 ($rowY + 18) 188 29 10.5 (Color 224 234 255) | Out-Null

        Add-Text $slide $rightItems[$i][1] 610 ($rowY - 3) 176 18 13.5 $white $true 3 | Out-Null
        Add-Text $slide $rightItems[$i][2] 603 ($rowY + 18) 183 29 10.5 (Color 231 246 255) $false 3 | Out-Null
        Add-Shape $slide 9 802 ($rowY - 4) 40 40 $white $white | Out-Null
        Add-Text $slide $rightItems[$i][0] 802 ($rowY + 9) 40 13 8.5 $rightDark $true 2 | Out-Null
    }

    # Segmented center hub.
    $outer = Add-Shape $slide 9 365 218 230 230 $ringGray $white 1.2
    try {
        $outer.Shadow.Visible = -1
        $outer.Shadow.Blur = 16
        $outer.Shadow.OffsetY = 7
        $outer.Shadow.Transparency = 0.72
    } catch {}

    $segments = @(
        @(432, 214, 12, 54, 0, $leftBlue),
        @(516, 214, 12, 54, 0, $rightBlue),
        @(357, 326, 54, 12, 0, $leftBlue),
        @(549, 326, 54, 12, 0, $rightBlue),
        @(386, 252, 12, 50, -45, $leftBlue),
        @(562, 252, 12, 50, 45, $rightBlue),
        @(386, 365, 12, 50, 45, $leftBlue),
        @(562, 365, 12, 50, -45, $rightBlue)
    )
    foreach ($segment in $segments) {
        $shape = Add-Shape $slide 1 $segment[0] $segment[1] $segment[2] $segment[3] $segment[5] $segment[5]
        $shape.Rotation = $segment[4]
    }

    $inner = Add-Shape $slide 9 407 260 146 146 $white $white
    try {
        $inner.Shadow.Visible = -1
        $inner.Shadow.Blur = 12
        $inner.Shadow.OffsetY = 5
        $inner.Shadow.Transparency = 0.82
    } catch {}
    Add-Text $slide 'VS' 407 318 146 34 22 $ink $true 2 | Out-Null

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
