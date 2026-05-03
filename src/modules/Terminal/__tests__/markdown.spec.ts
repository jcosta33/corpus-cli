import { describe, expect, it } from 'vitest';
import { format_markdown } from '../useCases/markdown.ts';

describe('format_markdown', () => {
    it('formats code blocks', () => {
        const input = '```ts\nconst x = 1;\n```';
        const result = format_markdown(input);
        expect(result).toContain('const x = 1;');
    });

    it('formats headings', () => {
        const input = '# Title\n## Subtitle\n### Section';
        const result = format_markdown(input);
        expect(result).toContain('Title');
        expect(result).toContain('Subtitle');
        expect(result).toContain('Section');
    });

    it('formats bold and italic', () => {
        const input = '**bold** and *italic*';
        const result = format_markdown(input);
        expect(result).toContain('bold');
        expect(result).toContain('italic');
    });

    it('formats links', () => {
        const input = '[link](https://example.com)';
        const result = format_markdown(input);
        expect(result).toContain('link');
        expect(result).toContain('https://example.com');
    });

    it('formats inline code', () => {
        const input = 'use `code` here';
        const result = format_markdown(input);
        expect(result).toContain('code');
    });

    it('formats blockquotes', () => {
        const input = '> quote';
        const result = format_markdown(input);
        expect(result).toContain('quote');
    });

    it('returns empty string for empty input', () => {
        expect(format_markdown('')).toBe('');
    });
});
