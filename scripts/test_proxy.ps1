# scripts/test_proxy.ps1
$base = "http://localhost:5174"
foreach ($u in @("/api/health/", "/api/docs/", "/api/redoc/", "/api/schema/", "/docs", "/schema", "/redoc")) {
    try {
        $r = Invoke-WebRequest -Uri ($base + $u) -UseBasicParsing -TimeoutSec 15
        Write-Host "[OK] $u => HTTP $($r.StatusCode), $($r.Content.Length) bytes" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $u => $($_.Exception.Message)" -ForegroundColor Red
    }
}