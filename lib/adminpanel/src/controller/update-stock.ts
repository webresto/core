export default async function UpdateStockController(req: any, res: any) {
  try {
    const { id, balance } = req.body;

    if (!id || typeof balance !== 'number') {
      return res.status(400).json({ error: 'Invalid id or balance' });
    }

    const updatedDish = await Dish.updateOne({ id }, { balance });

    if (!updatedDish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    return res.json({ success: true, dish: { id: updatedDish.id, balance: updatedDish.balance } });
  } catch (error) {
    sails.log.error('Update stock error', error);
    return res.status(500).json({ error: String(error) });
  }
}