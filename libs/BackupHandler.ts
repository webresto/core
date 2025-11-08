import * as path from 'path';
import * as tar from 'tar';
import { GroupRecord } from '../models/Group';
import { DishRecord } from '../models/Dish';
import { MediaFileRecord } from '../models/MediaFile';
import { fsw } from './wrapper/fs';

interface BaseOptions {
  isDeleted: boolean;
  concepts: string[];
}

interface RestoreOptions extends BaseOptions {
  turncate: false
}

interface BackupOptions extends BaseOptions {
  turncate: false
}

const backupDefaultOptions: BackupOptions = {
  isDeleted: false,
  concepts: [],
  turncate: false
};

const restoreDefaultOptions: RestoreOptions = {
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
      const finalOptions = { ...backupDefaultOptions, ...options };
  
      const currentDir = process.cwd();
      this.workDir = path.join(currentDir, `.tmp/backup-${Date.now()}`);
  
      await fsw.mkdir(this.workDir);
  
      const jsonFilePath = path.join(this.workDir, 'data.json');
  
      const jsonData = await this.createJSON(finalOptions);
      await fsw.writeFile(jsonFilePath, jsonData);
  
      await this.exportImages(this.dishes, this.workDir);

      const dirPath = path.dirname(filePath);
      try {
        await fsw.mkdir(dirPath);
      } catch (err) {
        throw new Error(`Failed to create folder: ${dirPath}. Error: ${err.message}`);
      }

      if (await fsw.exists(filePath)) {
        await fsw.unlink(filePath);
      }

      await this.tar.c({
        gzip: true,
        file: filePath,
        cwd: this.workDir
      }, ['.']);
  
      await fsw.unlink(this.workDir);
  
      console.log(`Export process completed successfully: ${filePath}`);
    } catch (error) {
      sails.log.error('Export error:', error);
    }
  }
  

  // Import data and images from a tar file
  async importFromTar(filePath: string, options: Partial<RestoreOptions> = {}): Promise<void> {
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
      await fsw.mkdir(this.workDir);
      console.log(`Created work directory: ${this.workDir}`);
  
      console.log(`Extracting tar file to: ${this.workDir}`);
  
      // Unpack the archive into the specified directory
      await this.tar.x({
        file: filePath,
        cwd: this.workDir,
      });
      console.log(`Tar file extracted: ${filePath}`);
  
      if (!options.concepts.length) options.concepts.push("origin");
      if (options.concepts.length && options.turncate) {
        console.log(`Truncating concepts: ${options.concepts.join(', ')}`);
        for (let concept of options.concepts) {
          await Dish.destroy({ concept: concept }).fetch();
          await Group.destroy({ concept: concept }).fetch();
          console.log(`Destroyed concept: ${concept}`);
        }
      }
  
      // Reading JSON data
      const jsonFilePath = path.join(this.workDir, 'data.json');
      console.log(`Reading JSON data from: ${jsonFilePath}`);
  
      const jsonData = await fsw.readFile(jsonFilePath);
      const importedData = JSON.parse(jsonData);
      console.log(`JSON data parsed successfully.`);
  
      this.groups = importedData.groups;
      this.dishes = JSON.parse(jsonData).dishes;
  
      // Creating groups from imported data
      console.log(`Creating groups...`);
      for (let groupData of importedData.groups) {
        if(await Group.findOne(groupData.id)) {
          await Group.destroy(groupData.id).fetch()
        }
        delete groupData.images
        await Group.create(groupData).fetch();
        console.log(`Created group: ${groupData.name}`);
      }
  
      // Creating dishes from imported data
      console.log(`Creating dishes...`);
      for (let dishData of importedData.dishes) {
        if(await Dish.findOne(dishData.id)) {
          await Dish.destroy(dishData.id).fetch()
        }
        delete dishData.images
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
    } catch (error) {
      sails.log.error('Import error:', error);
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
    }).populate('images');

    this.groups = groups;
    this.dishes = dishes;

    const version = process.version;
    return JSON.stringify({ version, groups, dishes }, null, 2);
  }

  // Check file existence and load image
  private async checkAndLoadImage(imagePath: string): Promise<void> {
    // Extracting the file name
    const fileName = path.basename(imagePath);

    // Splitting the file name by the "__" separator
    const parts = fileName.split('__');
    if (parts.length !== 2) {
      console.warn(`File name format is incorrect: ${fileName}`);
      return;
    }

    const dishID = parts[0]; // Left part before "__"
    const countPart = parts[1].split('.'); // Right part (serial number and extension)

    if (countPart.length < 2) {
      console.warn(`File name format is incorrect: ${fileName}`);
      return;
    }

    const count = parseInt(countPart[0], 10); // Extract the serial number (number)
    if (isNaN(count)) {
      console.warn(`File name format is incorrect: ${fileName}`);
      return;
    }

    // Checking file existence
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
    
    if(sortOrder === 0) {
      await SelectedMediaFile.destroy({"dish": dishId}).fetch();  
    }
    await SelectedMediaFile.create(init).fetch();
  }

  // Export images to a directory
  private async exportImages(dishes: DishRecord[], exportDir: string): Promise<void> {
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
            const imageFileName = `${dish.id}__${count}${ext}`;
            const destinationPath = path.join(imagesDir, imageFileName);
  
            console.log(`Checking if image exists: ${originalFullFilePath}`);
            if (await fsw.exists(originalFullFilePath)) {
              console.log(`Image exists, copying to: ${destinationPath}`);
              await fsw.copyFile(originalFullFilePath, destinationPath);
              console.log(`Image exported: ${imageFileName}`);
            } else {
              console.warn(`Image file not found: ${originalFullFilePath}`);
            }
  
            count++;
          } else {
            console.warn(`Invalid file path for image: ${image.originalFilePath}`);
          }
        }
      } else {
        console.warn(`No images found for dish ID: ${dish.id}`);
      }
    }
    console.log('Image export process completed.');
  }
  

}
