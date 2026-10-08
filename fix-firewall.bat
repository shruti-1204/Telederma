@echo off
echo ========================================================
echo   TeleDerma - Unblocking Firewall for Mobile Access
echo ========================================================
echo.
echo 1. Changing Node.js firewall rule from Block to Allow...
netsh advfirewall firewall set rule name="Node.js JavaScript Runtime" new action=allow
netsh advfirewall firewall set rule name="node.exe" new action=allow

echo.
echo 2. Adding Inbound Allow rule for TeleDerma ports (5000, 8000, 8080, 8081, 8082)...
netsh advfirewall firewall delete rule name="TeleDerma Dev Ports" >nul 2>&1
netsh advfirewall firewall add rule name="TeleDerma Dev Ports" dir=in action=allow protocol=TCP localport=5000,8000,8080,8081,8082 profile=any

echo.
echo ========================================================
echo   DONE! Firewall rules updated successfully!
echo   You can now open http://192.168.0.104:8082 on your phone.
echo ========================================================
pause
