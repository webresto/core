import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import { GroupRecord } from '../models/Group';
import { DishRecord } from '../models/Dish';
import { MediaFileRecord } from '../models/MediaFile';

interface BackupOptions {
  isDeleted: boolean;
  concepts: string[];
}

const defaultOptions: BackupOptions = {
  isDeleted: false,
  concepts: []
};

export class BackupHandler {
  private groups: GroupRecord[];
  private dishes: DishRecord[];

  constructor() {
  }

  // Method to export data to a tar file
  async exportToTar(filePath: string, options: Partial<BackupOptions> = {}): Promise<void> {
    try {
      const finalOptions = { ...defaultOptions, ...options };
      const exportDir = path.dirname(filePath);
      const jsonFilePath = path.join(exportDir, 'data.json');

      // Create a JSON file with data
      const jsonData = await this.createJSON(finalOptions);
      fs.writeFileSync(jsonFilePath, jsonData);

      // Export images
      this.exportImages(this.dishes, exportDir);

      // Pack into a tar file
      await tar.c({
        gzip: true,
        file: filePath,
        cwd: exportDir
      }, ['data.json']);

      // Delete temporary files
      fs.unlinkSync(jsonFilePath);
      console.log('Export completed:', filePath);
    } catch (error) {
      console.error('Export error:', error);
    }
  }

  // Method to import data from a tar file
  async importFromTar(filePath: string): Promise<void> {
    try {
      const extractDir = path.dirname(filePath);

      // Extract the tar file
      await tar.x({
        file: filePath,
        cwd: extractDir
      });

      // Read the JSON file
      const jsonFilePath = path.join(extractDir, 'data.json');
      const jsonData = fs.readFileSync(jsonFilePath, 'utf-8');
      const importedData = JSON.parse(jsonData);

      this.groups = importedData.groups;
      this.dishes = importedData.dishes;

      // Check and load images
      for (const dish of this.dishes) {
        if (dish.images && Array.isArray(dish.images)) {
          for (const image of dish.images) {
            const imagePath = path.join(extractDir, image.variant.origin);
            this.checkAndLoadImage(imagePath);
          }
        }
      }

      console.log('Import completed:', filePath);
    } catch (error) {
      console.error('Import error:', error);
    }
  }

  // Internal method: Create JSON from structure
  private async createJSON(options: BackupOptions): Promise<string> {
    const groups = await Group.find({ 
      isDeleted: options.isDeleted, 
      ...options.concepts.length && { concepts: { contains: options.concepts } } 
    });
    const dishes = await Dish.find({ 
      isDeleted: options.isDeleted, 
      ...options.concepts.length && { concepts: { contains: options.concepts } } 
    });


    this.groups = groups;
    this.dishes = dishes;

    const kernelVersion = process.version;

    return JSON.stringify({ kernelVersion, groups, dishes }, null, 2);
  }

  // Internal method: Load image
  private loadImage(imagePath: string): void {
    // Image loading implementation
    console.log(`Loading image: ${imagePath}`);
  }

  // Internal method: Check for file existence and load image
  private checkAndLoadImage(imagePath: string): void {
    if (fs.existsSync(imagePath)) {
      this.loadImage(imagePath);
    } else {
      console.warn(`Image not found: ${imagePath}`);
    }
  }


  // Method for exporting images
  private exportImages(dishes: DishRecord[], exportDir: string): void {
    console.log(`Exporting images to directory: ${exportDir}`);

    // Create the directory for images if it doesn't exist
    const imagesDir = path.join(exportDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir);
    }

    // For each dish in dishes
    dishes.forEach(dish => {
      if (dish.images && Array.isArray(dish.images)) {
        // For each image of the dish
        dish.images.forEach((image: MediaFileRecord) => {
          // Use 'variant' field for image paths
          Object.entries(image.variant).forEach(([variantName, variantPath]) => {
            if (variantPath) {
              const imageFileName = `${variantName}_${image.id}.jpg`; // Construct image name
              const destinationPath = path.join(imagesDir, imageFileName);

              // Check if the file exists
              if (fs.existsSync(variantPath)) {
                try {
                  // Copy the image to the export directory
                  fs.cpSync(variantPath, destinationPath);
                  console.log(`Image exported: ${imageFileName}`);
                } catch (error) {
                  console.error(`Error exporting image ${imageFileName}:`, error);
                }
              } else {
                console.warn(`Image file not found: ${variantPath}`);
              }
            }
          });
        });
      }
    });
  }
}