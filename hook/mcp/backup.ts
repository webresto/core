declare const mcp: any;

export function registerBackupTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    const path = require('path');
    const fs   = require('fs');
    const BACKUP_DIR = path.join(process.cwd(), '.tmp', 'backups');

    mcp.registerTool({
        name: 'backup-list',
        group: 'backup',
        description: 'Returns a list of available backup files in .tmp/backups/. Includes filename, size and creation date.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            if (!fs.existsSync(BACKUP_DIR)) return [];
            return fs.readdirSync(BACKUP_DIR)
                .map((f: string) => {
                    const stat = fs.statSync(path.join(BACKUP_DIR, f));
                    return { filename: f, path: path.join(BACKUP_DIR, f), sizeBytes: stat.size, createdAt: stat.birthtime.toISOString() };
                })
                .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
        },
    });

    mcp.registerTool({
        name: 'backup-create',
        group: 'backup',
        description:
            'Creates a .tar.gz backup of dishes, groups and their images.\n\n'
            + 'Options:\n'
            + '  concepts  — backup only specific concepts (empty = all)\n'
            + '  isDeleted — include soft-deleted records (default: false)\n\n'
            + 'File is saved to .tmp/backups/backup-<timestamp>.tar.gz\n'
            + 'Returns the file path.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                concepts:  { type: 'array',   description: 'Concept names to include. Empty = all.', example: ['origin'] },
                isDeleted: { type: 'boolean', description: 'Include soft-deleted records.', example: false },
            },
        },
        handler: async ({ concepts = [], isDeleted = false }: { concepts?: string[]; isDeleted?: boolean }) => {
            const { BackupHandler } = require('../../libs/BackupHandler');
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            const filePath = path.join(BACKUP_DIR, `backup-${Date.now()}.tar.gz`);
            const handler = new BackupHandler();
            await handler.exportToTar(filePath, { concepts, isDeleted });
            return { success: true, filePath };
        },
    });

    mcp.registerTool({
        name: 'backup-restore',
        group: 'backup',
        description:
            'Restores dishes, groups and images from a .tar.gz backup file.\n\n'
            + 'WARNING: if truncate:true — all existing dishes and groups for the given concepts are DELETED before restore.\n\n'
            + 'Options:\n'
            + '  filePath — path from backup-list (required)\n'
            + '  concepts — which concepts to restore into (default: ["origin"])\n'
            + '  truncate — delete existing data before import (default: false)',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string',  description: 'Full path to the .tar.gz file from backup-list.', example: '/app/.tmp/backups/backup-1234567890.tar.gz' },
                concepts: { type: 'array',   description: 'Target concepts.', example: ['origin'] },
                truncate: { type: 'boolean', description: 'Delete existing records before import. DESTRUCTIVE.', example: false },
            },
            required: ['filePath'],
        },
        handler: async ({ filePath, concepts = [], truncate = false }: { filePath: string; concepts?: string[]; truncate?: boolean }) => {
            const { BackupHandler } = require('../../libs/BackupHandler');
            const handler = new BackupHandler();
            await handler.importFromTar(filePath, { concepts, turncate: truncate, isDeleted: false });
            return { success: true, filePath };
        },
    });

    mcp.registerTool({
        name: 'backup-settings-export',
        group: 'backup',
        description: 'Exports all Settings to a JSON file in .tmp/backups/settings-<timestamp>.json. Returns the file path and count.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
            const filePath = path.join(BACKUP_DIR, `settings-${Date.now()}.json`);
            const settings = await Settings.find().sort('key ASC');
            fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
            return { success: true, filePath, count: settings.length };
        },
    });

    mcp.registerTool({
        name: 'backup-settings-import',
        group: 'backup',
        description:
            'Imports settings from a JSON file exported by backup-settings-export.\n\n'
            + 'Only updates existing settings — does NOT create new keys.\n'
            + 'Read-only settings are skipped.\n'
            + 'Returns a summary: updated, skipped, errors.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                filePath: { type: 'string', description: 'Path to the settings JSON file from backup-list.', example: '/app/.tmp/backups/settings-1234567890.json' },
            },
            required: ['filePath'],
        },
        handler: async ({ filePath }: { filePath: string }) => {
            const raw = fs.readFileSync(filePath, 'utf8');
            const imported: any[] = JSON.parse(raw);
            let updated = 0, skipped = 0;
            const errors: { key: string; error: string }[] = [];
            for (const item of imported) {
                try {
                    const existing = await Settings.findOne({ key: item.key });
                    if (!existing || existing.readOnly) { skipped++; continue; }
                    await Settings.set(item.key, { key: item.key, value: item.value });
                    updated++;
                } catch (e) {
                    errors.push({ key: item.key, error: String(e) });
                }
            }
            return { success: true, updated, skipped, errors };
        },
    });
}
