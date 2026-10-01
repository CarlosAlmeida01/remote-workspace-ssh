import * as vscode from 'vscode';
import { Log } from './common/logger';
import { RemoteSSHResolver, REMOTE_SSH_AUTHORITY } from './authResolver';
import { openSSHConfigFile, promptOpenRemoteSSHWindow, openRemoteSSHLocationWindow } from './commands';
import { parseConnectUri } from './common/connectUri';
import SSHDestination from './ssh/sshDestination';
import { HostTreeDataProvider } from './hostTreeView';
import { getRemoteWorkspaceLocationData, RemoteLocationHistory } from './remoteLocationHistory';

export async function activate(context: vscode.ExtensionContext) {
    const logger = new Log('Remote - SSH');
    context.subscriptions.push(logger);

    const remoteSSHResolver = new RemoteSSHResolver(context, logger);
    context.subscriptions.push(vscode.workspace.registerRemoteAuthorityResolver(REMOTE_SSH_AUTHORITY, remoteSSHResolver));
    context.subscriptions.push(remoteSSHResolver);

    context.subscriptions.push(vscode.window.registerUriHandler({
        async handleUri(uri) {
            try {
                if (uri.path !== '/connect') {
                    throw new Error('Link de conexÃ£o nÃ£o reconhecido.');
                }
                const { host, folder } = parseConnectUri(uri.query);
                const choice = await vscode.window.showInformationMessage(
                    `Open ${folder} on SSH host ${host}?`, { modal: true }, 'Connect');
                if (choice === 'Connect') {
                    openRemoteSSHLocationWindow(new SSHDestination(host).toEncodedString(), folder, false);
                }
            } catch (error) {
                await vscode.window.showErrorMessage(error instanceof Error ? error.message : 'Link invÃ¡lido.');
            }
        }
    }));

    const locationHistory = new RemoteLocationHistory(context);
    const locationData = getRemoteWorkspaceLocationData();
    if (locationData) {
        await locationHistory.addLocation(locationData[0], locationData[1]);
    }

    const hostTreeDataProvider = new HostTreeDataProvider(locationHistory);
    context.subscriptions.push(vscode.window.createTreeView('workspaceSSHHosts', { treeDataProvider: hostTreeDataProvider }));
    context.subscriptions.push(hostTreeDataProvider);

    context.subscriptions.push(vscode.commands.registerCommand('workspaceRemoteSSH.openEmptyWindow', () => promptOpenRemoteSSHWindow(false)));
    context.subscriptions.push(vscode.commands.registerCommand('workspaceRemoteSSH.openEmptyWindowInCurrentWindow', () => promptOpenRemoteSSHWindow(true)));
    context.subscriptions.push(vscode.commands.registerCommand('workspaceRemoteSSH.openConfigFile', () => openSSHConfigFile()));
    context.subscriptions.push(vscode.commands.registerCommand('workspaceRemoteSSH.showLog', () => logger.show()));
}

export function deactivate() {
}
