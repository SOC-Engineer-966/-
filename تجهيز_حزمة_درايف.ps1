$ErrorActionPreference = "Stop"
$src = "C:\accounting-inventory-system"
$dest = "C:\Smart-Accountant-Release"
$zipOutput = "C:\accounting-inventory-system\Smart-Accountant-Ready-For-Drive.zip"

Write-Host "1. تجهيز مجلد التوزيع النظيف..." -ForegroundColor Cyan
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
New-Item -ItemType Directory -Path $dest | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dest "runtime") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dest "frontend") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $dest "backend") | Out-Null

Write-Host "2. نسخ المشغل المحمول node.exe..." -ForegroundColor Cyan
Copy-Item (Join-Path $src "runtime\node.exe") (Join-Path $dest "runtime\node.exe")

Write-Host "3. نسخ واجهة النظام الجاهزة (dist)..." -ForegroundColor Cyan
Copy-Item -Recurse (Join-Path $src "frontend\dist") (Join-Path $dest "frontend\dist")

Write-Host "4. نسخ محرك السيرفر والمكتبات الأساسية..." -ForegroundColor Cyan
Copy-Item (Join-Path $src "backend\server.js") (Join-Path $dest "backend\server.js")
Copy-Item (Join-Path $src "backend\database.js") (Join-Path $dest "backend\database.js")
Copy-Item (Join-Path $src "backend\package.json") (Join-Path $dest "backend\package.json")
Copy-Item -Recurse (Join-Path $src "backend\node_modules") (Join-Path $dest "backend\node_modules")

Write-Host "5. نسخ ملفات التشغيل والاختصارات..." -ForegroundColor Cyan
Copy-Item (Join-Path $src "تشغيل_النظام.bat") (Join-Path $dest "تشغيل_النظام.bat")
Copy-Item (Join-Path $src "إنشاء_اختصار_سطح_المكتب.bat") (Join-Path $dest "إنشاء_اختصار_سطح_المكتب.bat")

Write-Host "6. جاري ضغط الحزمة إلى ملف ZIP..." -ForegroundColor Yellow
if (Test-Path $zipOutput) { Remove-Item -Force $zipOutput }
Compress-Archive -Path "$dest\*" -DestinationPath $zipOutput -CompressionLevel Optimal

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ تم تجهيز الملف المضغوط بنجاح!" -ForegroundColor Green
Write-Host "المسار:" $zipOutput -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
