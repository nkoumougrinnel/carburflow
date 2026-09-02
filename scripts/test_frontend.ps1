# scripts/test_frontend.ps1
$base = "http://localhost:5174"

foreach ($test in @(
    @{ name = "HomePage"; url = "/" },
    @{ name = "API proxy Health"; url = "/api/health/" },
    @{ name = "Admin Django"; url = "/admin" },
    @{ name = "Docs Swagger"; url = "/docs" },
    @{ name = "API schema"; url = "/schema/" }
)) {
    try {
        $r = Invoke-WebRequest -Uri "$($base)$($test.url)" -Method GET -UseBasicParsing -TimeoutSec 15
        $title = ""
        if ($r.Content -match '<title>(.*?)</title>') { $title = $matches[1] }
        Write-Host "[OK] $($test.name) => HTTP $($r.StatusCode), $($r.Content.Length) bytes, title: $title" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $($test.name) => $($_.Exception.Message)" -ForegroundColor Red
    }
}