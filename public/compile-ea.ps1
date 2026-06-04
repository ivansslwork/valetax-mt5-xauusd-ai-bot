param(
  [string]$MetaEditorPath = "C:\\Program Files\\MetaTrader 5\\metaeditor64.exe",
  [string]$Source = "$PSScriptRoot\\..\\mql5\\ValetaxCloudflareAIBot.mq5",
  [string]$Log = "$PSScriptRoot\\..\\mql5\\compile.log"
)

Write-Host "Valetax MT5 EA Auto Compile"
Write-Host "MetaEditor: $MetaEditorPath"
Write-Host "Source    : $Source"
Write-Host "Log       : $Log"

if (!(Test-Path $MetaEditorPath)) {
  Write-Error "MetaEditor not found. Update -MetaEditorPath to your terminal path."
  exit 1
}
if (!(Test-Path $Source)) {
  Write-Error "Source .mq5 not found: $Source"
  exit 1
}

$arguments = "/compile:`"$Source`" /log:`"$Log`""
$p = Start-Process -FilePath $MetaEditorPath -ArgumentList $arguments -Wait -PassThru
Write-Host "MetaEditor exit code: $($p.ExitCode)"
if (Test-Path $Log) {
  Write-Host "--- compile.log ---"
  Get-Content $Log | Select-Object -Last 80
}

$ex5 = [System.IO.Path]::ChangeExtension($Source, ".ex5")
if (Test-Path $ex5) {
  Write-Host "Compiled EX5: $ex5"
  exit 0
}
Write-Warning "EX5 not found. Check compile.log for errors."
exit 2
