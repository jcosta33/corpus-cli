import { describe, it, expect, vi } from 'vitest';

import { print_help } from '../useCases/help.ts';
import { COMMAND_CATALOG } from '../useCases/catalog.ts';

describe('print_help', () => {
    it('lists exactly the dispatchable commands and the contract', () => {
        const out: string[] = [];
        const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
            out.push(String(chunk));
            return true;
        });
        try {
            print_help();
        } finally {
            spy.mockRestore();
        }
        const text = out.join('');
        expect(text).toContain('swarm');
        expect(text).toContain('Usage');
        for (const command of COMMAND_CATALOG) {
            expect(text).toContain(command.name);
        }
        expect(text).toContain('0 clean');
    });
});
