# リスニングの音声を一括で作って GitHub Releases に置く(Windows のタスクスケジューラから呼ぶ用)。
# バックエンドを起動し、scripts/audio/pregenerate.py を実行し、終わったらバックエンドを止める。
# 失敗したセットがあれば、置いていない分だけ続きから作り直す(最大3回)。
# 結果は build/audio/run-<日時>.log と build/audio/LAST_RESULT.txt に残る。
#
# 使い方: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audio/run-pregenerate.ps1 [-Limit 3] [-NoUpload]
param(
  [int]$Limit = 0,
  [switch]$NoUpload
)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root
$workDir = Join-Path $root "build\audio"
New-Item -ItemType Directory -Force $workDir | Out-Null
$log = Join-Path $workDir ("run-" + (Get-Date -Format "yyyyMMdd-HHmm") + ".log")

function Log($message) {
  $line = (Get-Date -Format "HH:mm:ss") + " " + $message
  Write-Host $line
  Add-Content -Path $log -Value $line -Encoding UTF8
}

# 実行中にスリープしないようにする(この処理が終われば元に戻る)
Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);'
# ES_CONTINUOUS | ES_SYSTEM_REQUIRED = 0x80000001(PowerShell は 0x80000001 を負の整数にするので、10進数で渡す)
[Win32.Power]::SetThreadExecutionState([uint32]2147483649) | Out-Null

# バックエンドは JDK 25 でないとビルドできない
$jdk = Get-ChildItem "C:\Program Files\Java" -Directory -Filter "jdk-25*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdk) { Log "JDK 25 が見つからない"; exit 2 }
$env:JAVA_HOME = $jdk.FullName
$env:PATH = "$($jdk.FullName)\bin;$env:PATH"
$env:GEMINI_API_KEY = "dummy"
$env:ACCESS_LOG_KEY = "dummy-access-log-key-0123456789"
$env:PYTHONIOENCODING = "utf-8"

function Test-Backend {
  try { return (Invoke-WebRequest "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { return $false }
}

$backend = $null
if (Test-Backend) {
  Log "バックエンドは起動済みなので、それを使う(終わっても止めない)"
} else {
  Log "バックエンドを起動する"
  $backend = Start-Process -FilePath (Join-Path $root "backend\mvnw.cmd") -ArgumentList "-q", "-B", "spring-boot:run" `
    -WorkingDirectory (Join-Path $root "backend") -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $workDir "backend.out.log") -RedirectStandardError (Join-Path $workDir "backend.err.log")
  $ready = $false
  for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 3
    if (Test-Backend) { $ready = $true; break }
  }
  if (-not $ready) {
    Log "バックエンドが起動しなかった"
    if ($backend) { taskkill /PID $backend.Id /T /F | Out-Null }
    exit 3
  }
}

# 音声を作って置く。失敗があれば、置いていない分だけ続きから作り直す
$code = 1
for ($pass = 1; $pass -le 3 -and $code -ne 0; $pass++) {
  Log "作成 $pass 回目"
  # Python は自分でログファイル(UTF-8)に書く。出力を PowerShell に通すと文字化けするので、画面には出さない
  $pyArgs = @("scripts/audio/pregenerate.py", "--log-file", $log)
  if ($Limit -gt 0) { $pyArgs += @("--limit", $Limit) }
  if ($NoUpload) { $pyArgs += "--no-upload" }
  & python @pyArgs *> $null
  $code = $LASTEXITCODE
  if ($code -ne 0 -and $pass -lt 3) { Log "失敗があったので 2 分待って続きから作り直す"; Start-Sleep -Seconds 120 }
}

if ($backend) { taskkill /PID $backend.Id /T /F | Out-Null; Log "バックエンドを止めた" }

$report = Join-Path $workDir "report.json"
$summary = if (Test-Path $report) { Get-Content $report -Raw -Encoding UTF8 } else { "(report.json なし)" }
$result = if ($code -eq 0) { "成功" } else { "失敗あり(もう一度 run-pregenerate.ps1 を実行すると、置いていない分だけ続きから作る)" }
Set-Content -Path (Join-Path $workDir "LAST_RESULT.txt") -Encoding UTF8 -Value @(
  "終了: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), "結果: $result", "ログ: $log", $summary)
Log "終了: $result"
exit $code
