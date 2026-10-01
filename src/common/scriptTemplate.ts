import * as fs from 'fs';
import * as path from 'path';

export function compileTemplate(templateName: string, variables: Record<string, string>, extensionPath: string): string {
    const templatePath = path.join(extensionPath, 'src', 'scripts', templateName);
    let content = fs.readFileSync(templatePath, 'utf8').replace(/\r\n/g, '\n');
    for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`%%${key}%%`, 'g'), () => value);
    }
    return content;
}
