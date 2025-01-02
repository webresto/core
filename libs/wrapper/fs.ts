import * as fs from 'fs';
import * as path from 'path';

export const fsw = {
  async writeFile(filePath: string, data: string): Promise<void> {
    try {
      await fs.promises.writeFile(filePath, data, 'utf-8');
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  },

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  },

  async unlink(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      throw error;
    }
  },

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  },

  async mkdir(dirPath: string): Promise<void> {
    try {
      await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  },

  async copyFile(src: string, dest: string): Promise<void> {
    try {
      await fs.promises.copyFile(src, dest);
    } catch (error) {
      console.error(`Error copying file from ${src} to ${dest}:`, error);
      throw error;
    }
  }
};
