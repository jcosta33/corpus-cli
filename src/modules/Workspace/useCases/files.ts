// Workspace file operations — the new-file-only write the draft writer needs (W4b, AC-004). Kept in
// the Workspace leaf alongside the git ops so the single impure edge (a file write) lives in one
// module the surfaces wrap, never inlined into an engine.

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

import { ok, err, type Result } from '../../../infra/errors/result.ts';
import { createAppError, type AppError } from '../../../infra/errors/createAppError.ts';

export type FileExistsError = AppError<'FileExists', { path: string }>;

/**
 * Write `content` to `path`. By default it is no-clobber — the AC-004 guard: an existing file is an
 * `Err('FileExists')` and nothing is written; the caller surfaces it. `overwrite: true` is the
 * explicit `--force` path — it replaces the existing file (still exactly this one file). Creates
 * parent directories as needed. This is the sole write the draft writer performs, so the workspace /
 * worktree is otherwise byte-unchanged.
 */
export function write_new_file(
    path: string,
    content: string,
    options: { overwrite?: boolean } = {}
): Result<{ path: string }, FileExistsError> {
    if (options.overwrite !== true && existsSync(path)) {
        return err(createAppError('FileExists', `refusing to overwrite an existing file: ${path}`, { path }));
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    return ok({ path });
}
