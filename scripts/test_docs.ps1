# scripts/test_docs.ps1
$base = "http://localhost:8001"
foreach ($u in @("/api/schema/", "/api/docs/", "/api/redoc/")) {
    try {
        $r = Invoke-WebRequest -Uri ($base + $u) -UseBasicParsing -TimeoutSec 10
        Write-Host "[OK] $u => HTTP $($r.StatusCode), $($r.Content.Length) bytes" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $u => $($_.Exception.Message)" -ForegroundColor Red
    }
}