$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) { throw 'Cai Flutter SDK va them flutter/bin vao PATH truoc.' }
flutter doctor
if (-not (Test-Path 'android/app/build.gradle.kts') -or -not (Test-Path 'android/gradlew.bat')) {
  $tempProject = Join-Path ([System.IO.Path]::GetTempPath()) ('homestay-' + [guid]::NewGuid().ToString())
  flutter create --platforms=android,web --org vn.homestay --project-name homestay_app --empty $tempProject
  if ($LASTEXITCODE -ne 0) { throw 'Khong tao duoc project nen tang.' }
  Copy-Item (Join-Path $tempProject 'android') . -Recurse
  Copy-Item (Join-Path $tempProject 'web') . -Recurse
}
$manifestPath = 'android/app/src/main/AndroidManifest.xml'
$manifestText = Get-Content $manifestPath -Raw
if ($manifestText -notmatch 'android.permission.INTERNET') {
  $manifestText = $manifestText.Replace('<application', '<uses-permission android:name="android.permission.INTERNET"/><application')
  Set-Content -Path $manifestPath -Value $manifestText -Encoding utf8
}
$debugPath = 'android/app/src/debug/AndroidManifest.xml'
New-Item -ItemType Directory -Path (Split-Path $debugPath) -Force | Out-Null
Set-Content -Path $debugPath -Encoding utf8 -Value '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:usesCleartextTraffic="true"/></manifest>'
$gradleProperties = 'android/gradle.properties'
$gradleText = Get-Content $gradleProperties -Raw
foreach ($setting in @('kotlin.incremental=false', 'kotlin.compiler.execution.strategy=in-process')) {
  $propertyName = ($setting -split '=', 2)[0]
  $pattern = '(?m)^' + [regex]::Escape($propertyName) + '=.*if ($LASTEXITCODE -ne 0) { throw 'Khong tai duoc dependencies.' }
flutter analyze
if ($LASTEXITCODE -ne 0) { throw 'Can sua loi analyze truoc khi chay.' }
flutter test
if ($LASTEXITCODE -ne 0) { throw 'Kiem thu chua dat.' }
Write-Host 'San sang. Chay: flutter run --dart-define=API_URL=http://10.0.2.2:3000/api'

  if ($gradleText -match $pattern) { $gradleText = [regex]::Replace($gradleText, $pattern, $setting) }
  else { $gradleText += "`n$setting`n" }
}
Set-Content -Path $gradleProperties -Value $gradleText -Encoding utf8
flutter pub get
if ($LASTEXITCODE -ne 0) { throw 'Khong tai duoc dependencies.' }
flutter analyze
if ($LASTEXITCODE -ne 0) { throw 'Can sua loi analyze truoc khi chay.' }
flutter test
if ($LASTEXITCODE -ne 0) { throw 'Kiem thu chua dat.' }
Write-Host 'San sang. Chay: flutter run --dart-define=API_URL=http://10.0.2.2:3000/api'
