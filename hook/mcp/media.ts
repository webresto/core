declare const mcp: any;

export function registerMediaTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    const uploadSingleImageFromMultipart = async (req: any): Promise<string | null> => {
        const path = require('path');
        const fs   = require('fs');
        const uploadDir = path.join(process.cwd(), '.tmp', 'mcp-media-upload');
        fs.mkdirSync(uploadDir, { recursive: true });

        const files = await new Promise<any[]>((resolve, reject) => {
            req.file('image').upload({ dirname: uploadDir }, (err: any, uploaded: any[]) => {
                if (err) return reject(new Error(`Upload failed: ${err.message}`));
                resolve(uploaded || []);
            });
        });

        if (!files.length) return null;
        if (files.length > 1) throw new Error('Send exactly one file in multipart field "image".');
        return `file://${files[0].fd}`;
    };

    const resolveMediaFileId = async (
        input: { mediaFileId?: string; url?: string },
        req: any,
        target: 'dish' | 'group',
    ): Promise<string> => {
        const hasMediaFileId = !!input.mediaFileId;
        const hasUrl = !!input.url;
        const uploadedFileUrl = await uploadSingleImageFromMultipart(req);
        const hasBinary = !!uploadedFileUrl;

        const sourcesCount = [hasMediaFileId, hasUrl, hasBinary].filter(Boolean).length;
        if (sourcesCount === 0) {
            throw new Error('Provide exactly one image source: mediaFileId OR url OR multipart file field "image".');
        }
        if (sourcesCount > 1) {
            throw new Error('Provide only one image source: mediaFileId OR url OR multipart file field "image".');
        }

        if (hasMediaFileId) return input.mediaFileId as string;

        const mfAdapter = await Adapter.getMediaFileAdapter();
        const sourceUrl = hasUrl ? input.url : uploadedFileUrl;

        const mediaFile = await mfAdapter.toProcess(sourceUrl as string, target, 'image');
        return mediaFile.id;
    };

    mcp.registerTool({
        name: 'media-upload',
        group: 'media',
        description:
            'Uploads an image and registers it in the MediaFile catalogue via MediaFileAdapter.\n\n'
            + 'Unlike upload-image, this creates a MediaFile DB record with processed variants (small, large, origin).\n'
            + 'Use this before dish-image-add or group-image-add.\n\n'
            + 'Two input modes:\n'
            + '  1. Multipart file: POST multipart/form-data with field "image"\n'
            + '  2. External URL:   pass { url: "https://..." } as JSON body\n\n'
            + 'Returns { mediaFileId, url, variant }.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                url:    { type: 'string', description: 'External image URL to fetch and process.', example: 'https://example.com/pizza.jpg' },
                target: { type: 'string', description: 'Target model for adapter config: "dish" or "group".', example: 'dish' },
            },
        },
        handler: async ({ url, target = 'dish' }: { url?: string; target?: string }, { req }: any) => {
            const mfAdapter = await Adapter.getMediaFileAdapter();
            let sourceUrl = url;

            if (!sourceUrl) {
                const path = require('path');
                const fs   = require('fs');
                const uploadDir = path.join(process.cwd(), '.tmp', 'mcp-media-upload');
                fs.mkdirSync(uploadDir, { recursive: true });

                sourceUrl = await new Promise<string>((resolve, reject) => {
                    req.file('image').upload({ dirname: uploadDir }, (err: any, files: any[]) => {
                        if (err) return reject(new Error(`Upload failed: ${err.message}`));
                        if (!files || files.length === 0) return reject(new Error('No file received. Send multipart/form-data with field "image".'));
                        resolve(`file://${files[0].fd}`);
                    });
                });
            }

            const mediaFile = await mfAdapter.toProcess(sourceUrl, target, 'image');
            return {
                mediaFileId: mediaFile.id,
                url: mediaFile.original,
                variant: mediaFile.variant ?? mediaFile.images ?? {},
            };
        },
    });

    // --- Dish images ---

    mcp.registerTool({
        name: 'dish-image-add',
        group: 'media',
        description:
            'Links an image to a dish (creates a SelectedMediaFile row).\n\n'
            + 'Input modes:\n'
            + '  1) Existing media file id: pass mediaFileId\n'
            + '  2) External URL: pass { url: "https://..." }\n'
            + '  3) Binary upload: send multipart/form-data with field "image"\n\n'
            + 'sortOrder 0 = primary image (shown first).',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                dishId:      { type: 'string',  description: 'Dish ID.', example: 'dish-abc123' },
                mediaFileId: { type: 'string',  description: 'Existing MediaFile ID. One-of source with `url` or multipart `image`.', example: 'mf-abc123' },
                url:         { type: 'string',  description: 'External image URL. One-of source with `mediaFileId` or multipart `image`.', example: 'https://example.com/pizza.jpg' },
                sortOrder:   { type: 'integer', description: 'Display order. 0 = primary image.', example: 0 },
            },
            required: ['dishId'],
        },
        handler: async ({ dishId, mediaFileId, url, sortOrder = 0 }: { dishId: string; mediaFileId?: string; url?: string; sortOrder?: number }, { req }: any) => {
            if (!await Dish.findOne({ id: dishId }))      throw new Error('Dish not found');
            const resolvedMediaFileId = await resolveMediaFileId({ mediaFileId, url }, req, 'dish');
            if (!await MediaFile.findOne({ id: resolvedMediaFileId })) throw new Error('MediaFile not found');
            return await SelectedMediaFile.create({
                dish: dishId,
                mediafile_dish: resolvedMediaFileId,
                sortOrder,
            }).fetch();
        },
    });

    mcp.registerTool({
        name: 'dish-image-list',
        group: 'media',
        description: 'Returns all images linked to a dish, sorted by sortOrder.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                dishId: { type: 'string', description: 'Dish ID.', example: 'dish-abc123' },
            },
            required: ['dishId'],
        },
        handler: async ({ dishId }: { dishId: string }) => {
            const rows = await SelectedMediaFile.find({ dish: dishId }).sort('sortOrder ASC');
            const result = [];
            for (const row of rows) {
                const mf = await MediaFile.findOne({ id: row.mediafile_dish as string });
                result.push({ sortOrder: row.sortOrder, selectedMediaFileId: row.id, mediaFile: mf ?? null });
            }
            return result;
        },
    });

    mcp.registerTool({
        name: 'dish-image-delete',
        group: 'media',
        description: 'Removes the link between a dish and a MediaFile. Does NOT delete the MediaFile from the catalogue.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                selectedMediaFileId: { type: 'integer', description: 'SelectedMediaFile row ID from dish-image-list.', example: 42 },
            },
            required: ['selectedMediaFileId'],
        },
        handler: async ({ selectedMediaFileId }: { selectedMediaFileId: number }) => {
            const deleted = await SelectedMediaFile.destroyOne({ id: selectedMediaFileId } as any);
            if (!deleted) throw new Error('Link not found');
            return { success: true };
        },
    });

    // --- Group images ---

    mcp.registerTool({
        name: 'group-image-add',
        group: 'media',
        description:
            'Links an image to a menu category (creates a SelectedMediaFile row).\n\n'
            + 'Input modes:\n'
            + '  1) Existing media file id: pass mediaFileId\n'
            + '  2) External URL: pass { url: "https://..." }\n'
            + '  3) Binary upload: send multipart/form-data with field "image"\n\n'
            + 'sortOrder 0 = primary image.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                groupId:     { type: 'string',  description: 'Group ID.', example: 'group-abc123' },
                mediaFileId: { type: 'string',  description: 'Existing MediaFile ID. One-of source with `url` or multipart `image`.', example: 'mf-abc123' },
                url:         { type: 'string',  description: 'External image URL. One-of source with `mediaFileId` or multipart `image`.', example: 'https://example.com/group.jpg' },
                sortOrder:   { type: 'integer', description: 'Display order. 0 = primary image.', example: 0 },
            },
            required: ['groupId'],
        },
        handler: async ({ groupId, mediaFileId, url, sortOrder = 0 }: { groupId: string; mediaFileId?: string; url?: string; sortOrder?: number }, { req }: any) => {
            if (!await Group.findOne({ id: groupId }))         throw new Error('Group not found');
            const resolvedMediaFileId = await resolveMediaFileId({ mediaFileId, url }, req, 'group');
            if (!await MediaFile.findOne({ id: resolvedMediaFileId })) throw new Error('MediaFile not found');
            return await SelectedMediaFile.create({
                group: groupId,
                mediafile_group: resolvedMediaFileId,
                sortOrder,
            }).fetch();
        },
    });

    mcp.registerTool({
        name: 'group-image-list',
        group: 'media',
        description: 'Returns all images linked to a menu category, sorted by sortOrder.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                groupId: { type: 'string', description: 'Group ID.', example: 'group-abc123' },
            },
            required: ['groupId'],
        },
        handler: async ({ groupId }: { groupId: string }) => {
            const rows = await SelectedMediaFile.find({ group: groupId }).sort('sortOrder ASC');
            const result = [];
            for (const row of rows) {
                const mf = await MediaFile.findOne({ id: row.mediafile_group as string });
                result.push({ sortOrder: row.sortOrder, selectedMediaFileId: row.id, mediaFile: mf ?? null });
            }
            return result;
        },
    });

    mcp.registerTool({
        name: 'group-image-delete',
        group: 'media',
        description: 'Removes the link between a menu category and a MediaFile. Does NOT delete the MediaFile from the catalogue.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                selectedMediaFileId: { type: 'integer', description: 'SelectedMediaFile row ID from group-image-list.', example: 42 },
            },
            required: ['selectedMediaFileId'],
        },
        handler: async ({ selectedMediaFileId }: { selectedMediaFileId: number }) => {
            const deleted = await SelectedMediaFile.destroyOne({ id: selectedMediaFileId } as any);
            if (!deleted) throw new Error('Link not found');
            return { success: true };
        },
    });
}
