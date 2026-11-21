import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, expect, test, vi } from 'vitest';
import { apiRequest } from '../config/api';
import { validateHumanText } from './textFieldValidation';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });

test('web, mobile and API use identical request validation and geographic reference copies', () => {
  const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8').replace(/\r\n/g, '\n');
  const source = read('../backend/src/domain/textFieldValidation.js');
  for (const file of ['src/domain/textFieldValidation.js', '../bork5/caact-mobile/utils/textFieldValidation.js']) expect(read(file).replace(/^export(?= \{)/m, 'module.exports =')).toBe(source);
  expect(read('src/domain/branches/serviceAreaNames.json')).toBe(read('../backend/src/domain/serviceAreaNames.json'));
  const branches = read('src/domain/branches/branchInputValidation.js')
    .replace(/^import \{ validateHumanText \} from .+;$/m, '<shared-text-import>')
    .replace(/^import serviceAreaReference from .+;$/m, '<shared-location-import>')
    .replace(/^export(?= \{)/m, 'module.exports =');
  const serverBranches = read('../backend/src/domain/branchInputValidation.js')
    .replace(/^const \{ validateHumanText \} = require\(.+\);$/m, '<shared-text-import>')
    .replace(/^const serviceAreaReference = require\(.+\);$/m, '<shared-location-import>');
  expect(branches).toBe(serverBranches);
});

test('web rejects invalid text locally before network requests or mutation cache invalidation', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Must not send invalid text'); });
  for (const [route, body] of [
    ['/branches', { name: 'MOA', coverageAreas: 'ssd sd' }],
    ['/tasks/123', { payload: { findings: 'Ehjdhdhshsh', notes: 'jhjhjh' } }],
    ['/parts-requests', { partName: 'PCB', reason: 'Lorem ipsum dolor sit amet' }],
    ['/users/profile', { name_first: 'jhjhjh' }],
    ['/products', { name: 'Samsung Inverter', features: ['jhjhjh'] }],
  ]) await expect(apiRequest(route, { method: 'POST', body: JSON.stringify(body) })).rejects.toMatchObject({ status: 400, code: 'INPUT_VALIDATION', fieldErrors: expect.any(Object) });
  expect(fetch).not.toHaveBeenCalled();
  expect(validateHumanText('May tagas po sa drain line.')).toBe('');
});
