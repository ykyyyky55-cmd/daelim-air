@echo off
chcp 65001 > nul
title 대기배출시설 운영기록부 시스템

echo =========================================================
echo 대기배출시설 및 방지시설 운영기록부 시스템을 실행합니다.
echo =========================================================

cd /d "C:\code\daelim-air"

if not exist "node_modules" (
    echo 필요한 패키지를 설치 중입니다...
    call npm install
)

echo 서버를 시작하고 브라우저를 엽니다...
start http://localhost:3000
node server.js

pause
