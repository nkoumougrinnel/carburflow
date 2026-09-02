# scripts/test_assets.ps1
$base = "http://localhost:5174"
foreach ($asset in @("/assets/index-D74URkST.js", "/assets/index-Ri5P2QF0.css", "/assets/vendor-react-DWPSECoX.js", "/assets/vendor-motion-WqhDYan_.js", "/assets/vendor-charts-Cxc5FdtT.js", "/favicon.ico")) {
    try {
        $r = Invoke-WebRequest -Uri ($base + $asset) -UseBasicParsing -TimeoutSec 15 -Method HEAD
        Write-Host "[OK] $asset => HTTP $($r.StatusCode), $($r.Headers['Content-Length']) bytes" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $asset => $($_.Exception.Message)" -ForegroundColor Red
    }
}