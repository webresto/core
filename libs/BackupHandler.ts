import * as path from 'path';
import * as tar from 'tar';
import { GroupRecord } from '../models/Group';
import { DishRecord } from '../models/Dish';
import { MediaFileRecord } from '../models/MediaFile';
import { fsw } from './wrapper/fs';

interface BackupOptions {
  isDeleted: boolean;
  concepts: string[];
  turncate: boolean
}

const defaultOptions: BackupOptions = {
  isDeleted: false,
  concepts: [],
  turncate: false
};

export class BackupHandler {
  private groups: GroupRecord[] = [];
  private dishes: DishRecord[] = [];
  workDir: string = null;
  tar = tar;
  // Export data and images to a tar file
  async exportToTar(filePath: string, options: Partial<BackupOptions> = {}): Promise<void> {
    try {
      const finalOptions = { ...defaultOptions, ...options };

      // Получаем текущую директорию для создания временной папки
      const currentDir = process.cwd();

      // Создаем временную директорию для экспорта
      const timestamp = Date.now();
      this.workDir = path.join(currentDir, `.tmp/backup-${timestamp}`);

      // Создаем папку, если она не существует
      await fsw.mkdir(this.workDir);

      // Путь для JSON файла
      const jsonFilePath = path.join(this.workDir, 'data.json');

      // Создание JSON данных
      const jsonData = await this.createJSON(finalOptions);
      await fsw.writeFile(jsonFilePath, jsonData);

      // Экспорт изображений в временную директорию
      await this.exportImages(this.dishes, this.workDir);

      // Упаковка всего содержимого в tar файл
      await this.tar.c({
        gzip: true,
        file: filePath,
        cwd: this.workDir
      }, ['.']);

      // Удаление временных файлов
      await fsw.unlink(jsonFilePath);

      console.log('Export completed:', filePath);
    } catch (error) {
      new Error
      console.error('Export error:', error);
    }
  }

  // Import data and images from a tar file
  async importFromTar(filePath: string): Promise<void> {
    try {
      // Get the current directory
      const currentDir = process.cwd();

      // Create a directory for unpacking
      const timestamp = Date.now();
      this.workDir = path.join(currentDir, `.tmp/backup-${timestamp}`);

      // Create a folder if it does not exist
      await fsw.mkdir(this.workDir);

      console.log(`Extracting tar file to: ${this.workDir}`);

      // Unpack the archive into the specified directory
      await this.tar.x({
        file: filePath,
        cwd: this.workDir,
      });

      // Reading JSON data
      const jsonFilePath = path.join(this.workDir, 'data.json');
      const jsonData = await fsw.readFile(jsonFilePath);
      const importedData = JSON.parse(jsonData);

      this.groups = importedData.groups;
      this.dishes = importedData.dishes;

      // Checking and uploading images
      for (const dish of this.dishes) {
        if (dish.images && Array.isArray(dish.images)) {
          let count = 1;
          for (const image of dish.images) {
            const ext = path.extname(image.originalFilePath) || '.webp';
            const imagePath = path.join(this.workDir, `${dish.id}__${count}${ext}`);
            this.checkAndLoadImage(imagePath);
            count++;
          }
        }
      }


      console.log('Import completed:', filePath);
    } catch (error) {
      console.error('Import error:', error);
    }
  }

  // Create JSON data
  private async createJSON(options: BackupOptions): Promise<string> {
    const groups = await Group.find({
      isDeleted: options.isDeleted,
      ...(options.concepts.length && { concepts: { $in: options.concepts } })
    });

    const dishes = await Dish.find({
      isDeleted: options.isDeleted,
      ...(options.concepts.length && { concepts: { $in: options.concepts } })
    });

    this.groups = groups;
    this.dishes = dishes;

    const kernelVersion = process.version;
    return JSON.stringify({ kernelVersion, groups, dishes }, null, 2);
  }

  // Check file existence and load image
  private async checkAndLoadImage(imagePath: string): Promise<void> {
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
    if (await fsw.exists(imagePath)) {
      await this.loadImage(imagePath, dishID, count);
    } else {
      console.warn(`Image not found: ${imagePath}`);
    }
  }


  // Simulate loading an image
  private async loadImage(imagePath: string, dishId: string, sortOrder: number): Promise<void> {
    console.log(`Loading image: ${imagePath}`);

    const model = 'dish'
    const mfAdater = await Adapter.getMediaFileAdapter();
    const mediaFileImage = await mfAdater.toProcess(`file://${imagePath}`, model, "image");

    let init: Record<string, string | number> = {};
    init[`mediafile_${model}`] = mediaFileImage.id;
    init[model] = dishId;
    init["sortOrder"] = sortOrder;
    await SelectedMediaFile.create(init).fetch();
  }

  // Export images to a directory
  private async exportImages(dishes: DishRecord[], exportDir: string): Promise<void> {
    this.workDir = exportDir;
    const imagesDir = path.join(this.workDir);

    for (const dish of dishes) {
      if (dish.images && Array.isArray(dish.images)) {
        let count = 1;
        for (const image of dish.images) {
          if (image.originalFilePath) {
            const ext = path.extname(image.originalFilePath);
            const imageFileName = `${dish.id}_${count}${ext}`;
            const destinationPath = path.join(imagesDir, imageFileName);

            if (await fsw.exists(image.originalFilePath)) {
              await fsw.copyFile(image.originalFilePath, destinationPath);
              console.log(`Image exported: ${imageFileName}`);
            } else {
              console.warn(`Image file not found: ${image.originalFilePath}`);
            }

            count++;
          }
        }
      }
    }
  }

}
