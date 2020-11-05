/**
 *
 */
export default class Image {
  url: string;
  name: {
    origin: string;
  };
  key: string;

  constructor(url: string, name: { origin: string }, key: string ) {
    this.url = url;
    this.name = name;
    this.key = key;
  }
}
