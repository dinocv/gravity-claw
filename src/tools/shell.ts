import { exec } from "node:child_process";
import { promisify } from "node:util";

const execPromise = promisify(exec);

export async function execute_shell(command: string, timeoutMs: number = 30000): Promise<string> {
    console.log(`💻 [Shell] Executing: ${command}`);

    try {
        const { stdout, stderr } = await execPromise(command, {
            timeout: timeoutMs,
            maxBuffer: 1024 * 1024, // 1MB
        });

        let output = "";
        if (stdout) output += `STDOUT:\n${stdout}\n`;
        if (stderr) output += `STDERR:\n${stderr}\n`;

        if (output.trim().length === 0) {
            return "Command executed successfully (no output).";
        }

        // Truncate if too long for LLM context
        const MAX_OUTPUT = 2500;
        if (output.length > MAX_OUTPUT) {
            return output.slice(0, MAX_OUTPUT) + "\n... (output truncated)";
        }

        return output;
    } catch (err: any) {
        console.error(`❌ [Shell] Error: ${err.message}`);
        let errMsg = `Command failed with exit code ${err.code || 'unknown'}\n`;
        if (err.stdout) errMsg += `STDOUT:\n${err.stdout}\n`;
        if (err.stderr) errMsg += `STDERR:\n${err.stderr}\n`;

        return errMsg.slice(0, 2500);
    }
}
