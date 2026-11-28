/* ============================================================
   LaiAsaka Engine · 分模式设置持久化
   ------------------------------------------------------------
   主模式（Asaka）与 Straight 是两套独立的体验：
     · 进入哪个大厅/战局，就载入哪个模式的设置快照；
     · 修改立即写入 localStorage，不依赖“保存”按钮；
     · 语言是全局项，不随模式切换。
   设置快照只保存用户选择后的结果，不保存“默认值应该如何”。
   ============================================================ */

const STORAGE_KEY = 'LaiAsaka_ModeSettings_v1';

function emptyData(){
  return {
    version: 1,
    active: 'asaka',
    // 每个模式：{ profileId, values: { ...扁平化设置 }, platform, updatedAt }
    asaka: null,
    straight: null,
  };
}

export class ModeSettings {
  constructor(){
    this.key = STORAGE_KEY;
    this.data = this._read();
  }

  _read(){
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw);
      return Object.assign(emptyData(), parsed && typeof parsed === 'object' ? parsed : {});
    } catch (e) {
      console.warn('[ModeSettings] 读取失败，使用空表', e);
      return emptyData();
    }
  }

  save(){
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.warn('[ModeSettings] 写入失败', e);
      return false;
    }
  }

  get(mode){
    return this.data[mode] || null;
  }

  // 从当前运行时 ProfileSystem 抓一份快照，供切出模式时保存
  capture(engine, mode, platform){
    if (!engine || !engine.profile) return;
    const values = Object.assign({}, engine.profile.current || {});
    this.data[mode] = {
      profileId: engine.profile.currentProfileId || null,
      values,
      platform: platform || 'auto',
      updatedAt: Date.now(),
    };
    this.data.active = mode;
    this.save();
  }

  // 把快照灌回 ProfileSystem；返回是否成功应用
  apply(engine, mode){
    const snap = this.get(mode);
    if (!snap || !engine || !engine.profile) return false;
    try {
      if (snap.profileId && engine.profile.has(snap.profileId)) {
        engine.profile.setProfile(snap.profileId);
      }
      if (snap.values && typeof snap.values === 'object') {
        for (const [k, v] of Object.entries(snap.values)) engine.profile.set(k, v);
      }
      this.data.active = mode;
      this.save();
      return true;
    } catch (e) {
      console.warn('[ModeSettings] 应用失败', e);
      return false;
    }
  }

  clear(mode){
    if (mode in this.data) this.data[mode] = null;
    this.save();
  }
}
