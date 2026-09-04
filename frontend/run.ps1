# ============================================================
# CarburFlow - lanceur PowerShell propre
#
# Corrige deux problemes de PowerShell sous Windows :
#   1. stderr de Vite/npm transforme en erreur rouge
#      << node.exe : ... NativeCommandError >>  -> execution via cmd /c
#   2. Caracteres brouilles (donnees UTF-8 mal decodees) -> console en UTF-8
#
# Usage (depuis le dossier frontend) :
#   .\run.ps1 build
#   .\run.ps1 dev
#   .\run.ps1 dev:tunnel
#   .\run.ps1 preview
# ============================================================
param(
    [ValidateSet('dev', 'dev:tunnel', 'build', 'preview')]
    [string]$Script = 'build'
)

# Console en UTF-8 (accents + caracteres de cadre de Vite)
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8
} catch { }

Set-Location -LiteralPath $PSScriptRoot

# cmd /c evite le rendu << NativeCommandError >> de stderr par PowerShell
cmd /c "npm run $Script"
exit $LASTEXITCODE