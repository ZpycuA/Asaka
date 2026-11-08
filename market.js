export class MarketSystem {
  constructor(engine) {
    this.engine = engine;
    this.prices = {};
    this.generatePrices();
  }

  generatePrices() {
    const content = this.engine.content;
    const tables = ['weapons', 'ammo', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig'];
    
    for (const t of tables) {
      for (const item of content.all(t)) {
        if (!item.value) continue;
        // 价格波动 ±15%
        const mul = 0.85 + Math.random() * 0.3;
        this.prices[`${t}:${item.id}`] = Math.round(item.value * mul);
      }
    }
  }

  getPrice(table, id) {
    return this.prices[`${table}:${id}`] || 0;
  }

  buy(table, id, qty = 1) {
    const price = this.getPrice(table, id) * qty;
    const save = this.engine.save;
    if ((save.data.credits || 0) < price) return { ok: false, reason: '没钱' };
    
    const inv = this.engine.app.inventory;
    const uid = inv.createItem(table, id, { qty, loadedQty: table === 'weapons' ? (this.engine.content.get('weapons', id).mag || 0) : 0 });
    if (!uid) return { ok: false, reason: '生成失败' };
    
    const r = inv.addToContainer('stash', uid);
    if (!r.ok) { inv.destroyItem(uid); return { ok: false, reason: '仓库已满' }; }
    
    save.data.credits -= price;
    save.save();
    return { ok: true };
  }

  sell(uid) {
    const inv = this.engine.app.inventory;
    const item = inv.items.get(uid);
    if (!item) return { ok: false };
    const val = Math.floor(inv.getItemValue(uid) * 0.8);
    inv.destroyItem(uid);
    this.engine.save.data.credits = (this.engine.save.data.credits || 0) + val;
    this.engine.save.save();
    return { ok: true, val };
  }
}
