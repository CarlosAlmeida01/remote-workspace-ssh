export function parseConnectUri(query: string): { host: string; folder: string } {
    const params = new URLSearchParams(query);
    if ([...params.keys()].some(key => key !== 'host' && key !== 'folder') ||
        params.getAll('host').length !== 1 || params.getAll('folder').length > 1) {
        throw new Error('Use apenas host e folder no link de conexÃ£o.');
    }
    const host = params.get('host') ?? '';
    const folder = params.get('folder') ?? '/home/coder/projects';
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,252}$/.test(host)) {
        throw new Error('Informe um alias vÃ¡lido do arquivo de configuraÃ§Ã£o SSH.');
    }
    if (!folder.startsWith('/') || /[\\\x00-\x1f\x7f]/.test(folder)) {
        throw new Error('The remote folder must be an absolute Linux path.');
    }
    return { host, folder };
}
