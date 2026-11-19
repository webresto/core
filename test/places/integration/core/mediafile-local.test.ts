import { expect } from "chai";
import * as fs from "fs";
import * as http from "http";
import * as path from "path";
import { AddressInfo } from "net";
//@ts-ignore
import sharp from "sharp";

/**
 * The default media file adapter with a picture downloaded by its address (an
 * RMS sync, an admin pasting a link): it keeps the webp it made — small, large
 * and the whole picture as `origin` — and not the download. With all three in
 * place the same address is done: asking for it again downloads nothing.
 *
 * Only the site the picture comes from is not real: a local server that counts
 * its requests.
 */
describe("Media files: a picture by its address", function () {
  this.timeout(30000);
  let server: http.Server;
  let base: string;
  let picture: Buffer;
  const requests: string[] = [];
  const made: string[] = [];

  const onDisk = (variantPath: string) => path.resolve(".tmp/public", `.${variantPath}`);
  /** the processing queue works in the background: wait for its files */
  const waitFor = async (paths: string[]) => {
    for (let i = 0; i < 200 && !paths.every((p) => fs.existsSync(p)); i++) await new Promise((resolve) => setTimeout(resolve, 100));
    // a moment for the last step of the queue - the download is removed after the files are written
    await new Promise((resolve) => setTimeout(resolve, 300));
  };
  const processed = async (url: string) => {
    const adapter = await Adapter.getMediaFileAdapter();
    const record = await adapter.toProcess(url, "dish", "image");
    const variant = record.variant as Record<"origin" | "small" | "large", string>;
    const files = (["origin", "small", "large"] as const).map((size) => onDisk(variant[size]));
    made.push(...files);
    await waitFor(files);
    return { adapter, variant, files };
  };

  before(async function () {
    picture = await sharp({ create: { width: 1200, height: 800, channels: 3, background: { r: 200, g: 80, b: 40 } } }).jpeg().toBuffer();
    server = http.createServer((req, res) => {
      requests.push(req.url ?? "");
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(picture);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async function () {
    await new Promise((resolve) => server.close(resolve));
    for (const file of made) if (fs.existsSync(file)) fs.unlinkSync(file);
  });

  it("keeps the small, large and whole picture as webp and removes the download", async function () {
    const url = `${base}/photo-1.jpg?run=${Date.now()}`;
    const { adapter, variant, files } = await processed(url);

    for (const file of files) expect(fs.existsSync(file), file).to.equal(true);
    expect(variant.origin).to.match(/\.webp$/);
    const origin = await sharp(fs.readFileSync(files[0])).metadata();
    expect({ format: origin.format, width: origin.width, height: origin.height }).to.deep.equal({ format: "webp", width: 1200, height: 800 });
    expect((await sharp(fs.readFileSync(files[1])).metadata()).height).to.equal(512);
    expect((await sharp(fs.readFileSync(files[2])).metadata()).height).to.equal(1024);

    const download = (adapter as any).getOriginalFilePath(url, "image", true, "jpg");
    expect(fs.existsSync(download), "the download").to.equal(false);
  });

  it("takes an address it has done from its files: no second download", async function () {
    const url = `${base}/photo-2.jpg?run=${Date.now()}`;
    await processed(url);
    const asked = requests.filter((r) => r.startsWith("/photo-2.jpg")).length;

    const adapter = await Adapter.getMediaFileAdapter();
    await adapter.toProcess(url, "dish", "image");
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(asked).to.equal(1);
    expect(requests.filter((r) => r.startsWith("/photo-2.jpg")).length).to.equal(1);
  });

  it("rewrites a download saved under the origin's own name as webp", async function () {
    // no extension in the address: the download is saved as `<name>.webp` - a jpeg under the name of the origin
    const url = `${base}/photo-3?run=${Date.now()}`;
    const { files } = await processed(url);

    expect((await sharp(fs.readFileSync(files[0])).metadata()).format).to.equal("webp");
  });
});
