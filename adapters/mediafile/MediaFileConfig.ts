export default interface MediaFileConfig {
  dish: MediaFileConfigInner;
  group: MediaFileConfigInner;
  adapter: string;
}

interface MediaFileConfigInner {
  path: string;
  format: string;
  imageCount: number;
  resize: any[];
}
