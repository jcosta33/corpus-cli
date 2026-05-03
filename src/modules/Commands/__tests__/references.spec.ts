import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../useCases/references.ts';
import { spawnSync } from 'child_process';

vi.mock('child_process', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...(actual as object), spawnSync: vi.fn() };
});

vi.mock('../../Workspace/useCases/index.ts', () => ({
    get_repo_root: vi.fn(() => '/tmp/repo'),
    resolve_within: vi.fn((root: string, path: string) => ({ ok: true, value: `${root}/${path}` })),
}));

import { get_repo_root, resolve_within } from '../../Workspace/useCases/index.ts';

describe('references', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(get_repo_root).mockReturnValue('/tmp/repo');
        vi.mocked(resolve_within).mockReturnValue({ ok: true, value: '/tmp/repo/src' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns 1 when not in a git repo', () => {
        vi.mocked(get_repo_root).mockImplementation(() => { throw new Error('not a repo'); });
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when symbol is missing', () => {
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when resolve_within fails', () => {
        vi.mocked(resolve_within).mockReturnValue({ ok: false, error: new Error('not allowed') });
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(1);
    });

    it('finds references successfully', () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'file.ts:10:foo', stderr: '' } as ReturnType<typeof spawnSync>);
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(0);
    });

    it('handles no references found', () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr: '' } as ReturnType<typeof spawnSync>);
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(0);
    });

    it('uses --path flag', () => {
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: 'file.ts:10:foo', stderr: '' } as ReturnType<typeof spawnSync>);
        process.argv = ['node', 'script', 'foo', '--path', 'lib'];
        expect(run()).toBe(0);
    });

    it('truncates results over 30 matches', () => {
        const lines = Array.from({ length: 40 }, (_, i) => `file${i}.ts:${i + 1}:foo`).join('\n');
        vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: lines, stderr: '' } as ReturnType<typeof spawnSync>);
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(0);
    });
});
