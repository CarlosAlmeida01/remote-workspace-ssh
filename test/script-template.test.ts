import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { compileTemplate } from '../src/common/scriptTemplate';

it('normalizes Windows line endings before replacing script variables', () => {
    const root = mkdtempSync(join(tmpdir(), 'remote-ssh-template-'));
    try {
        mkdirSync(join(root, 'src', 'scripts'), { recursive: true });
        writeFileSync(join(root, 'src', 'scripts', 'setup.sh'), '#!/bin/bash\r\nprintf "%%VALUE%%"\r\n');
        const result = compileTemplate('setup.sh', { VALUE: '$& $HOME' }, root);
        expect(result).toBe('#!/bin/bash\nprintf "$& $HOME"\n');
        expect(result).not.toContain('\r');
    } finally {
        rmSync(root, { recursive: true });
    }
});
