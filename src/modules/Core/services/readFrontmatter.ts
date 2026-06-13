// Read the scalar key: value pairs from a markdown file's leading `---` frontmatter block. Pure.
// The reconcile engine needs a handful of packet fields (a task's `source`/`status`, a review's
// `task`/`status`) — a light line-scanner, not a YAML parser (block lists and nesting are ignored).

export function read_frontmatter(source: string): Record<string, string> {
    const lines = source.split('\n');
    if (lines[0] !== '---') {
        return {};
    }
    const out: Record<string, string> = {};
    for (let index = 1; index < lines.length; index += 1) {
        if (lines[index] === '---') {
            break;
        }
        const match = /^(\w[\w-]*):\s*(.*)$/.exec(lines[index]);
        if (match !== null && match[2].trim().length > 0) {
            out[match[1]] = match[2].trim();
        }
    }
    return out;
}
