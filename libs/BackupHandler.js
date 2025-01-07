"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupHandler = void 0;
const path = __importStar(require("path"));
const tar = __importStar(require("tar"));
const fs_1 = require("./wrapper/fs");
const backupDefaultOptions = {
    isDeleted: false,
    concepts: [],
    turncate: false
};
const restoreDefaultOptions = {
    isDeleted: false,
    concepts: [],
    turncate: false
};
class BackupHandler {
    constructor() {
        this.groups = [];
        this.dishes = [];
        this.workDir = null;
        this.tar = tar;
    }
    // Export data and images to a tar file
    async exportToTar(filePath, options = {}) {
        try {
            // Объединяем настройки
            const finalOptions = { ...backupDefaultOptions, ...options };
            // Получаем текущую директорию для создания временной папки
            const currentDir = process.cwd();
            this.workDir = path.join(currentDir, `.tmp/backup-${Date.now()}`);
            // Создаем временную директорию
            await fs_1.fsw.mkdir(this.workDir);
            // Путь для JSON файла
            const jsonFilePath = path.join(this.workDir, 'data.json');
            // Создание JSON данных
            const jsonData = await this.createJSON(finalOptions);
            await fs_1.fsw.writeFile(jsonFilePath, jsonData);
            // Экспорт изображений в временную директорию
            await this.exportImages(this.dishes, this.workDir);
            // Удаляем tar файл, если он существует
            if (await fs_1.fsw.exists(filePath)) {
                await fs_1.fsw.unlink(filePath);
            }
            // Упаковка всего содержимого в tar файл
            await this.tar.c({
                gzip: true,
                file: filePath,
                cwd: this.workDir
            }, ['.']);
            // Очистка временных файлов
            await fs_1.fsw.unlink(this.workDir);
            console.log(`Export process completed successfully: ${filePath}`);
        }
        catch (error) {
            console.error('Export error:', error);
        }
    }
    // Import data and images from a tar file
    async importFromTar(filePath, options = {}) {
        try {
            // Log the start of the import process
            console.log('Starting import process...');
            options = { ...restoreDefaultOptions, ...options };
            // Get the current directory
            const currentDir = process.cwd();
            console.log(`Current directory: ${currentDir}`);
            // Create a directory for unpacking
            const timestamp = Date.now();
            this.workDir = path.join(currentDir, `.tmp/backup-${timestamp}`);
            console.log(`Temporary work directory: ${this.workDir}`);
            // Create a folder if it does not exist
            await fs_1.fsw.mkdir(this.workDir);
            console.log(`Created work directory: ${this.workDir}`);
            console.log(`Extracting tar file to: ${this.workDir}`);
            // Unpack the archive into the specified directory
            await this.tar.x({
                file: filePath,
                cwd: this.workDir,
            });
            console.log(`Tar file extracted: ${filePath}`);
            if (!options.concepts.length)
                options.concepts.push("origin");
            if (options.concepts.length && options.turncate) {
                console.log(`Truncating concepts: ${options.concepts.join(', ')}`);
                for (let concept in options.concepts) {
                    await Dish.destroy({ concept: concept }).fetch();
                    await Group.destroy({ concept: concept }).fetch();
                    console.log(`Destroyed concept: ${concept}`);
                }
            }
            // Reading JSON data
            const jsonFilePath = path.join(this.workDir, 'data.json');
            console.log(`Reading JSON data from: ${jsonFilePath}`);
            const jsonData = await fs_1.fsw.readFile(jsonFilePath);
            const importedData = JSON.parse(jsonData);
            console.log(`JSON data parsed successfully.`);
            this.groups = importedData.groups;
            this.dishes = importedData.dishes;
            // Creating groups from imported data
            console.log(`Creating groups...`);
            for (let groupData of importedData.groups) {
                if (await Group.findOne(groupData.id)) {
                    await Group.destroy(groupData.id).fetch();
                }
                delete groupData.images;
                await Group.create(groupData).fetch();
                console.log(`Created group: ${groupData.name}`);
            }
            // Creating dishes from imported data
            console.log(`Creating dishes...`);
            for (let dishData of importedData.dishes) {
                if (await Dish.findOne(dishData.id)) {
                    await Dish.destroy(dishData.id).fetch();
                }
                delete dishData.images;
                await Dish.create(dishData).fetch();
                console.log(`Created dish: ${dishData.name}`);
            }
            // Checking and uploading images
            console.log('Checking and uploading images...');
            for (const dish of this.dishes) {
                if (dish.images && Array.isArray(dish.images)) {
                    let count = 1;
                    for (const image of dish.images) {
                        const ext = path.extname(image.originalFilePath) || '.webp';
                        const imagePath = path.join(this.workDir, `${dish.id}__${count}${ext}`);
                        console.log(`Checking and loading image: ${imagePath}`);
                        this.checkAndLoadImage(imagePath);
                        count++;
                    }
                }
            }
            console.log('Import completed successfully:', filePath);
        }
        catch (error) {
            console.error('Import error:', error);
        }
    }
    // Create JSON data
    async createJSON(options) {
        const groups = await Group.find({
            isDeleted: options.isDeleted,
            ...(options.concepts.length && { concepts: { $in: options.concepts } })
        });
        const dishes = await Dish.find({
            isDeleted: options.isDeleted,
            ...(options.concepts.length && { concepts: { $in: options.concepts } })
        }).populate('images');
        this.groups = groups;
        this.dishes = dishes;
        const version = process.version;
        return JSON.stringify({ version, groups, dishes }, null, 2);
    }
    // Check file existence and load image
    async checkAndLoadImage(imagePath) {
        // Извлечение имени файла
        const fileName = path.basename(imagePath);
        // Разделение имени файла по разделителю "__"
        const parts = fileName.split('__');
        if (parts.length !== 2) {
            console.warn(`File name format is incorrect: ${fileName}`);
            return;
        }
        const dishID = parts[0]; // Левая часть до "__"
        const countPart = parts[1].split('.'); // Правая часть (порядковый номер и расширение)
        if (countPart.length < 2) {
            console.warn(`File name format is incorrect: ${fileName}`);
            return;
        }
        const count = parseInt(countPart[0], 10); // Извлекаем порядковый номер (число)
        if (isNaN(count)) {
            console.warn(`File name format is incorrect: ${fileName}`);
            return;
        }
        // Проверка существования файла
        if (await fs_1.fsw.exists(imagePath)) {
            await this.loadImage(imagePath, dishID, count);
        }
        else {
            console.warn(`Image not found: ${imagePath}`);
        }
    }
    // Simulate loading an image
    async loadImage(imagePath, dishId, sortOrder) {
        console.log(`Loading image: ${imagePath}`);
        const model = 'dish';
        const mfAdater = await Adapter.getMediaFileAdapter();
        const mediaFileImage = await mfAdater.toProcess(`file://${imagePath}`, model, "image");
        let init = {};
        init[`mediafile_${model}`] = mediaFileImage.id;
        init[model] = dishId;
        init["sortOrder"] = sortOrder;
        if (sortOrder === 0) {
            await SelectedMediaFile.destroy({ "dish": dishId }).fetch();
        }
        await SelectedMediaFile.create(init).fetch();
    }
    // Export images to a directory
    async exportImages(dishes, exportDir) {
        this.workDir = exportDir;
        const imagesDir = path.join(this.workDir);
        console.log(`Export directory set to: ${this.workDir}`);
        for (const dish of dishes) {
            console.log(`Starting export for dish ID: ${dish.id}`);
            if (dish.images && Array.isArray(dish.images)) {
                let count = 1;
                for (const image of dish.images) {
                    let originalFullFilePath = image.originalFilePath.startsWith("/")
                        ? image.originalFilePath
                        : path.join(process.cwd(), image.originalFilePath);
                    if (originalFullFilePath) {
                        const ext = path.extname(originalFullFilePath);
                        const imageFileName = `${dish.id}_${count}${ext}`;
                        const destinationPath = path.join(imagesDir, imageFileName);
                        console.log(`Checking if image exists: ${originalFullFilePath}`);
                        if (await fs_1.fsw.exists(originalFullFilePath)) {
                            console.log(`Image exists, copying to: ${destinationPath}`);
                            await fs_1.fsw.copyFile(originalFullFilePath, destinationPath);
                            console.log(`Image exported: ${imageFileName}`);
                        }
                        else {
                            console.warn(`Image file not found: ${originalFullFilePath}`);
                        }
                        count++;
                    }
                    else {
                        console.warn(`Invalid file path for image: ${image.originalFilePath}`);
                    }
                }
            }
            else {
                console.warn(`No images found for dish ID: ${dish.id}`);
            }
        }
        console.log('Image export process completed.');
    }
}
exports.BackupHandler = BackupHandler;
