param(
  [Parameter(Mandatory=$true)][string]$Config,
  [Parameter(Mandatory=$true)][ValidateSet('harness', 'controller')][string]$Role
)
$ErrorActionPreference = 'Stop'
$settings = Get-Content -LiteralPath $Config -Raw -Encoding UTF8 | ConvertFrom-Json
$task = $settings.tasks.$Role
# A suspended child joins a kill-on-close Job Object before it can create descendants.
# Ending the scheduled task then stops the entire Harness tree, not just this launcher.
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public static class DshWindowsTask {
    [StructLayout(LayoutKind.Sequential)] struct Security {
        public int length; public IntPtr descriptor; public int inherit;
    }
    [StructLayout(LayoutKind.Sequential)] struct Startup {
        public int cb; public IntPtr reserved, desktop, title;
        public uint x, y, xSize, ySize, xChars, yChars, fill, flags;
        public short show, reservedSize; public IntPtr reservedData, stdin, stdout, stderr;
    }
    [StructLayout(LayoutKind.Sequential)] struct ProcessInfo {
        public IntPtr process, thread; public uint pid, tid;
    }
    [StructLayout(LayoutKind.Sequential)] struct BasicLimits {
        public long processTime, jobTime; public uint flags;
        public UIntPtr minWorkingSet, maxWorkingSet; public uint activeProcesses;
        public UIntPtr affinity; public uint priority, scheduling;
    }
    [StructLayout(LayoutKind.Sequential)] struct IoCounters {
        public ulong readOps, writeOps, otherOps, readBytes, writeBytes, otherBytes;
    }
    [StructLayout(LayoutKind.Sequential)] struct Limits {
        public BasicLimits basic; public IoCounters io;
        public UIntPtr processMemory, jobMemory, peakProcessMemory, peakJobMemory;
    }
    [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job, int kind, ref Limits limits, uint length);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateFile(string path, uint access, uint share, ref Security security, uint disposition, uint flags, IntPtr template);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string app, StringBuilder command, IntPtr processSecurity, IntPtr threadSecurity, bool inherit, uint flags, IntPtr environment, string cwd, ref Startup startup, out ProcessInfo process);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError=true)] static extern uint WaitForSingleObject(IntPtr handle, uint timeout);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetExitCodeProcess(IntPtr process, out uint code);
    [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process, uint code);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);

    // No shell interprets arguments; stdout/stderr append directly to the private log.
    public static int Run(string node, string arguments, string cwd, string log) {
        IntPtr job = IntPtr.Zero, output = new IntPtr(-1);
        ProcessInfo child = new ProcessInfo();
        bool assigned = false;
        try {
            job = CreateJobObject(IntPtr.Zero, null);
            if (job == IntPtr.Zero) throw new Win32Exception();
            Limits limits = new Limits();
            limits.basic.flags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            if (!SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(limits))) throw new Win32Exception();
            Security security = new Security { length = Marshal.SizeOf(typeof(Security)), inherit = 1 };
            output = CreateFile(log, 0x4, 0x7, ref security, 4, 0x80, IntPtr.Zero);
            if (output == new IntPtr(-1)) throw new Win32Exception();
            Startup startup = new Startup { cb = Marshal.SizeOf(typeof(Startup)), flags = 0x100, stdout = output, stderr = output };
            if (!CreateProcess(node, new StringBuilder("\"" + node + "\" " + arguments), IntPtr.Zero, IntPtr.Zero, true, 0x08000004, IntPtr.Zero, cwd, ref startup, out child)) throw new Win32Exception();
            if (!AssignProcessToJobObject(job, child.process)) throw new Win32Exception();
            assigned = true;
            if (ResumeThread(child.thread) == uint.MaxValue) throw new Win32Exception();
            if (WaitForSingleObject(child.process, uint.MaxValue) != 0) throw new Win32Exception();
            uint code;
            if (!GetExitCodeProcess(child.process, out code)) throw new Win32Exception();
            return unchecked((int)code);
        } catch (Exception error) {
            File.AppendAllText(log, error.ToString() + Environment.NewLine);
            throw;
        } finally {
            // Assignment failure must not leave a suspended process behind.
            if (child.process != IntPtr.Zero && !assigned) TerminateProcess(child.process, 1);
            if (child.thread != IntPtr.Zero) CloseHandle(child.thread);
            if (child.process != IntPtr.Zero) CloseHandle(child.process);
            if (job != IntPtr.Zero) CloseHandle(job);
            if (output != new IntPtr(-1)) CloseHandle(output);
        }
    }
}
'@
exit [DshWindowsTask]::Run($settings.node, $task.arguments, $task.cwd, $task.log)
