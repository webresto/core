import MediaFileAdapter, { BaseConfig, BaseConfigProperty, ConfigMediaFileAdapter, MediaFileTypes } from "../MediaFileAdapter";
import * as fs  from "fs";
import axios from 'axios';
import { v5 as uuidv5 } from "uuid";
const IM = require("imagemagick");
import * as path  from "path";

export interface MediaFileConfig {
  dish: MediaFileConfigInner;
  group: MediaFileConfigInner;
  adapter: string;
}

interface MediaFileConfigInner {
  format: string;
  background: string; 
  resize: { 
    small: Size
    large: Size
    [x: string]: Size 
  };
}

interface Size {
  width?: number;
  height?: number;
}

interface LoadMediaFilesProcess {
  url: string; 
  type: MediaFileTypes; 
  name: {
    [x: string]: string
  };
  config: MediaFileConfigInner;
}



// images: {
//   adapter: 'imagemagick-local',
//   dish: {
//     format: process.env.IMAGES_DISH_FILE_FORMAT === undefined ? 'png' : process.env.IMAGES_DISH_FILE_FORMAT,
//     path: '/images',
//     resize: {
//       small: {
//         width: process.env.IMAGES_SMALL_SIZE_PX === undefined ? 600 : parseInt(process.env.IMAGES_SMALL_SIZE_PX),
//         height: process.env.IMAGES_SMALL_SIZE_PX === undefined ? 600 : parseInt(process.env.IMAGES_SMALL_SIZE_PX)
//       },
//       large: {
//         width: process.env.IMAGES_LARGE_SIZE_PX === undefined ? 900 : parseInt(process.env.IMAGES_LARGE_SIZE_PX),
//       }
//     }
//   },
//   group: {
//     format: process.env.IMAGES_GROUP_FILE_FORMAT === undefined ? 'png' : process.env.IMAGES_GROUP_FILE_FORMAT,
//     path: '/imagesG',
//   }
// },

export default class LocalMediaFileAdapter extends MediaFileAdapter {
 
  public loadMediaFilesProcessQueue: LoadMediaFilesProcess[] = [];
  constructor(config: BaseConfig) {
    super(config);
    this.loadMediaFiles()
  }

  public getNameByUrl(url: string, ext: string, options?: any, salt: boolean = false ): string {
    let baseName = url;
    if (options) baseName += JSON.stringify(options);
    baseName = uuidv5(baseName, this.UUID_NAMESPACE);
    if(salt) baseName += `-${(new Date()).getTime()}`;
    baseName += ext;
    return baseName;
  }

  public async load(url: string, type: MediaFileTypes, config: BaseConfig): Promise<{ origin: string, small: string, large: string }> {
    const baseConfig: MediaFileConfigInner = {
      format: "webp",
      resize: {
        small: {
          width: 360,
          height: 360
        },
        large: {
          width: 720,
          height: 720
        }
      },
      background: "white"
    } 

    const cfg = {...baseConfig,...config} as unknown as MediaFileConfigInner;

    const mediafileExtesion = url.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim)[0];
    const origin = this.getNameByUrl(url, mediafileExtesion);
    
    const name = {
      origin: origin,
      small: undefined,
      large: undefined
    };

    for (let res in cfg.resize) {
      name[res] = this.getNameByUrl(url, cfg.format, cfg, true);
    }

    this.loadMediaFilesProcessQueue.push({ 
      url: url, 
      type: type, 
      name: name,
      config: cfg
    });

    return name;
  }

  protected async download(loadMediaFilesProcess: LoadMediaFilesProcess): Promise<void> {
    const prefix = path.join(process.cwd(), ".tmp/public", loadMediaFilesProcess.type);
    const fullPathDl = path.join(prefix, loadMediaFilesProcess.name.origin);
  
    const response = await axios.get(loadMediaFilesProcess.url, { responseType: 'stream' });
  
    fs.mkdirSync(prefix, { recursive: true });
  
    const writer = fs.createWriteStream(fullPathDl);
    response.data.pipe(writer);
  
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  private async loadMediaFiles() {
    while (this.loadMediaFilesProcessQueue.length) {
        const loadMediaFilesProcess = this.loadMediaFilesProcessQueue.shift();

        const prefix = await this.download(loadMediaFilesProcess);

        switch (loadMediaFilesProcess.type)
        {
          case "image":
            for (let size in loadMediaFilesProcess.config.resize) {
              if (size === "origin") continue;
    
              const mediafileItem = <Size>loadMediaFilesProcess.config.resize[size];
              if (!mediafileItem.width && !mediafileItem.height) {
                throw "Not valid mediafile config. Must have name (key) and one of width or height";
              }
    
              mediafileItem.width = mediafileItem.width || mediafileItem.height;
              mediafileItem.height = mediafileItem.height || mediafileItem.width;
    
              await resizeMediaFile({
                srcPath: path.normalize(prefix + loadMediaFilesProcess.name.origin),
                dstPath: path.normalize(prefix + loadMediaFilesProcess.name[size]),
                width: mediafileItem.width,
                height: mediafileItem.height,
                customArgs: ["-background", loadMediaFilesProcess.config.background || "white", "-flatten"],
              });
            }
          break;
          default:
          break;
        }
    }
    setTimeout(this.loadMediaFiles.bind(this), 60000);
  }
}

function resizeMediaFile(opts: any) {
  return new Promise((resolve, reject) => {
    IM.resize(opts, function(err, stdout, stderr){
      if (err) {
        reject(err);
      }
      resolve(stdout);
    });
  });
}
