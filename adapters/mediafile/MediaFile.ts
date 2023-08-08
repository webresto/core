/**
 *
 */
export default class MediaFile {
  url: string;
  name: {
    origin: string;
  };
  key: string;

  constructor(url: string, name: { origin: string }, key: string) {
    this.url = url;
    // TODO: переименовать нейм по идеи это размеры картинок + оригинал (передается оно в images)
    this.name = name;
    this.key = key;
  }
}
