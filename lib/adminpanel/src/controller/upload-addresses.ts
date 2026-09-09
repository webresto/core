import { importAddresses } from "../../../address-import";
import { ADDRESSES_MANAGE_TOKEN, requireToken } from "./access-rights";

/**
 * The address catalog of one city, out of a JSON file.
 *
 * The city is the one open in the panel, not a field of the file: two answers to
 * the same question is one too many, and the page a file is dropped on is the
 * one the operator was looking at.
 */
export default async function UploadAddressesController(req: any, res: any) {
  try {
    if (!requireToken(req, res, ADDRESSES_MANAGE_TOKEN)) return;

    const content = typeof req.body?.content === "string" ? req.body.content : "";
    if (!content.trim()) return res.status(400).json({ error: "The file is empty" });

    // Every node carries its city, so there is no catalog without one.
    const city = typeof req.body?.city === "string" && req.body.city.trim() ? req.body.city.trim() : null;
    if (!city) return res.status(400).json({ error: "Addresses belong to a city. Create one first." });

    let document: any;
    try {
      document = JSON.parse(content);
    } catch (error) {
      return res.status(400).json({ error: `File is not valid JSON: ${(error as Error).message}` });
    }

    const { created, errors } = await importAddresses({ city, nodes: document?.nodes });
    // Every problem in one message: an operator fixing an export wants the list,
    // and the toast is the only place they will read it.
    if (errors.length) return res.status(400).json({ error: errors.join("; ") });

    return res.json({ created });
  } catch (error) {
    sails.log.error("Upload addresses error", error);
    return res.status(400).json({ error: (error as any)?.message ?? String(error) });
  }
}
