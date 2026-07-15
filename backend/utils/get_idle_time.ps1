$code = @'
using System;
using System.Runtime.InteropServices;
public class UserInput {
    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }
    public static double GetIdleTime() {
        LASTINPUTINFO lii = new LASTINPUTINFO();
        lii.cbSize = (uint)Marshal.SizeOf(lii);
        if (GetLastInputInfo(ref lii)) {
            return (Environment.TickCount - lii.dwTime) / 1000.0;
        }
        return 0;
    }
}
'@

try {
    Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
} catch {}

[UserInput]::GetIdleTime()
