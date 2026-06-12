$node = "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if (-not (Test-Path $node)) {
  Write-Error "Bundled Node runtime was not found at $node"
  exit 1
}

Set-Location $PSScriptRoot
Write-Host "Starting Dr MoneyWise..."
Write-Host "Open http://localhost:3000 in your browser"
& $node .\server.js
