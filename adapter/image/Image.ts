export default class Image {
  url: string;
  name: {
    origin: string;
  };
  key: 'dish' | 'group';

  constructor(url: string, name: { origin: string }, key: 'dish' | 'group') {
    this.url = url;
    this.name = name;
    this.key = key;
  }
}
