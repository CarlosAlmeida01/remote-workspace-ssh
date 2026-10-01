import { describe, expect, it } from 'vitest';
import { splitProxyCommand } from '../src/common/proxyCommand';

describe('Windows ProxyCommand paths', () => {
    it('preserves executable and config paths containing spaces', () => {
        const command = String.raw`"C:\Program Files\Client\proxy.exe" --config "C:\Users\Carlos Diego\cfg" --stdio %h`;
        expect(splitProxyCommand(command, true)).toEqual([
            String.raw`C:\Program Files\Client\proxy.exe`, '--config',
            String.raw`C:\Users\Carlos Diego\cfg`, '--stdio', '%h'
        ]);
    });
    it('preserves unquoted paths, UNC paths and trailing backslashes', () => {
        const command = String.raw`C:\Users\carlo\proxy.exe \\server\share\config C:\folder` + '\\';
        expect(splitProxyCommand(command, true)).toEqual([
            String.raw`C:\Users\carlo\proxy.exe`, String.raw`\\server\share\config`, 'C:\\folder\\'
        ]);
    });
    it('accepts forward slashes and escaped quotes', () => {
        expect(splitProxyCommand(String.raw`"C:/Program Files/proxy.exe" "say \"hi\""`, true))
            .toEqual(['C:/Program Files/proxy.exe', 'say "hi"']);
    });
    it('keeps POSIX escaping behavior', () => {
        expect(splitProxyCommand(String.raw`/opt/proxy --config /home/Carlos\ Diego/cfg`, false))
            .toEqual(['/opt/proxy', '--config', '/home/Carlos Diego/cfg']);
    });
    it('does not mutate arguments already supplied as an array', () => {
        const args = [String.raw`C:\proxy.exe`, '--stdio'];
        const result = splitProxyCommand(args, true);
        expect(result).toEqual(args);
        expect(result).not.toBe(args);
    });
});
