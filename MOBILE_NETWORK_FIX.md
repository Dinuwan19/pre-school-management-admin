# Mobile App Network Troubleshooting

If you are experiencing "Network Error" or "No response from server" on your mobile device, follow these steps:

## 1. Verify PC IP Address
Ensure your PC's current LAN IP matches the one in `src/config/api.js`.
1. Open PowerShell/CMD on your PC.
2. Run `ipconfig`.
3. Look for "IPv4 Address" (e.g., `172.19.56.32`).
4. In both `mobile-app` and `parent-app`, check `src/config/api.js` and update the IP if it has changed.

## 2. Windows Firewall (Most Common)
Windows often blocks incoming connections on port 5000.
1. Open **Windows Defender Firewall with Advanced Security**.
2. Click **Inbound Rules** (left side).
3. Click **New Rule...** (right side).
4. Select **Port** -> Next.
5. Select **TCP** and enter `5000` in **Specific local ports** -> Next.
6. Select **Allow the connection** -> Next.
7. Ensure **Private** is checked (and Public if you are on a public Wi-Fi) -> Next.
8. Name it `SDP Backend (5000)` and Finish.

## 3. Network Consistency
- Your mobile phone and PC **MUST** be connected to the same Wi-Fi network.
- Ensure they are on the same subnet (e.g., both IPs start with `172.19.x.x`).

## 4. Android Emulator
If you are using the Android Emulator on the same PC as the backend:
- Change the IP in `src/config/api.js` to `10.0.2.2`.
- `10.0.2.2` is a special alias that points to your host's `localhost`.
