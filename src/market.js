export class MarketSystem {
  constructor(engine) {
    this.engine = engine;
    this.prices = {};
    this.generatePrices();
  }

  // 稳定噪声：同一件物品在每次读档后价格一致，不再每次刷新都重新摇 ±15%。
  _stableNoise(key) {
    let h = 2166136261;
    const s = String(key);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (((h >>> 0) % 161) / 1000) - 0.08; // -0.08 ~ +0.08
  }

  generatePrices() {
    const content = this.engine.content;
    const tables = ['weapons', 'ammo', 'melee', 'nade', 'attach', 'helmetShell', 'helmetVisor', 'helmetEar', 'vestFiber', 'vestPlate', 'backpack', 'chestRig', 'valuables', 'medical'];
    // 稀有度既代表工艺成本，也代表流通量：越稀有越贵，但仍有稳定的小幅浮动。
    const rarityMul = { L0: 0.88, L1: 0.94, L2: 1.0, L3: 1.08, L4: 1.22, L5: 1.4, INC: 2.2 };
    for (const t of tables) {
      for (const item of content.all(t)) {
        if (!item.value) continue;
        // Moments 专属武器与 Assee 核心不进入市场，只能从战场获取
        if (item.momentOnly || item.asc) continue;
        const rm = rarityMul[item.rarity] || 1;
        const noise = this._stableNoise(`${t}:${item.id}`);
        this.prices[`${t}:${item.id}`] = Math.round(item.value * rm * (1 + noise));
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
