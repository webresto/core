import * as path from "path";
import * as fs from "fs";

/**
 * POST …/core/modifiers/dish-image — multipart/form-data: `dishId` + file field `file`.
 * Uploads a photo for a modifier-option dish straight from the modifiers preview popup.
 *
 * The file goes through the same pipeline as the stock `images` mediamanager field
 * (ProductMediaManager → ImageItem.upload → MediaFileAdapter.toProcess with the `dish`
 * target config), then gets linked to Dish.images via a SelectedMediaFile row — the
 * exact pattern of hook/mcp/media.ts `dish-image-add`. Gated by `catalog-products`.
 */

const ACCEPTED_MIME = new Set(["image/jpeg", "image/png"]);
const MAX_BYTES = 5 * 1024 * 1024;

function getMulterUpload() {
  // multer is an adminizer dependency (hoisted); same engine adminizer's own
  // mediamanager upload endpoints use.
  const multer = require("multer");
  const uploadDir = path.join(process.cwd(), ".tmp", "modifier-image-upload");
  fs.mkdirSync(uploadDir, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
      filename: (_req: any, file: any, cb: any) => {
        const ext = file.mimetype === "image/png" ? ".png" : ".jpg";
        cb(null, `mod-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
      },
    }),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req: any, file: any, cb: any) => cb(null, ACCEPTED_MIME.has(file.mimetype)),
  }).single("file");
}

export default async function UploadModifierDishImageController(req: any, res: any) {
  try {
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    }
    if (
      req.adminizer?.accessRightsHelper &&
      !req.adminizer.accessRightsHelper.hasPermission("catalog-products", req.user)
    ) {
      return res.sendStatus(403);
    }

    const upload = getMulterUpload();
    upload(req, res, async (err: any) => {
      try {
        if (err) {
          const message = err.code === "LIMIT_FILE_SIZE" ? "Image is too large" : String(err.message || err);
          return res.status(400).json({ error: message });
        }
        if (!req.file) {
          return res.status(400).json({ error: "Only JPEG or PNG images are allowed" });
        }

        const dishId = String(req.body?.dishId || "").trim();
        if (!dishId) return res.status(400).json({ error: "dishId is required" });
        const dish = await Dish.findOne({ id: dishId });
        if (!dish) return res.status(404).json({ error: "Dish not found" });

        const mfAdapter = await Adapter.getMediaFileAdapter();
        const mediaFile = await mfAdapter.toProcess(`file://${req.file.path}`, "dish", "image");

        const existing = await SelectedMediaFile.find({ dish: dishId });
        await SelectedMediaFile.create({
          dish: dishId,
          mediafile_dish: mediaFile.id,
          sortOrder: existing.length + 1,
        } as any).fetch();

        return res.json({
          id: mediaFile.id,
          variants: mediaFile.variant ?? mediaFile.images ?? {},
        });
      } catch (error) {
        sails.log.error("Upload modifier dish image error", error);
        return res.status(500).json({ error: String(error) });
      }
    });
  } catch (error) {
    sails.log.error("Upload modifier dish image error", error);
    return res.status(500).json({ error: String(error) });
  }
}
