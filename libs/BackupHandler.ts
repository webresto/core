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
      // Получаем текущую директорию
      const currentDir = process.cwd();
  
      // Создаем директорию для распаковки
      const timestamp = Date.now();
      this.workDir = path.join(currentDir, `.tmp/backup-${timestamp}`);
      
      // Создаем папку, если она не существует
      await fsw.mkdir(this.workDir);
  
      console.log(`Extracting tar file to: ${this.workDir}`);
  
      // Распаковываем архив в указанную директорию
      await this.tar.x({
        file: filePath,
        cwd: this.workDir,
      });
  
      // Читаем данные JSON
      const jsonFilePath = path.join(this.workDir, 'data.json');
      const jsonData = await fsw.readFile(jsonFilePath);
      const importedData = JSON.parse(jsonData);
  
      this.groups = importedData.groups;
      this.dishes = importedData.dishes;
  
      // Проверяем и загружаем изображения
      for (const dish of this.dishes) {
        if (dish.images && Array.isArray(dish.images)) {
          let count = 1;
          for (const image of dish.images) {
            const ext = path.extname(image.originalFilePath) || '.webp';
            const imagePath = path.join(this.workDir, `${dish.id}_${count}${ext}`);
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
    if (await fsw.exists(imagePath)) {
      this.loadImage(imagePath);
    } else {
      console.warn(`Image not found: ${imagePath}`);
    }
  }

  // Simulate loading an image
  private loadImage(imagePath: string): void {
    console.log(`Loading image: ${imagePath}`);
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
