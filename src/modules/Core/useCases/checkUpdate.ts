// The kit drift engine (SPEC-swarm-update AC-001/003/004/005, ADR-0091). Pure: it reads the
// workspace's `.agents/.swarm-version` pin and a resolved kit source's `VERSION` (+ optional
// `CHANGELOG.md`), compares them, and returns whether the workspace is behind — never a network call
// (the command surface resolves the kit, this engine only reads files) and never a write
// (reconcile-only, ADR-0077). `swarm check` stays hermetic; the network lives in the `update` surface.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ok, err, type Result } from '../../../infra/errors/result.ts';
import { createAppError, type AppError } from '../../../infra/errors/createAppError.ts';
import type { OutcomeLevel } from './unixOutcome.ts';

export type CheckUpdateInput = Readonly<{
    // The workspace root (the dir carrying `.agents/.swarm-version`).
    workspaceDir: string;
    // A resolved kit source dir (a local `--from` path or a temp clone) carrying `VERSION`.
    kitSourceDir: string;
}>;

export type UpdateCheckReport = Readonly<{
    level: OutcomeLevel;
    currentVersion: string;
    latestVersion: string;
    behind: boolean;
    // The kit CHANGELOG content when behind (the delta the adopter would gain), else null.
    changelog: string | null;
}>;

function parse_semver(version: string): readonly [number, number, number] | null {
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
    if (match === null) {
        return null;
    }
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// Behind = the kit's version is newer than the pin. Equal or ahead → not behind. A non-semver pin
// that merely differs is treated conservatively as drift (AC-004), never silently clean.
function is_behind(current: string, latest: string): boolean {
    if (current === latest) {
        return false;
    }
    const c = parse_semver(current);
    const l = parse_semver(latest);
    if (c === null || l === null) {
        return true;
    }
    for (let i = 0; i < 3; i++) {
        if (l[i] > c[i]) {
            return true;
        }
        if (l[i] < c[i]) {
            return false;
        }
    }
    return false;
}

function read_nonempty(path: string): string | null {
    if (!existsSync(path)) {
        return null;
    }
    const content = readFileSync(path, 'utf8').trim();
    return content.length === 0 ? null : content;
}

export function check_update(input: CheckUpdateInput): Result<UpdateCheckReport, AppError> {
    const pinPath = join(input.workspaceDir, '.agents', '.swarm-version');
    const currentVersion = read_nonempty(pinPath);
    if (currentVersion === null) {
        return err(
            createAppError(
                'VersionPinMissing',
                `no kit version pin at ${pinPath} — run from the workspace root, or this workspace predates \`swarm init\`'s pin (ADR-0081)`,
                { path: pinPath }
            )
        );
    }

    const kitVersionPath = join(input.kitSourceDir, 'VERSION');
    const latestVersion = read_nonempty(kitVersionPath);
    if (latestVersion === null) {
        return err(
            createAppError('KitVersionMissing', `the kit source has no VERSION file at ${kitVersionPath}`, {
                path: kitVersionPath,
            })
        );
    }

    const behind = is_behind(currentVersion, latestVersion);
    const changelog = behind ? read_nonempty(join(input.kitSourceDir, 'CHANGELOG.md')) : null;

    return ok({
        level: behind ? 'warning' : 'clean',
        currentVersion,
        latestVersion,
        behind,
        changelog,
    });
}
