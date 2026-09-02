$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path '.').Path
$outputPath = Join-Path $workspace 'artifacts\Data-Authenticity-by-Design-MOIP.pptx'
$previewPath = Join-Path $workspace '.tmp\data-auth-slide\preview.png'

function Color([int]$r, [int]$g, [int]$b) {
    return $r + ($g * 256) + ($b * 65536)
}

function Add-Rect($slide, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill, [int]$line, [double]$lineWidth = 0.75) {
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

function Add-Oval($slide, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fill) {
    $shape = $slide.Shapes.AddShape(9, $x, $y, $w, $h)
    $shape.Fill.ForeColor.RGB = $fill
    $shape.Fill.Solid()
    $shape.Line.Visible = 0
    return $shape
}

function Add-Text($slide, [string]$text, [double]$x, [double]$y, [double]$w, [double]$h, [double]$size, [int]$color, [bool]$bold = $false, [int]$align = 1, [string]$font = 'Aptos') {
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
    return $box
}

$navy = Color 11 43 71
$ink = Color 23 50 77
$muted = Color 95 117 139
$canvas = Color 247 249 252
$white = Color 255 255 255
$border = Color 216 226 236
$teal = Color 20 132 119
$tealSoft = Color 228 245 241
$amber = Color 216 137 22
$amberSoft = Color 255 242 220
$blue = Color 23 102 163
$blueSoft = Color 234 241 251
$paleText = Color 203 216 229

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = -1
$presentation = $ppt.Presentations.Add()
$presentation.PageSetup.SlideWidth = 960
$presentation.PageSetup.SlideHeight = 540
$slide = $presentation.Slides.Add(1, 12)

try {
    Add-Rect $slide 0 0 960 540 $canvas $canvas 0 | Out-Null

    Add-Rect $slide 0 0 960 88 $navy $navy 0 | Out-Null
    Add-Rect $slide 0 0 960 5 $teal $teal 0 | Out-Null
    Add-Text $slide 'PROPOSED ASSURANCE MODEL FOR SOE REPORTING' 32 18 650 13 10 (Color 141 224 213) $true | Out-Null
    Add-Text $slide 'Data Authenticity by Design' 32 33 700 35 30 $white $true | Out-Null
    Add-Text $slide 'What the platform can prove, and what still requires independent verification' 33 69 720 15 12.5 $paleText | Out-Null
    Add-Rect $slide 835 18 92 51 (Color 18 56 86) (Color 75 111 140) 0.75 | Out-Null
    Add-Text $slide "MOIP`nEXECUTIVE BRIEF" 846 28 70 28 10.5 (Color 232 244 255) $true 2 | Out-Null

    $leftX = 30
    $rightX = 490
    $panelY = 104
    $panelW = 440
    $panelH = 230

    Add-Rect $slide $leftX $panelY $panelW $panelH $white $border 0.9 | Out-Null
    Add-Rect $slide $leftX $panelY $panelW 4 $teal $teal 0 | Out-Null
    Add-Rect $slide $rightX $panelY $panelW $panelH $white $border 0.9 | Out-Null
    Add-Rect $slide $rightX $panelY $panelW 4 $amber $amber 0 | Out-Null

    Add-Rect $slide ($leftX + 16) ($panelY + 16) 30 30 $tealSoft $tealSoft 0 | Out-Null
    Add-Text $slide ([char]0x2713) ($leftX + 16) ($panelY + 19) 30 22 18 $teal $true 2 'Arial' | Out-Null
    Add-Text $slide 'What the platform can authenticate' ($leftX + 58) ($panelY + 13) 350 20 17 $navy $true | Out-Null
    Add-Text $slide 'Evidence of origin, authority and handling' ($leftX + 58) ($panelY + 35) 350 14 10.5 $muted | Out-Null

    Add-Rect $slide ($rightX + 16) ($panelY + 16) 30 30 $amberSoft $amberSoft 0 | Out-Null
    Add-Text $slide '!' ($rightX + 16) ($panelY + 18) 30 24 18 (Color 184 109 5) $true 2 | Out-Null
    Add-Text $slide 'What technology cannot prove alone' ($rightX + 58) ($panelY + 13) 350 20 17 $navy $true | Out-Null
    Add-Text $slide 'Business truth still needs independent assurance' ($rightX + 58) ($panelY + 35) 355 14 10.5 $muted | Out-Null

    $leftItems = @(
        @('Authorized identity', 'Named SOE account + MFA/SSO'),
        @('SOE authority', 'Approved role and nominated data owner'),
        @('Submission trail', 'User, time, session and device recorded'),
        @('Record integrity', 'Versions, hashes and tamper-evident logs'),
        @('Accountability', 'Maker-checker approval and sign-off')
    )
    $rightItems = @(
        @('Factual truth', 'Figures may not match real operations'),
        @('Completeness', 'Assets, liabilities or events may be omitted'),
        @('Source genuineness', 'Issuer validation may still be required'),
        @('Credential misuse', 'Sharing, coercion or use by another person'),
        @('Offline conduct', 'Collusion or backdated evidence')
    )

    for ($i = 0; $i -lt 5; $i++) {
        $rowY = $panelY + 61 + ($i * 31)
        if ($i -gt 0) {
            Add-Rect $slide ($leftX + 16) $rowY ($panelW - 32) 0.55 $border $border 0 | Out-Null
            Add-Rect $slide ($rightX + 16) $rowY ($panelW - 32) 0.55 $border $border 0 | Out-Null
        }
        Add-Oval $slide ($leftX + 18) ($rowY + 6) 18 18 (Color 217 241 235) | Out-Null
        Add-Text $slide ('{0:D2}' -f ($i + 1)) ($leftX + 18) ($rowY + 8) 18 12 7.5 (Color 8 119 107) $true 2 | Out-Null
        Add-Text $slide $leftItems[$i][0] ($leftX + 46) ($rowY + 5) 124 18 12.5 $ink $true | Out-Null
        Add-Text $slide $leftItems[$i][1] ($leftX + 172) ($rowY + 6) 244 17 10.5 $muted | Out-Null

        Add-Oval $slide ($rightX + 18) ($rowY + 6) 18 18 (Color 255 237 205) | Out-Null
        Add-Text $slide ('{0:D2}' -f ($i + 1)) ($rightX + 18) ($rowY + 8) 18 12 7.5 (Color 183 108 0) $true 2 | Out-Null
        Add-Text $slide $rightItems[$i][0] ($rightX + 46) ($rowY + 5) 124 18 12.5 $ink $true | Out-Null
        Add-Text $slide $rightItems[$i][1] ($rightX + 172) ($rowY + 6) 244 17 10.5 $muted | Out-Null
    }

    Add-Rect $slide 30 348 900 149 $blueSoft (Color 202 217 238) 0.9 | Out-Null
    Add-Text $slide 'Recommended four-layer assurance model' 48 361 430 19 16 $navy $true | Out-Null
    Add-Text $slide 'Confidence rises from identity controls to independent verification' 542 363 365 15 10.5 $muted $false 3 | Out-Null

    $steps = @(
        @('Verify identity', 'MFA/SSO + official SOE account ownership'),
        @('Control submission', 'Role-based access + maker-checker sign-off'),
        @('Validate evidence', 'Documents + SECP/FBR/PPRA cross-checks'),
        @('Assure independently', 'Exception review + internal/third-party audit')
    )
    for ($i = 0; $i -lt 4; $i++) {
        $stepX = 48 + ($i * 215)
        Add-Rect $slide $stepX 387 202 67 $white (Color 207 218 234) 0.75 | Out-Null
        Add-Oval $slide ($stepX + 12) 399 24 24 $blue | Out-Null
        Add-Text $slide ([string]($i + 1)) ($stepX + 12) 402 24 15 10 $white $true 2 | Out-Null
        Add-Text $slide $steps[$i][0] ($stepX + 46) 397 144 18 12.5 (Color 18 57 94) $true | Out-Null
        Add-Text $slide $steps[$i][1] ($stepX + 46) 416 144 28 10 $muted | Out-Null
    }

    Add-Rect $slide 48 463 864 25 $white $white 0 | Out-Null
    Add-Rect $slide 48 463 4 25 $teal $teal 0 | Out-Null
    Add-Text $slide 'BOTTOM LINE' 62 469 78 12 9.5 (Color 13 112 103) $true | Out-Null
    Add-Text $slide 'The platform proves who submitted what. Independent checks establish whether the underlying facts are true.' 142 467 752 15 11.5 (Color 36 68 95) $true | Out-Null

    Add-Rect $slide 30 509 900 0.65 $border $border 0 | Out-Null
    Add-Text $slide 'SOE Governance Platform  |  Data assurance principle' 30 516 360 12 8.5 $muted | Out-Null
    Add-Oval $slide 680 518 7 7 $teal | Out-Null
    Add-Text $slide 'Authenticated' 691 516 80 11 8.5 $muted | Out-Null
    Add-Oval $slide 774 518 7 7 $amber | Out-Null
    Add-Text $slide 'Needs verification' 785 516 87 11 8.5 $muted | Out-Null
    Add-Oval $slide 876 518 7 7 $blue | Out-Null
    Add-Text $slide 'Assurance' 887 516 43 11 8.5 $muted | Out-Null

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
