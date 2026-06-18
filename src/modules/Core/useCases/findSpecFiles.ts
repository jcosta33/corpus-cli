// Locate the candidate spec files a change-plan's C010 resolves `SPEC-x#AC-NNN` refs against. Two
// homes, unioned by the command surface:
//   - the workspace `specs/*/spec.md` tree (the normal home of a spec in an adopted workspace);
//   - the change plan's sibling `*/spec.md` files (a spec laid out beside the plan — e.g. the
//     transformation fixture's `../checkout/spec.md`, a sibling of `transformation/`).
// Reads the filesystem; returns plain paths. The resolver (build_spec_ref_resolver) reads + indexes
// them — these only enumerate, so the resolution surface is the same in either context.

import { readdirSync, existsSync, type Dirent } from 'fs';
import { join, dirname } from 'path';

// The `<workspaceDir>/specs/<slug>/spec.md` files (sorted). Mirrors checkWorkspace's spec discovery.
export function find_workspace_spec_files(workspaceDir: string): string[] {
    const specsDir = join(workspaceDir, 'specs');
    if (!existsSync(specsDir)) {
        return [];
    }
    const out: string[] = [];
    for (const entry of readdirSync(specsDir).sort()) {
        const specPath = join(specsDir, entry, 'spec.md');
        if (existsSync(specPath)) {
            out.push(specPath);
        }
    }
    return out;
}

// The `spec.md` files in the change plan's sibling directories — the layout where a spec sits beside
// the plan (the transformation fixture: `transformation/change-plan.md` resolves `SPEC-checkout`
// against `../checkout/spec.md`). Scans the plan's parent dir's siblings, one level only.
export function find_sibling_spec_files(changePlanPath: string): string[] {
    const planDir = dirname(changePlanPath);
    const parentDir = dirname(planDir);
    if (!existsSync(parentDir)) {
        return [];
    }
    // `withFileTypes` reads the dir-entry kind from the single readdir, so a sibling that vanishes
    // between listing and inspection (a parallel temp-dir cleanup) cannot ENOENT a second stat call.
    const entries: Dirent[] = readdirSync(parentDir, { withFileTypes: true });
    const out: string[] = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!entry.isDirectory()) {
            continue;
        }
        const specPath = join(parentDir, entry.name, 'spec.md');
        if (existsSync(specPath)) {
            out.push(specPath);
        }
    }
    return out;
}
