import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../useCases/path.ts';

vi.mock('../../Workspace/useCases/index.ts', () => ({
    get_repo_root: vi.fn(() => '/tmp/repo'),
    worktree_list: vi.fn(() => []),
}));

vi.mock('../../Terminal/useCases/index.ts', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...(actual as object), fzf_select: vi.fn(), yellow: vi.fn((t: string) => t), red: vi.fn((t: string) => t) };
});

import { worktree_list, get_repo_root } from '../../Workspace/useCases/index.ts';
import { fzf_select } from '../../Terminal/useCases/index.ts';

describe('path', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(get_repo_root).mockReturnValue('/tmp/repo');
        vi.mocked(worktree_list).mockReturnValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns 1 when not in a git repo', () => {
        vi.mocked(get_repo_root).mockImplementation(() => { throw new Error('not a repo'); });
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when slug is missing and no sandboxes exist', () => {
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('prints path via fzf selection', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        vi.mocked(fzf_select).mockReturnValue('foo');
        process.argv = ['node', 'script'];
        expect(run()).toBe(0);
    });

    it('returns 1 when fzf selection is empty', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        vi.mocked(fzf_select).mockReturnValue(null);
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when fzf throws', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        vi.mocked(fzf_select).mockImplementation(() => { throw new Error('fzf not found'); });
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('prints path for matching sandbox', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(0);
    });

    it('returns 1 when sandbox not found', () => {
        vi.mocked(worktree_list).mockReturnValue([]);
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(1);
    });
});
