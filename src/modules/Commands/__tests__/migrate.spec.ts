import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../useCases/migrate.ts';
import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';

vi.mock('child_process', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...(actual as object), spawnSync: vi.fn() };
});

vi.mock('../../Workspace/useCases/index.ts', () => ({
    get_repo_root: vi.fn(() => '/tmp/repo'),
    resolve_within: vi.fn((root: string, path: string) => ({ ok: true, value: `${root}/${path}` })),
}));

import { get_repo_root, resolve_within } from '../../Workspace/useCases/index.ts';

describe('migrate', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(get_repo_root).mockReturnValue('/tmp/repo');
        vi.mocked(resolve_within).mockReturnValue({ ok: true, value: '/tmp/repo/file.ts' });
        writeFileSync('/tmp/repo/file.ts', 'const x = 1;', 'utf8');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns 1 when not in a git repo', () => {
        vi.mocked(get_repo_root).mockImplementation(() => { throw new Error('not a repo'); });
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when file is missing', () => {
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when resolve_within fails', () => {
        vi.mocked(resolve_within).mockReturnValue({ ok: false, error: new Error('not allowed') });
        process.argv = ['node', 'script', 'file.ts'];
        expect(run()).toBe(1);
    });

    it('returns 1 when file does not exist on disk', () => {
        vi.mocked(resolve_within).mockReturnValue({ ok: true, value: '/tmp/repo/missing.ts' });
        process.argv = ['node', 'script', 'missing.ts'];
        expect(run()).toBe(1);
    });

    it('creates migration tasks successfully', () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as ReturnType<typeof spawnSync>);
        process.argv = ['node', 'script', 'file.ts'];
        expect(run()).toBe(0);
    });

    it('uses target language from positional arg', () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: '', stderr: '' } as ReturnType<typeof spawnSync>);
        process.argv = ['node', 'script', 'file.ts', 'Go'];
        expect(run()).toBe(0);
    });
});
