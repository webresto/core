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

/**
 * The local media file adapter downloads an image by its url and writes the
 * original in the configured format (webp) and its resized variants; the
 * download itself goes once they are written. Asked to
 * wait, it answers only once every file it names is on disk, whole, and throws
 * when the image could not be had — leaving no record behind.
 * The images come from a local server that sends them slowly, in chunks.
 */
describe("Local media file adapter", function () {
  this.timeout(30000);

  let jpeg: Buffer;
  let server: http.Server;
  let base: string;
  const hits: Record<string, number> = {};
  // resolved once Sails runs: the app works from its own directory
  let publicDir: string;

  before(async function () {
    publicDir = path.resolve(".tmp/public");
    jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 40 } } })
      .jpeg({ quality: 80 })
      .toBuffer();
    server = http.createServer((req, res) => {
      const route = new URL(req.url!, "http://x").pathname;
      hits[req.url!] = (hits[req.url!] ?? 0) + 1;
      if (route === "/missing.jpg") {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Length": jpeg.length });
      const chunk = 8192;
      let sent = 0;
      const next = () => {
        if (route === "/cut.jpg" && sent >= jpeg.length / 2) {
          res.socket?.destroy();
          return;
        }
        if (sent >= jpeg.length) {
          res.end();
          return;
        }
        res.write(jpeg.subarray(sent, sent + chunk));
        sent += chunk;
        setTimeout(next, 15);
      };
      next();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async function () {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const unique = (route: string) => `${base}${route}?t=${Date.now()}-${Math.random().toString(36).slice(2)}`;

  async function expectWholeVariants(mediaFile: any) {
    expect(mediaFile.variant).to.have.keys("origin", "small", "large");
    expect(mediaFile.variant.origin).to.match(/\.webp$/);
    for (const key of ["origin", "small", "large"]) {
      const file = path.join(publicDir, mediaFile.variant[key]);
      expect(fs.existsSync(file), `${key} ${file}`).to.equal(true);
      const meta = await sharp(file).metadata();
      expect(meta.format, key).to.equal("webp");
    }
    // the whole picture, not a part of it
    const origin = await sharp(path.join(publicDir, mediaFile.variant.origin)).metadata();
    expect({ width: origin.width, height: origin.height }).to.deep.equal({ width: 800, height: 600 });
  }

  function partFiles(): string[] {
    const dir = path.join(publicDir, "image");
    return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(".part")) : [];
  }

  it("downloads the image whole once when asked for it twice at the same time, and the webp it names exists", async function () {
    const adapter = await Adapter.getMediaFileAdapter();
    const url = unique("/dish.jpg");

    const [first, second] = await Promise.all([
      adapter.toProcess(url, "dish", "image", false, { wait: true }),
      adapter.toProcess(url, "dish", "image", false, { wait: true }),
    ]);

    expect(hits[url.slice(base.length)]).to.equal(1);
    expect(first.id).to.equal(second.id);
    await expectWholeVariants(first);
    const raw = (adapter as any).getOriginalFilePath(url, "image", true, "jpg");
    expect(fs.existsSync(raw), "the download").to.equal(false);
    expect(partFiles()).to.deep.equal([]);
  });

  it("does not take a truncated file left on disk for a downloaded one", async function () {
    const adapter = await Adapter.getMediaFileAdapter();
    const url = unique("/dish.jpg");
    const raw = (adapter as any).getOriginalFilePath(url, "image", true, "jpg");
    fs.mkdirSync(path.dirname(raw), { recursive: true });
    fs.writeFileSync(raw, jpeg.subarray(0, 11909));

    const mediaFile = await adapter.toProcess(url, "dish", "image", false, { wait: true });

    expect(hits[url.slice(base.length)]).to.equal(1);
    await expectWholeVariants(mediaFile);
    expect(fs.existsSync(raw), "the download").to.equal(false);
  });

  it("throws when the connection breaks off, and leaves neither a record nor a file", async function () {
    const adapter = await Adapter.getMediaFileAdapter();
    const url = unique("/cut.jpg");

    let error: unknown;
    try {
      await adapter.toProcess(url, "dish", "image", false, { wait: true });
    } catch (e) {
      error = e;
    }

    expect(error, "toProcess must throw").to.be.instanceOf(Error);
    const raw = (adapter as any).getOriginalFilePath(url, "image", true, "jpg");
    expect(fs.existsSync(raw)).to.equal(false);
    expect(partFiles()).to.deep.equal([]);
    expect(await MediaFile.find({ original: url })).to.have.length(0);
    const id = require("uuid").v5(url, adapter.UUID_NAMESPACE);
    expect(await MediaFile.findOne({ id })).to.equal(undefined);
  });

  it("throws on a url that answers 404, and leaves no record", async function () {
    const adapter = await Adapter.getMediaFileAdapter();
    const url = unique("/missing.jpg");

    let error: unknown;
    try {
      await adapter.toProcess(url, "dish", "image", false, { wait: true });
    } catch (e) {
      error = e;
    }

    expect(error, "toProcess must throw").to.be.instanceOf(Error);
    const id = require("uuid").v5(url, adapter.UUID_NAMESPACE);
    expect(await MediaFile.findOne({ id })).to.equal(undefined);
  });

  it("without waiting answers at once and has the files on disk afterwards (menu sync)", async function () {
    const adapter = await Adapter.getMediaFileAdapter();
    const url = unique("/dish.jpg");

    const mediaFile = await adapter.toProcess(url, "dish", "image");
    expect(mediaFile.variant.origin).to.match(/\.webp$/);

    const deadline = Date.now() + 15000;
    while (!(await adapter.checkFileExist(mediaFile)) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await expectWholeVariants(mediaFile);
  });
});
