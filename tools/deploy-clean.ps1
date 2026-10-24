# Cloudflare yayını, ÇALIŞMA KLASÖRÜNDEKİ yarım işler olmadan: GitHub'a gitmiş `main`'in temiz kopyasını alır,
# yalnızca cloudflare/wrangler.toml ve cloudflare/src/index.ts'in çalışma klasöründeki hâlini üstüne koyar (altyapı değişikliği),
# derler ve `npm run deploy:cf` çalıştırır. Anahtar: ortamdaki CLOUDFLARE_API_TOKEN (dosyaya yazılmaz, ekrana basılmaz).
# Kullanım (game klasöründe, anahtarı set ettiğin terminalde):  powershell -ExecutionPolicy Bypass -File tools\deploy-clean.ps1
$ErrorActionPreference = 'Stop'
if (-not $env:CLOUDFLARE_API_TOKEN) { throw 'CLOUDFLARE_API_TOKEN bu terminalde tanımlı değil (set CLOUDFLARE_API_TOKEN=...).' }
$repo = (Resolve-Path "$PSScriptRoot\..").Path
$wt = Join-Path $env:TEMP ("eov-deploy-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$extra = @('cloudflare/wrangler.toml', 'cloudflare/src/index.ts')
Push-Location $repo
try {
  git worktree add --detach $wt main | Out-Null
  New-Item -ItemType Junction -Path "$wt\node_modules" -Target "$repo\node_modules" | Out-Null
  New-Item -ItemType Junction -Path "$wt\cloudflare\node_modules" -Target "$repo\cloudflare\node_modules" | Out-Null
  foreach ($f in $extra) { Copy-Item -LiteralPath (Join-Path $repo $f) -Destination (Join-Path $wt $f) -Force }
  Write-Host "Temiz kopya: $wt (main $(git rev-parse --short main)) + $($extra -join ', ')"
  Push-Location $wt
  try { npm run deploy:cf; if ($LASTEXITCODE -ne 0) { throw "deploy:cf başarısız (çıkış $LASTEXITCODE)" } } finally { Pop-Location }
  Write-Host 'Yayın tamam.'
} finally {
  # Önce bağlantıları sil (içeriğini değil), sonra kopyayı kaldır; aksi hâlde node_modules silinir.
  foreach ($j in @("$wt\cloudflare\node_modules", "$wt\node_modules")) { if (Test-Path $j) { cmd /c rmdir "$j" } }
  git worktree remove --force $wt 2>$null
  Pop-Location
}
