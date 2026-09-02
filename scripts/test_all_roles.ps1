# scripts/test_all_roles.ps1
$ErrorActionPreference = "Continue"
$base = "http://localhost:8001/api"

function Login($user, $pass) {
    try {
        $body = @{ username = $user; password = $pass } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $body -ContentType "application/json"
        return $r.token
    } catch {
        Write-Host "[FAIL] login $user => $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

foreach ($u in @(
    @{ name = "admin"; pass = "admin" },
    @{ name = "operateur"; pass = "operateur123" },
    @{ name = "user"; pass = "user123" }
)) {
    $tok = Login $u.name $u.pass
    if ($tok) {
        Write-Host "[OK] login $($u.name) => token ${tok.Substring(0,10)}..." -ForegroundColor Green
        foreach ($endpoint in @("/auth/me", "/cuves_principales", "/groupes", "/rapports", "/lignes_rapport", "/dashboard/overview", "/alertes/")) {
            try {
                $r = Invoke-RestMethod -Uri "$base$endpoint" -Headers @{ Authorization = "Token $tok" } -Method GET
                $count = if ($r -is [array]) { $r.Count } elseif ($r.results) { $r.results.Count } elseif ($r.id) { "1" } elseif ($r.status) { $r.status } else { "OK" }
                Write-Host "  [OK] $endpoint ($($u.name)) => $count" -ForegroundColor Green
            } catch {
                $code = $_.Exception.Response.StatusCode.value__
                Write-Host "  [FAIL] $endpoint ($($u.name)) => HTTP $code" -ForegroundColor Red
            }
        }
    }
}