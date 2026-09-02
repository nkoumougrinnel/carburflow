# scripts/test_api.ps1
$ErrorActionPreference = "Continue"
$token = "6dfb1e2ff61128e7fe1ad8613a5e57a6bb0f36e8"
$headers = @{ Authorization = "Token $token" }
$base = "http://localhost:8001/api"

function Test-Endpoint {
    param([string]$Name, [string]$Path, [string]$Method = "GET", [string]$Body = $null)
    try {
        $params = @{ Uri = "$base$Path"; Headers = $headers; Method = $Method; TimeoutSec = 30 }
        if ($Body) { $params.Body = $Body; $params.ContentType = "application/json" }
        $r = Invoke-RestMethod @params
        $count = if ($r -is [array]) { $r.Count } elseif ($r.results) { $r.results.Count } elseif ($r.token) { "token OK" } elseif ($r.status) { $r.status } else { "OK" }
        Write-Host "[OK] $Name ($Path) => $count" -ForegroundColor Green
        return $r
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "[FAIL] $Name ($Path) => HTTP $code" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== TEST DES ENDPOINTS API ===" -ForegroundColor Cyan
Test-Endpoint "Health" "/health/"
Test-Endpoint "Auth Me" "/auth/me"
Test-Endpoint "Cuves Principales" "/cuves_principales"
Test-Endpoint "Cuves Journalieres" "/cuves_journaliere"
Test-Endpoint "Groupes" "/groupes"
Test-Endpoint "Rapports" "/rapports"
Test-Endpoint "Lignes Rapport" "/lignes_rapport"
Test-Endpoint "Dashboard Overview" "/dashboard/overview"
Test-Endpoint "Dashboard Sites" "/dashboard/sites"
Test-Endpoint "Dashboard Groupes" "/dashboard/groupes"
Test-Endpoint "Dashboard Cuves" "/dashboard/cuves"
Test-Endpoint "Alertes" "/alertes/"
Test-Endpoint "Alertes Traitements" "/alertes/traitements"
Test-Endpoint "Norme Meta" "/rapports/norme"
Test-Endpoint "Norme CSV" "/rapports/norme.csv"
Test-Endpoint "Mes Rapports" "/rapports/mes"
Test-Endpoint "Soumissions" "/rapports/soumissions"