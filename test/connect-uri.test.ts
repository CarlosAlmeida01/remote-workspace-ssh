import { expect, it } from 'vitest';
import { parseConnectUri } from '../src/common/connectUri';

it('opens a configured SSH alias and a Linux folder', () => {
    expect(parseConnectUri('host=my-workspace&folder=%2Fhome%2Fcoder%2Fprojects'))
        .toEqual({ host: 'my-workspace', folder: '/home/coder/projects' });
});
it('uses the default project folder', () => {
    expect(parseConnectUri('host=workspace')).toEqual({ host: 'workspace', folder: '/home/coder/projects' });
});
it.each([
    'host=-option', 'host=host%20--command', 'host=workspace&folder=C%3A%5Cprojects',
    'host=workspace&folder=%2Fhome%0Acommand', 'host=workspace&token=secret',
    'host=workspace&host=another', 'host=workspace&folder=%2Fone&folder=%2Ftwo'
])('rejects ambiguous or invalid connection parameters: %s', query => {
    expect(() => parseConnectUri(query)).toThrow();
});
