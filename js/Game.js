// Game.js — Skill Test Master: трюковые трассы для машин высоко в небе (как Skill Test в GTA 5). Старт на самой
// высокой точке, трасса уступами идёт вниз: разгон на спусках, прыжки через пропасти, ветряки и препятствия мешают.
// Рядом едут соперники-боты. Падение — возврат на последний чекпоинт. Очки за трассу, трюки и место открывают новые
// трассы; пройденные трассы открывают машины гаража.
//
// Модули игры: GameCar (физика машины) · GameCars (машины и уровни) · GameCarView (вид машины, следы шин) ·
// GameCamera (камера погони и витрины) · GameBots (соперники) · GameTurbines (ветряки) · GameTrack (вид трассы и мира) ·
// GameHud (интерфейс). Трасса — ObbyCourse (детали и маркеры карты Maps.js, правятся в редакторе).
//
// Состояния: 'levels' (выбор трассы) -> 'garage' (выбор машины на подиуме) -> 'intro' (отсчёт на старте) -> 'race'
// -> 'dead' (падение, возврат на чекпоинт) -> 'finish' (результат). Сохранение — один объект Platform.save.

// Детали трассы не строит Location3D: копия карты отдаёт их в map.obbyKit (ДО main.js — поэтому здесь).
ObbyCourse.hookMaps();

const STM_KMH = 0.06;             // px/с -> «км/ч» спидометра (аркадная шкала)
const STM_TAGS_CSS = `
#stm-tags { position: fixed; inset: 0; pointer-events: none; z-index: 15; overflow: hidden; font-family: var(--stm-font, sans-serif); }
#stm-tags .tag { position: absolute; left: 0; top: 0; transform-origin: 50% 100%; white-space: nowrap; color: #f3f5f2; font-size: 16px; font-weight: 700; letter-spacing: .03em;
  padding: 1px 9px 2px; background: rgba(16,18,21,.7); border-left: 3px solid #c5ef5c; will-change: transform; text-transform: uppercase; }
#stm-tags .tag.off { display: none; }
`;

/** @satisfies {Record<string, any>} */
const Game = {
    /** @type {LoryApp | null} */ app: null,
    /** @type {any} */ save: null,
    /** @type {'boot' | 'levels' | 'garage' | 'intro' | 'race' | 'dead' | 'finish'} */ state: 'boot',
    /** @type {any} */ car: null,
    /** @type {CarView | null} */ view: null,
    carId: 'pocket', viewCarId: '', garageIdx: 0, levelId: 'level-1', pickId: 'level-1',
    /** @type {any} */ run: null,
    deadT: 0, countT: 0, podiumYaw: 0, busy: false,
    /** @type {Record<string, any>} */ loops: {},
    /** @type {HTMLElement | null} */ tags: null,

    // -------------------------------------------------------------------------------------------
    // Запуск
    // -------------------------------------------------------------------------------------------

    /** Первая карта — трасса, на которой игрок остановился (Lory 1.40: старт с мира из сохранения). */
    async firstMap() {
        const s = await Platform.load();
        return s && typeof s.level === 'string' ? s.level : 'level-1';
    },

    async init(app) {
        this.app = app;
        this.save = this._normalize((await Platform.load()) || {});
        this.levelId = app.location.map.id;
        this.pickId = this.levelId;
        this.carId = this._carOpen(this.save.car) ? this.save.car : 'pocket';
        this.garageIdx = Math.max(0, GAME_CARS.findIndex(c => c.id === this.carId));
        // камера — только игры: панорама средней кнопкой, орбита и клавиши движка выключены
        app.camera.detach();
        const canvas = document.getElementById('world3d');
        if (canvas) for (const t of ['mousedown', 'auxclick']) canvas.addEventListener(t, (e) => { if (/** @type {MouseEvent} */ (e).button === 1) e.preventDefault(); });
        Input.init({ app, mouse: 'none', camera: false, actions: {
            gas: { keys: ['KeyW', 'ArrowUp'], pad: [7] }, brake: { keys: ['KeyS', 'ArrowDown'], pad: [6] },
            left: { keys: ['KeyA', 'ArrowLeft'], pad: [14] }, right: { keys: ['KeyD', 'ArrowRight'], pad: [15] },
            nitro: { keys: ['ShiftLeft', 'ShiftRight'], pad: [0] }, handbrake: { keys: ['Space'], pad: [2] },
            respawn: { keys: [], pad: [3] }, pause: { keys: ['Escape', 'Tab'], pad: [9] },
        } });
        Input.configure({ controls: false });
        window.addEventListener('keydown', (e) => { if (e.code === 'Tab' && this.state !== 'boot') e.preventDefault(); });
        if (typeof Quality !== 'undefined' && this.save.quality && this.save.quality !== Quality.choice) Quality.set(this.save.quality);
        Cam.init(app);
        Cam.freeArea = () => GameHud.freeArea();
        CarView.registerFx(app);
        const st = document.createElement('style'); st.textContent = STM_TAGS_CSS; document.head.appendChild(st);
        this.tags = document.createElement('div'); this.tags.id = 'stm-tags'; document.body.appendChild(this.tags);
        GameHud.init({
            onLevelPick: (id) => this.pickLevel(id), onLevelGo: () => this.levelGo(), onLevelAd: () => this.levelAd(), onAd: () => this.adPoints(),
            onBack: () => this.toLevels(), onCar: (d) => this.cycleCar(d), onGo: () => this.go(),
            onReset: (fromPause) => { if (fromPause) this.togglePause(); this.respawn(); }, onPause: () => this.togglePause(),
            onRestart: () => { this.togglePause(); this.startRace(); }, onMenu: () => { this.togglePause(); this.abort(); this.toLevels(); },
            onToggle: (k) => this.toggle(k), toggleState: () => this.toggleState(),
            onRecords: () => this.records(), onLogin: () => this.login(),
            onGift: () => this.openGift(), onWheel: () => this.openWheel(), onClaim: (x2) => this.claimGift(x2), onSpin: (kind) => this.spinWheel(kind),
            onPaint: (id) => this.pickPaint(id), onClosed: () => this._menuTimer(),
            onHelpClosed: () => { /* ничего: игра продолжает стоять на паузе, если была */ },
        });
        this._initSound();
        this._initTutorial();
        this._initUiAds();
        this._initRewards();
        GameHud.setRecords(Platform.name === 'yandex');
        window.addEventListener('lory-save-conflict', () => { if (this.state === 'race') this.togglePause(); GameHud.saveConflict(); });
        const adsChanged = () => { this._refreshAd(); if (this.state === 'garage') this.renderGarage(); if (this.state === 'levels') this.renderLevels(); this._menuRefresh(); };
        if (Platform.onRewardedCooldown) Platform.onRewardedCooldown(adsChanged);
        window.addEventListener('lory-rewarded-change', adsChanged);
        await this.prepare(app);
        this.toLevels(true);
    },

    async ready() { Platform.gameplay(false); },

    _normalize(s) {
        const fresh = !s || s.earned == null;
        const o = Object.assign({ points: 0, owned: ['level-1'], done: {}, level: 'level-1', car: 'pocket', cars: ['pocket'], carAds: {}, levelAds: {}, earned: 0, tutorialDone: false, sfx: true, music: true, quality: 'auto',
            paints: [], paint: '', daily: null, wheel: null }, s || {});
        if (!Array.isArray(o.cars)) o.cars = ['pocket'];
        if (!Array.isArray(o.paints)) o.paints = [];
        if (typeof o.paint !== 'string' || (o.paint && !o.paints.includes(o.paint))) o.paint = '';
        if (!o.carAds || typeof o.carAds !== 'object') o.carAds = {};
        if (!o.levelAds || typeof o.levelAds !== 'object') o.levelAds = {};
        if (!Array.isArray(o.owned)) o.owned = ['level-1'];
        if (!o.owned.includes('level-1')) o.owned.unshift('level-1');
        if (!o.done || typeof o.done !== 'object') o.done = {};
        o.points = Math.max(0, Number(o.points) || 0);
        // рекорд: очков заработано в заездах за всё время (подарки, колесо и реклама в него не входят); в старых сохранениях — текущие очки
        o.earned = fresh ? Math.floor(o.points) : Math.max(0, Math.floor(Number(o.earned) || 0));
        return o;
    },

    persist() { try { Platform.save(this.save); } catch (e) { console.warn('Platform.save:', e); } },

    levelIndex(id) { return Math.max(0, GAME_LEVELS.findIndex(l => l.id === (id || this.levelId))); },
    /** Трассы, у которых есть карта в Maps.js (собранные конструктором art/levels). */
    levels() { return GAME_LEVELS.filter(l => GAME_MAPS.some(m => m.id === l.id)); },
    level(id) { return GAME_LEVELS[this.levelIndex(id)]; },
    doneCount() { return Object.keys(this.save.done).length; },
    /** Машина открыта: бесплатная (ads 0) или досмотрены все её рекламы. */
    _carOpen(id) { const c = GAME_CARS.find(x => x.id === id); return !!c && (!c.ads || this.save.cars.includes(id)); },

    /** Трасса, машина, соперники и мир — под экраном загрузки (повторяемо при смене трассы). */
    async prepare(app) {
        const loc = app.location, view = loc.view;
        ObbyCourse.build(loc.map, {});
        Turbines.build(loc.map);
        await Track.build(app, this.levelIndex(loc.map.id));
        Skids.init(view);
        Skids.clear();
        if (!this.view) { this.view = new CarView(view, 'player'); this.view.paintId = this.save.paint; }
        else this.view.exFx = null;   // системы частиц уходят вместе с прежней картой
        if (this.viewCarId !== this.carId || !this.view.car) { await this.view.setCar(this.carId); this.viewCarId = this.carId; }
        this._makeCar();
        await Bots.build({ view, tags: this.tags, cars: GAME_CARS.map(c => c.id).filter(id => id !== 'bus') });
        Bots.on.finish = (b) => this._botFinish(b);
        Bots.on.knock = (b) => { this._sfx('assets/sounds/metal-hit.ogg', 0.8); Cam.shake(10, 0.2); GameHud.toast(Lang.t('stm.knock', { name: b.name }), 1400); };
        Bots.on.bump = (b, rel, pt) => { if (rel > 300) { this._sfx('assets/sounds/bonk.ogg', Math.min(0.8, rel / 1500)); if (app.fx) app.fx.play('carbump', new BABYLON.Vector3(pt[0], pt[1], pt[2])); } };
        this.levelId = loc.map.id;
        this._toPodium();
    },

    _makeCar() {
        this.car = createCar(carSpec(this.carId));
        Cam.car = this.car;
        const C = this.car;
        C.on.die = (reason) => this._die(reason);
        C.on.land = (v) => {
            if (this.state !== 'race') return;
            if (v > 650) {
                this._sfx('assets/sounds/land.ogg', Math.min(1, v / 2000));
                if (this.app.fx && v > 1000) this.app.fx.play('landdust', new BABYLON.Vector3(C.p[0], C.p[1] + 6, C.p[2]));
                if (v > 1500) Cam.shake(Math.min(12, v / 250), 0.2);
            }
        };
        C.on.bonk = (v) => { this._sfx('assets/sounds/metal-hit.ogg', Math.min(0.9, 0.35 + v / 3000)); Cam.shake(Math.min(14, 4 + v / 300), 0.2); };
        C.on.hit = () => { this._sfx('assets/sounds/hit.ogg', 0.9); Cam.shake(16, 0.3); };
        let padT = 0;
        C.on.pad = (kind) => { const now = performance.now(); if (now - padT < 600) return; padT = now; this._sfx('assets/sounds/boost.ogg', 0.7); void kind; };
    },

    // -------------------------------------------------------------------------------------------
    // Экраны: трассы и гараж
    // -------------------------------------------------------------------------------------------

    toLevels(first) {
        this.state = 'levels';
        Platform.gameplay(false);
        GameHud.hideResults();
        GameHud.show('levels');
        Cam.setMode('menu');
        Cam.zoom = 2.4; Cam.pitch = 0.3;   // за билетами — широкий вид: подиум, трасса и город внизу
        this._toPodium();
        this._music('menu');
        this.renderLevels(true);
        this._refreshAd();
        if (first && !this.save.tutorialDone) { /* обучение начнётся в первом заезде */ }
        // подарок дня — сам, раз в день, в меню и только после обучения (не поверх туториала и заезда)
        if (this.save.tutorialDone && DailyGift.shouldOffer()) { this.openGift(); DailyGift.markOffered(); }
    },

    renderLevels(scroll) {
        const s = this.save;
        const items = this.levels().map((l, i) => ({ id: l.id, n: i + 1, price: l.price, ads: l.ads || 0, seen: s.levelAds[l.id] || 0, diff: l.diff, open: s.owned.includes(l.id), done: !!s.done[l.id],
            place: s.done[l.id] ? s.done[l.id].place : 0, sel: l.id === this.pickId, can: s.points >= l.price }));
        const L = this.level(this.pickId), n = this.levelIndex(this.pickId) + 1, own = s.owned.includes(L.id);
        const info = `<b>${Lang.t('stm.track')} ${n}</b>${Lang.t('stm.diff')}: ${'›'.repeat(L.diff)}`;
        const action = own ? { label: Lang.t('stm.next'), enabled: true }
            : s.points >= L.price ? { label: Lang.t('stm.buy', { n: L.price.toLocaleString('ru-RU').replace(/ /g, ' ') }), enabled: true }
                : { label: Lang.t('stm.need', { n: (L.price - Math.floor(s.points)).toLocaleString('ru-RU').replace(/ /g, ' ') }), enabled: false };
        const wait = Platform.rewardedCooldownLeft ? Platform.rewardedCooldownLeft() : 0;
        const can = Platform.rewardedSupported ? Platform.rewardedSupported() : true;
        const seen = Math.min(L.ads || 0, s.levelAds[L.id] || 0);
        const adAction = { show: !own && !!L.ads && can, enabled: !wait && !this._adBusy,
            label: wait ? Lang.t('stm.adWait', { n: wait }) : Lang.t('stm.trackAds', { n: seen, total: L.ads || 0 }) };
        GameHud.renderLevels({ items, points: s.points, info, action, adAction, scroll });
        GameHud.setBadges({ gift: DailyGift.badge(), wheel: Wheel.badge() });
    },

    pickLevel(id) {
        if (this.state !== 'levels') return;
        if (this.pickId === id && this.save.owned.includes(id)) { this.levelGo(); return; }
        this.pickId = id;
        this.renderLevels();
    },

    /** Кнопка внизу экрана трасс: открыть трассу за очки или перейти в гараж. */
    async levelGo() {
        if (this.state !== 'levels' || this.busy) return;
        const L = this.level(this.pickId);
        if (!this.save.owned.includes(L.id)) {
            if (this.save.points < L.price) return;
            this.save.points -= L.price;
            this.save.owned.push(L.id);
            this.persist();
            this._sfx('assets/sounds/reward.ogg', 0.8);
            GameHud.toast(Lang.t('stm.bought'));
            Platform.analytics('track_unlocked', { track: this.levelIndex(L.id) + 1 });
            this.renderLevels();
            return;
        }
        await this.toGarage();
    },

    /** Просмотр рекламы за трассу (2–8 по цене): на последнем подтверждённом ролике трасса открыта. */
    async levelAd() {
        if (this.state !== 'levels' || this._adBusy) return;
        const L = this.level(this.pickId);
        if (this.save.owned.includes(L.id) || !L.ads) return;
        this._adBusy = true;
        this.renderLevels();
        let ok = false;
        try { ok = await Platform.rewarded('track-unlock'); } catch (e) { ok = false; }
        this._adBusy = false;
        if (ok) {
            const n = Math.min(L.ads, (this.save.levelAds[L.id] || 0) + 1);
            this.save.levelAds[L.id] = n;
            if (n >= L.ads && !this.save.owned.includes(L.id)) {
                this.save.owned.push(L.id);
                this._sfx('assets/sounds/reward.ogg', 0.8);
                GameHud.toast(Lang.t('stm.bought'));
                Platform.analytics('track_unlocked', { track: this.levelIndex(L.id) + 1, ads: L.ads });
            }
            this.persist();
        }
        if (this.state === 'levels') this.renderLevels();
        this._refreshAd();
    },

    async toGarage() {
        if (this.busy) return;
        this.busy = true;
        try {
            if (this.pickId !== this.levelId || this.app.location.map.id !== this.pickId) {
                const n = this.levelIndex(this.pickId) + 1;
                await this.app.loadMap(this.pickId, { prepare: (app) => this.prepare(app), label: Lang.t('stm.loading.level', { n }) });
                this.save.level = this.pickId;
                this.persist();
            }
        } finally { this.busy = false; }
        this.state = 'garage';
        GameHud.hideResults();
        GameHud.show('garage');
        this._toPodium();
        Cam.setMode('garage');
        Cam.showcase();
        this.renderGarage();
    },

    renderGarage() {
        const c = GAME_CARS[this.garageIdx];
        const open = this._carOpen(c.id);
        const lang = Lang.code === 'en' ? 'en' : 'ru';
        const seen = Math.min(c.ads, this.save.carAds[c.id] || 0);
        const wait = Platform.rewardedCooldownLeft ? Platform.rewardedCooldownLeft() : 0;
        const can = Platform.rewardedSupported ? Platform.rewardedSupported() : true;
        const go = open ? { label: Lang.t('stm.go'), enabled: true, ad: false }
            : !can ? { label: Lang.t('stm.adNone'), enabled: false, ad: true }
                : wait > 0 ? { label: Lang.t('stm.adWait', { n: wait }), enabled: false, ad: true }
                    : { label: Lang.t('stm.watch', { n: seen, total: c.ads }), enabled: !this._adBusy, ad: true };
        const hex = (n) => '#' + n.toString(16).padStart(6, '0');
        const paints = [{ id: '', color: hex(c.color), name: Lang.t('stm.paintFactory'), owned: true, sel: !this.save.paint }]
            .concat(CAR_PAINTS.map(p => ({ id: p.id, color: hex(p.color), name: p.name[lang], owned: this.save.paints.includes(p.id), sel: this.save.paint === p.id })));
        GameHud.renderGarage({ name: c.name[lang], cls: `${this.garageIdx + 1} / ${GAME_CARS.length}`, bars: carBars(c.id), open,
            lockText: Lang.t('stm.carAds', { n: seen, total: c.ads }), adProgress: c.ads ? seen / c.ads : 1, index: this.garageIdx, total: GAME_CARS.length, go, paints });
    },

    async cycleCar(d) {
        if (this.state !== 'garage') return;
        this.garageIdx = (this.garageIdx + d + GAME_CARS.length) % GAME_CARS.length;
        const id = GAME_CARS[this.garageIdx].id;
        this.renderGarage();
        this._sfx('assets/sounds/click.ogg', 0.4);
        await this._setCar(id);
    },

    async _setCar(id) {
        if (this.carId === id && this.viewCarId === id) return;
        this.carId = id;
        const want = id;
        await this.view.setCar(id);
        if (this.carId !== want) return;
        this.viewCarId = id;
        this._makeCar();
        this._toPodium();
    },

    /** Машина на подиуме гаража (стоит, подиум медленно крутится). */
    _toPodium() {
        if (!this.car) return;
        const s = Track.podiumSpot();
        this.car.reset(s.x, s.y, s.z, s.yaw + this.podiumYaw);
        this.car.frozen = true;
        if (this.view) this.view.pose(this.car, 0);
    },

    async go() {
        if (this.state !== 'garage') return;
        const c = GAME_CARS[this.garageIdx];
        if (!this._carOpen(c.id)) { await this.watchCarAd(c); return; }
        await this._setCar(c.id);
        this.save.car = c.id;
        this.persist();
        this.startRace();
    },

    /** Просмотр рекламы за машину: засчитывается только подтверждённый ролик; на последнем — машина открыта. */
    async watchCarAd(c) {
        if (this._adBusy) return;
        this._adBusy = true;
        this.renderGarage();
        let ok = false;
        try { ok = await Platform.rewarded('car-unlock'); } catch (e) { ok = false; }
        this._adBusy = false;
        if (ok) {
            const n = Math.min(c.ads, (this.save.carAds[c.id] || 0) + 1);
            this.save.carAds[c.id] = n;
            if (n >= c.ads && !this.save.cars.includes(c.id)) {
                this.save.cars.push(c.id);
                this._sfx('assets/sounds/reward.ogg', 0.9);
                GameHud.toast(Lang.t('stm.carOpen', { name: c.name[Lang.code === 'en' ? 'en' : 'ru'] }), 2200);
                Platform.analytics('car_unlocked', { car: c.id, ads: c.ads });
            }
            this.persist();
        }
        if (this.state === 'garage') this.renderGarage();
        this._refreshAd();
    },

    // -------------------------------------------------------------------------------------------
    // Заезд
    // -------------------------------------------------------------------------------------------

    startRace() {
        const C = this.car;
        GameHud.hideResults();
        if (Pause.has('manual')) { Pause.set('manual', false); GameHud.pause(false); }
        ObbyCourse.reset();
        Track.setStage(0);
        Skids.clear();
        const s = ObbyCourse.respawn(0);
        C.frozen = false;
        C.reset(s.x, s.y - 20, s.z, s.yaw);
        Bots.toGrid();
        this.run = { stage: 0, prog: 0, stunt: 0, air: 0, airPaid: 0, pitch: 0, roll: 0, yawA: 0, wasAir: false, drift: 0, driftPts: 0, driftOff: 0,
            finished: 0, t: 0, falls: 0 };
        this.state = 'intro';
        this.countT = 3.2;
        this._lastCount = 4;
        GameHud.show('race');
        GameHud.setRunPoints(0);
        Cam.setMode('chase');
        Cam.behind();
        this._music('race');
        Input.releaseAll();
        Platform.gameplay(true);
        if (typeof Telemetry !== 'undefined') Telemetry.progress('started', this.levelId, { step_index: this.levelIndex() + 1, car: this.carId });
    },

    _startGo() {
        this.state = 'race';
        Bots.start();
        GameHud.count('go');
        setTimeout(() => { if (this.state === 'race' || this.state === 'dead') GameHud.count(null); }, 900);
        this._beep(true);
        if (!this.save.tutorialDone && !Tutorial.active) Tutorial.autoStart();
    },

    /** Кнопка ⟲ / клавиша R: на последний чекпоинт. */
    respawn() {
        if (this.state !== 'race' && this.state !== 'dead') return;
        this._respawnNow();
    },

    _respawnNow() {
        const C = this.car, s = ObbyCourse.respawn(this.run.stage);
        C.reset(s.x, s.y - 20, s.z, s.yaw);
        this.state = 'race';
        this.view.setVisible(true);
        this.run.wasAir = false; this.run.air = 0; this.run.pitch = 0; this.run.roll = 0; this.run.yawA = 0; this.run.drift = 0;
        Cam.behind();
    },

    _die(reason) {
        if (this.state !== 'race') return;
        this.state = 'dead';
        this.run.falls++;
        this.deadT = reason === 'fall' ? 1.1 : 1.6;
        GameHud.toast(Lang.t(reason === 'fall' ? 'stm.fall' : 'stm.crash'), 1200);
        if (reason !== 'fall' && reason !== 'stuck') {
            this._sfx('assets/sounds/crash-boom.wav', 0.55);
            const C = this.car;
            if (this.app.fx) this.app.fx.play('carcrash', new BABYLON.Vector3(C.p[0], C.p[1] + 80, C.p[2]));
            Cam.shake(18, 0.35);
        } else this._sfx('assets/sounds/hit.ogg', 0.6);
    },

    togglePause() {
        if (this.state !== 'race' && this.state !== 'dead' && this.state !== 'intro' && !Pause.has('manual')) return;
        const on = !Pause.has('manual');
        Pause.set('manual', on);
        GameHud.pause(on, this.toggleState());
        if (!on) GameHud.help(false);
    },

    /** Выйти из заезда без результата. */
    abort() {
        Platform.gameplay(false);
        if (this.run && this.state !== 'finish') Platform.submitScore(this.save.earned);   // и после брошенного заезда (правило Яндекса)
        if (this.run && this.state !== 'finish' && typeof Telemetry !== 'undefined') Telemetry.progress('failed', this.levelId, { step_index: this.levelIndex() + 1, reason: 'abandon' });
        if (Tutorial.active) Tutorial.finish('abort');
        GameHud.count(null);
    },

    _reachStage(ns) {
        const R = this.run;
        R.stage = ns;
        Track.setStage(ns);
        const last = ObbyCourse.stages.length - 1;
        if (ns >= last && ObbyCourse.finish) { this._finish(); return; }
        GameHud.toast(Lang.t('stm.cp', { n: ns, total: Math.max(1, last - 1) }));
        this._sfx('assets/sounds/checkpoint.ogg', 0.8);
        const cp = ObbyCourse.checkpoints[ns - 1];
        if (cp && this.app.fx) this.app.fx.play('checkpoint', new BABYLON.Vector3(cp.x, cp.y + 500, cp.z));
        Tutorial.complete('cp');
    },

    _botFinish(b) {
        if (this.state === 'finish') return;
        this.run.finished++;
        GameHud.toast(Lang.t('stm.botFinish', { name: b.name, n: this.run.finished }), 1500);
    },

    _place() {
        const R = this.run;
        if (this.state === 'finish') return R.place;
        let ahead = R.finished;
        for (const b of Bots.list) if (b.state !== 'finish' && b.progress > R.prog) ahead++;
        return ahead + 1;
    },

    _finish() {
        const R = this.run, C = this.car, L = this.level();
        R.place = R.finished + 1;
        this.state = 'finish';
        Platform.gameplay(false);
        GameHud.count(null);
        const total = Bots.list.length + 1;
        const track = L.points, stunts = Math.floor(R.stunt);
        const k = R.place === 1 ? 1 : R.place === 2 ? 0.5 : R.place === 3 ? 0.25 : 0;
        const bonus = Math.floor(L.points * (typeof SCORE_PLACE_BONUS !== 'undefined' ? SCORE_PLACE_BONUS : 0.5) * k);
        const sum = track + stunts + bonus;
        this.save.points += sum;
        this.save.earned = Math.floor((this.save.earned || 0) + sum);
        const was = this.save.done[this.levelId];
        this.save.done[this.levelId] = { place: was && was.place ? Math.min(was.place, R.place) : R.place, time: Math.round(R.t * 10) / 10 };
        this.persist();
        Platform.ads.roundEnded(true);
        Platform.submitScore(this.save.earned);   // рекорд не убывает (Playables: лучший отправленный = лучший в сохранении)
        if (typeof Telemetry !== 'undefined') Telemetry.progress('completed', this.levelId, { step_index: this.levelIndex() + 1, place: R.place, falls: Math.min(20, R.falls) });
        this._sfx('assets/sounds/finish.ogg', 1);
        if (this.app.fx) this.app.fx.play('finish', new BABYLON.Vector3(C.p[0], C.p[1] + 300, C.p[2]));
        Cam.setMode('finish');
        if (Tutorial.active) Tutorial.complete('cp');
        const idx = this.levelIndex(), next = this.levels()[idx + 1];
        setTimeout(() => {
            if (this.state !== 'finish') return;
            GameHud.results({ place: R.place, total, track, stunts, bonus, sum, hasNext: !!next && this.save.owned.includes(next.id) }, {
                next: () => Platform.ads.next(() => { this.pickId = next.id; this.toGarage(); }),
                again: () => Platform.ads.next(() => this.startRace()),
                garage: () => Platform.ads.next(() => this.toGarage()),
                levels: () => Platform.ads.next(() => { if (next) this.pickId = next.id; this.toLevels(); }),
            });
        }, 1500);
    },

    // -------------------------------------------------------------------------------------------
    // Очки: трасса по ходу, полёт, сальто, вертушка, чистая посадка, дрифт
    // -------------------------------------------------------------------------------------------

    _score(dt) {
        const R = this.run, C = this.car, U = 'undefined';
        const air = !C.grounded && C.stickT <= 0;
        if (air) {
            R.air += dt;
            const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
            R.pitch += dot(C.w, C.r) * dt; R.roll += dot(C.w, C.f) * dt; R.yawA += C.w[1] * dt;
            const step = typeof SCORE_AIR_STEP !== U ? SCORE_AIR_STEP : 0.5, pts = typeof SCORE_AIR_POINTS !== U ? SCORE_AIR_POINTS : 6;
            if (R.air > 0.4 && R.air - R.airPaid >= step) { R.airPaid += step; R.stunt += pts; }
            R.wasAir = true;
        } else if (R.wasAir) {
            R.wasAir = false;
            const full = Math.PI * 2 * 0.82;
            const flips = Math.floor(Math.max(Math.abs(R.pitch), Math.abs(R.roll)) / full), spins = Math.floor(Math.abs(R.yawA) / full);
            const F = typeof SCORE_FLIP !== U ? SCORE_FLIP : 60, LND = typeof SCORE_LANDING !== U ? SCORE_LANDING : 25;
            if (R.air > 0.8) GameHud.pop(Lang.t('stm.air.t') + ' ' + R.air.toFixed(1) + (Lang.code === 'en' ? 's' : 'с'), Math.round(R.airPaid / 0.5 * (typeof SCORE_AIR_POINTS !== U ? SCORE_AIR_POINTS : 6)));
            if (flips >= 1) { const p = F * flips * flips; R.stunt += p; GameHud.pop(Lang.t(flips >= 2 ? 'stm.flip2' : 'stm.flip'), p); this._stuntFx(); }
            if (spins >= 1) { const p = 40 * spins; R.stunt += p; GameHud.pop(Lang.t('stm.spin'), p); this._stuntFx(); }
            if (R.air > 0.8 && C.u[1] > 0.86 && C.contacts >= 3 && !C.dead) { R.stunt += LND; GameHud.pop(Lang.t('stm.landing'), LND); }
            R.air = 0; R.airPaid = 0; R.pitch = 0; R.roll = 0; R.yawA = 0;
        }
        // дрифт: занос на скорости
        const drifting = C.grounded && Math.abs(C.vf) > 900 && C.slip > 0.42;
        if (drifting) {
            R.drift += dt; R.driftOff = 0;
            const dp = typeof SCORE_DRIFT_POINTS !== U ? SCORE_DRIFT_POINTS : 3;
            const due = Math.floor(R.drift / 0.25) * dp;
            if (due > R.driftPts) { R.stunt += due - R.driftPts; R.driftPts = due; }
        } else if (R.drift > 0) {
            R.driftOff += dt;
            if (R.driftOff > 0.35) { if (R.driftPts >= 9) GameHud.pop(Lang.t('stm.drift'), R.driftPts); R.drift = 0; R.driftPts = 0; }
        }
    },

    _stuntFx() {
        const C = this.car;
        this._sfx('assets/sounds/reward.ogg', 0.5);
        if (this.app.fx) this.app.fx.play('stunt', new BABYLON.Vector3(C.p[0], C.p[1] + 150, C.p[2]));
    },

    // -------------------------------------------------------------------------------------------
    // Кадр
    // -------------------------------------------------------------------------------------------

    update(dt) {
        const app = this.app;
        if (!app || !this.car) return;
        const C = this.car;
        ObbyCourse.update(dt);
        Turbines.syncView(app.location);
        const look = Input.consumeLook();
        Cam.look(look.dx, look.dy, 'touch');
        if (Input.pressed('pause') && !GameHud.closeTop()) this.togglePause();
        const racing = this.state === 'race' || this.state === 'dead' || this.state === 'intro' || this.state === 'finish';
        if (this.state === 'race') {
            if (Input.pressed('respawn')) this._respawnNow();
            const input = {
                throttle: (Input.down('gas') ? 1 : 0) - (Input.down('brake') ? 1 : 0),
                steer: (Input.down('right') ? 1 : 0) - (Input.down('left') ? 1 : 0),
                handbrake: Input.down('handbrake'), nitro: Input.down('nitro'),
            };
            const p0x = C.p[0], p0z = C.p[2], y0 = C.yaw;
            C.step(dt, input, 240);
            if (Tutorial.active) { this.tutDist = (this.tutDist || 0) + Math.hypot(C.p[0] - p0x, C.p[2] - p0z); let dy = C.yaw - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.tutYaw = (this.tutYaw || 0) + Math.abs(dy); if (input.nitro) this.tutNitro = (this.tutNitro || 0) + dt; }
            if (this.state === 'race') {
                const R = this.run;
                R.t += dt;
                const ns = ObbyCourse.reached(C.p[0], C.p[1], C.p[2], R.stage);
                if (ns > R.stage) this._reachStage(ns);
                if (this.state === 'race') {
                    R.prog = Math.max(R.prog, ObbyCourse.progress(R.stage, C.p[0], C.p[1], C.p[2]));
                    this._score(dt);
                    if (!C.grounded && C.airTime > 0.6 && Tutorial.active) Tutorial.complete('air');
                }
            }
        } else if (this.state === 'intro') {
            C.step(dt, { handbrake: true }, 120);
            this.countT -= dt;
            const n = Math.ceil(this.countT);
            if (n !== this._lastCount && n >= 1 && n <= 3) { this._lastCount = n; GameHud.count(n); this._beep(false); }
            if (this.countT <= 0) this._startGo();
        } else if (this.state === 'dead') {
            C.step(dt, {});
            this.deadT -= dt;
            if (this.deadT < 0.3 && C.deadReason === 'fall') this.view.setVisible(false);
            if (this.deadT <= 0) this._respawnNow();
        } else if (this.state === 'finish') {
            C.step(dt, { throttle: C.vf > 150 ? -0.7 : 0, handbrake: C.vf < 150 }, 120);
        } else {
            // витрина: подиум медленно крутится
            this.podiumYaw += dt * 0.35;
            const s = Track.podiumSpot();
            const half = -(s.yaw + this.podiumYaw) / 2;
            C.q = [0, Math.sin(half), 0, Math.cos(half)];
            C._axes(); C._pose();
            C.p[0] = s.x; C.p[1] = s.y; C.p[2] = s.z;
            if (Track.podium) Track.podium.rotation.y = -this.podiumYaw;
        }
        if (racing) Bots.update(dt, { car: C, alive: this.state === 'race' });
        this.view.pose(C, dt);
        this.view.effects(C, dt, { on: this.state === 'race' });
        Skids.update(dt);
        Track.update(dt, { x: C.p[0], z: C.p[2] });
        const eye = app.location.view.camera.position;
        Bots.tagsUpdate(racing && this.state !== 'finish', { x: eye.x, y: eye.y, z: eye.z });
        if (racing && this.run) {
            const R = this.run;
            GameHud.setSpeed(Math.abs(C.vf) * STM_KMH, C.nitro, C.nitroOn && this.state === 'race');
            GameHud.setRace(this._place(), Bots.list.length + 1);
            GameHud.setRunPoints(Math.floor(R.prog * this.level().points) + R.stunt);
            const ticks = ObbyCourse.stageDist.slice(1, -1).map(d => d / (ObbyCourse.stageDist[ObbyCourse.stageDist.length - 1] || 1));
            GameHud.setProgress(R.prog, ticks, Bots.list.map(b => b.progress));
        }
        this._sound();
    },

    // -------------------------------------------------------------------------------------------
    // Рекорды (лидерборд площадки Score, Яндекс): окно с ником и аватаром, вход по кнопке
    // -------------------------------------------------------------------------------------------

    async records() {
        GameHud.records({ loading: true });
        const now = Date.now();
        if (!this._lb || now - this._lbT > 60000) {      // лимит Яндекса — 20 запросов за 5 минут: кэш на минуту
            this._lb = await Platform.leaderboard({ quantityTop: 10, includeUser: true, quantityAround: 2, avatarSize: 'small' });
            this._lbT = now;
        }
        GameHud.records({ list: this._lb || [], canLogin: Platform.canLogin() });
    },

    async login() {
        if (!(await Platform.login())) return;
        const s = await Platform.load();               // аккаунт мог смениться вместе с облачным сохранением
        if (s) { this.save = this._normalize(s); this._initRewards(); if (this.state === 'levels') this.renderLevels(); }
        this._lb = null;
        Platform.submitScore(this.save.earned);
        await this.records();
    },

    // -------------------------------------------------------------------------------------------
    // Подарок дня и колесо фортуны (логика — движок DailyGift.js / Wheel.js, валюта — очки, предметы — машины и окраски)
    // -------------------------------------------------------------------------------------------

    _initRewards() {
        const lang = () => (Lang.code === 'en' ? 'en' : 'ru');
        const paint = (id) => CAR_PAINTS.find(p => p.id === id);
        const car = (id) => GAME_CARS.find(c => c.id === id);
        const sink = {
            addCoins: (n) => { this.save.points += n; },
            owns: (id) => (paint(id) ? this.save.paints.includes(id) : this._carOpen(id)),
            grant: (id) => this._grantItem(id),
            // случайная машина приза — из закрытых и не самых дорогих (самые редкие остаются целью рекламы гаража)
            randomItem: (o) => {
                const max = typeof GIFT_CAR_MAX_ADS !== 'undefined' ? GIFT_CAR_MAX_ADS : 5;
                const list = GAME_CARS.filter(c => c.ads > 0 && c.ads <= max && !this._carOpen(c.id));
                return list.length ? list[Math.floor(((o && o.rng) ? o.rng() : Math.random()) * list.length) % list.length].id : null;
            },
            isExclusive: (id) => !!paint(id),
            item: (id) => !!(paint(id) || car(id)),
            name: (id) => { const x = paint(id) || car(id); return x ? x.name[lang()] : String(id); },
        };
        const dup = typeof GIFT_DUP_POINTS !== 'undefined' ? GIFT_DUP_POINTS : 800;
        DailyGift.init({ rewards: STM_DAILY_REWARDS, exclusive: CAR_PAINTS.map(p => p.id), rewardsSink: sink, state: this.save.daily, persist: () => this.persist(),
            fallbackCoins: typeof GIFT_BIG_POINTS !== 'undefined' ? GIFT_BIG_POINTS : 10000, dupCoins: dup });
        this.save.daily = DailyGift.state;
        Wheel.init({ sectors: STM_WHEEL_SECTORS, rewardsSink: sink, state: this.save.wheel, persist: () => this.persist(), dupCoins: dup });
        this.save.wheel = Wheel.state;
        this.wheelAngle = this.wheelAngle || 0;
    },

    /** Выдача предмета подарка или колеса: машина открывается в гараже, окраска сразу ставится на машину. */
    _grantItem(id) {
        if (CAR_PAINTS.some(p => p.id === id)) {
            if (!this.save.paints.includes(id)) this.save.paints.push(id);
            this.save.paint = id;
            if (this.view) this.view.setPaint(id);
            return true;
        }
        const c = GAME_CARS.find(x => x.id === id);
        if (!c) return false;
        if (!this.save.cars.includes(id)) this.save.cars.push(id);
        this.save.carAds[id] = c.ads;
        return true;
    },

    /** Что получил игрок (got[] движка) — короткими тостами, звук награды. */
    _announce(got) {
        const lang = Lang.code === 'en' ? 'en' : 'ru';
        const parts = [];
        let pts = 0;
        for (const g of got || []) {
            if (g.type === 'coins') pts += g.amount;
            else {
                const p = CAR_PAINTS.find(x => x.id === g.id), c = GAME_CARS.find(x => x.id === g.id);
                if (p) parts.push(Lang.t('stm.gotPaint', { name: p.name[lang] }));
                else if (c) parts.push(Lang.t('stm.gotCar', { name: c.name[lang] }));
            }
        }
        if (pts) parts.unshift(Lang.t('stm.gotPoints', { n: GameHud._num(pts) }));
        this._sfx('assets/sounds/reward.ogg', 0.9);
        if (parts.length) GameHud.toast(parts.join(' · '), 2600);
        return parts.join(' · ');
    },

    openGift() {
        if (this.state !== 'levels') return;
        GameHud.gift(this._giftModel());
        this._menuTimer();
    },

    _giftModel() {
        const v = DailyGift.view(), lang = Lang.code === 'en' ? 'en' : 'ru';
        const days = v.days.map((d) => {
            const r = d.reward, p = r.exclusive ? CAR_PAINTS.find(x => x.id === r.exclusive) : null;
            const hex = p ? '#' + p.color.toString(16).padStart(6, '0') : '';
            return { dayLabel: d.dayLabel, state: d.state, d7: d.exclusive, kind: p ? 'paint' : 'points', amount: r.coins || 0, carToo: r.randomItems > 0, color: hex,
                title: p ? p.name[lang] : Lang.t('stm.gotPoints', { n: GameHud._num(r.coins || 0) }),
                tag: p ? Lang.t('stm.exclusive') : '', hint: p ? Lang.t('daily.exclusiveHint') : '' };
        });
        const can = v.canClaim;
        return {
            days,
            claim: { show: true, enabled: can && !this._giftBusy, label: can ? Lang.t('daily.claim') : Lang.t('daily.claimed') },
            x2: { show: can && v.x2.available, enabled: v.x2.enabled && !this._giftBusy, label: v.x2.label },
            hint: can ? v.x2.hint : v.nextLabel,
        };
    },

    async claimGift(x2) {
        if (this._giftBusy || !DailyGift.canClaim()) return;
        this._giftBusy = true;
        GameHud.gift(this._giftModel());
        let r;
        try { r = x2 ? await DailyGift.claimX2() : DailyGift.claim(); } finally { this._giftBusy = false; }
        if (r && r.ok) this._announce(r.got);
        else if (r && r.reason === 'adFailed') GameHud.toast(Lang.t('daily.adUnavailable'), 2200);
        if (this.state === 'levels') this.renderLevels();
        if (GameHud.isOpen('mgift')) GameHud.gift(this._giftModel());
    },

    openWheel() {
        if (this.state !== 'levels') return;
        GameHud.wheel(this._wheelModel());
        this._menuTimer();
    },

    _wheelModel() {
        const st = Wheel.status();
        const spinning = !!st.pending || this._wheelBusy;
        return {
            sectors: Wheel.sectors().map(x => ({ kind: x.kind, coins: x.coins })), angle: this.wheelAngle || 0, spinning,
            free: { enabled: st.canSpinFree && !spinning, label: st.freeLabel },
            ad: { show: !st.freeAvailable, enabled: st.canSpinAd && !spinning, label: st.adLabel },
            hint: st.hint,
        };
    },

    async spinWheel(kind) {
        if (this._wheelBusy) return;
        this._wheelBusy = true;
        GameHud.wheel(this._wheelModel());
        let r;
        try { r = kind === 'free' ? Wheel.spinFree() : await Wheel.spinAd(); } catch (e) { r = null; }
        if (!r || !r.ok) {
            this._wheelBusy = false;
            if (r && r.reason === 'adFailed') GameHud.toast(Lang.t('wheel.adUnavailable'), 2200);
            if (GameHud.isOpen('mwheel')) GameHud.wheel(this._wheelModel());
            return;
        }
        this.wheelAngle = Wheel.angleFrom(this.wheelAngle || 0, r);
        GameHud.wheelSpin(this.wheelAngle, r.durationMs);
        this._sfx('assets/sounds/click.ogg', 0.5);
        // приз — по таймеру, даже если окно закрыли (свернули вкладку — Wheel.init выдаст его при следующем запуске)
        setTimeout(() => {
            const f = Wheel.finish();
            this._wheelBusy = false;
            if (f.ok) {
                const text = this._announce(f.got);
                GameHud.wheelResult(Lang.t('stm.win') + ' ' + text);
            }
            if (this.state === 'levels') this.renderLevels();
            if (GameHud.isOpen('mwheel')) GameHud.wheel(this._wheelModel());
        }, r.durationMs + 150);
    },

    /** Окраска в гараже: '' — заводская; эксклюзивные — только полученные в подарке 7-го дня. */
    async pickPaint(id) {
        if (this.state !== 'garage') return;
        if (id && !this.save.paints.includes(id)) { GameHud.toast(Lang.t('stm.paintLocked'), 2200); return; }
        if (this.save.paint === id) return;
        this.save.paint = id;
        this.persist();
        this.renderGarage();
        await this.view.setPaint(id);
        this._toPodium();
    },

    /** Таймеры на кнопках открытых окон (до следующего подарка и вращения, пауза между рекламами) — раз в секунду. */
    _menuTimer() {
        const open = GameHud.isOpen('mgift') || GameHud.isOpen('mwheel');
        if (open && !this._menuT) this._menuT = setInterval(() => this._menuRefresh(), 1000);
        if (!open && this._menuT) { clearInterval(this._menuT); this._menuT = 0; }
    },

    _menuRefresh() {
        if (GameHud.isOpen('mgift') && !this._giftBusy) GameHud.gift(this._giftModel());
        if (GameHud.isOpen('mwheel')) GameHud.wheel(this._wheelModel());
        if (this.state === 'levels') GameHud.setBadges({ gift: DailyGift.badge(), wheel: Wheel.badge() });
        this._menuTimer();
    },

    // Только Playables (просьба пользователя): межстраничная реклама на каждое нажатие кнопки интерфейса —
    // билеты трасс, меню, гараж, окна, пауза, результат. Не во время заезда (педали, ⟲, ❚❚, «Пропустить» обучения
    // в заезде) и не на кнопках «за рекламу» (у них своя реклама). Покажет ли SDK объявление — решает он
    // (requestInterstitialAd ничего не гарантирует); пока идёт показ, новый запрос не уходит (Platform._adBusy),
    // поэтому кнопки результата с Platform.ads.next двойного показа не дают. Локально: ?uiads&mockads.
    _initUiAds() {
        if (typeof document === 'undefined') return;
        const on = String(GAME_PLATFORM) === 'playables' || (typeof location !== 'undefined' && /[?&]uiadsb/.test(location.search));
        if (!on) return;
        document.addEventListener('click', (e) => {
            const t = /** @type {any} */ (e.target);
            const el = t && t.closest ? t.closest('button, [role="button"], .ticket') : null;
            if (!el || el.disabled) return;
            if (el.closest('#loading-screen, .lory-input-layer') || el.classList.contains('tb')) return;
            if (el.classList.contains('adbtn') || el.dataset.k === 'ad') return;           // кнопки «за рекламу»
            const playing = (this.state === 'race' || this.state === 'intro' || this.state === 'dead') && !Pause.has('manual');
            if (playing) return;                                                             // в заезде — никакой рекламы
            if (Platform._adBusy || !Platform.interstitialSupported()) return;
            Platform.interstitial();
        }, true);
    },

    // -------------------------------------------------------------------------------------------
    // Реклама за очки, настройки
    // -------------------------------------------------------------------------------------------

    _refreshAd() {
        const n = typeof AD_REWARD_POINTS !== 'undefined' ? AD_REWARD_POINTS : 1500;
        const ok = Platform.rewardedSupported ? Platform.rewardedSupported() : true;
        const wait = Platform.rewardedCooldownLeft ? Platform.rewardedCooldownLeft() : 0;
        GameHud.setAd({ show: ok, enabled: ok && !wait && !this._adBusy, label: wait ? Lang.t('stm.adWait', { n: wait }) : Lang.t('stm.adPoints', { n }) });
    },

    async adPoints() {
        if (this._adBusy) return;
        this._adBusy = true;
        this._refreshAd();
        let ok = false;
        try { ok = await Platform.rewarded('points'); } catch (e) { ok = false; }
        this._adBusy = false;
        if (ok) {
            this.save.points += typeof AD_REWARD_POINTS !== 'undefined' ? AD_REWARD_POINTS : 1500;
            this.persist();
            this._sfx('assets/sounds/reward.ogg', 0.8);
            if (this.state === 'levels') this.renderLevels();
        }
        this._refreshAd();
    },

    toggleState() {
        const q = typeof Quality !== 'undefined' ? Quality.choice || 'auto' : 'auto';
        return { sfx: this.save.sfx !== false, music: this.save.music !== false, quality: q };
    },

    toggle(k) {
        if (k === 'sfx') { this.save.sfx = this.save.sfx === false; }
        else if (k === 'music') { this.save.music = this.save.music === false; this._music(this._musicKind, true); }
        else if (k === 'quality' && typeof Quality !== 'undefined') {
            const order = ['auto', 'low', 'medium', 'high'];
            const next = order[(order.indexOf(Quality.choice || 'auto') + 1) % order.length];
            Quality.set(next);
            this.save.quality = next;
        }
        this.persist();
        GameHud.refreshToggles(this.toggleState());
    },

    // -------------------------------------------------------------------------------------------
    // Обучение (Tutorial.js): газ, руль, нитро, трамплин, чекпоинт — «Пропустить» на каждом шаге
    // -------------------------------------------------------------------------------------------

    _initTutorial() {
        Tutorial.init({
            app: this.app,
            steps: [
                { id: 'gas', title: 'stm.tut.gas.t', hint: { keyboard: 'stm.tut.gas.k', touch: 'stm.tut.gas.m', mouse: 'stm.tut.gas.m', pad: 'stm.tut.gas.k' }, target: { touch: '#stm .tb.gas', mouse: '#stm .tb.gas' },
                    check: () => Math.min(1, (this.tutDist || 0) / 900), onEnter: () => { this.tutDist = 0; } },
                { id: 'steer', title: 'stm.tut.steer.t', hint: { keyboard: 'stm.tut.steer.k', touch: 'stm.tut.steer.m', mouse: 'stm.tut.steer.m', pad: 'stm.tut.steer.k' }, target: { touch: '#stm .tb.left', mouse: '#stm .tb.left' },
                    check: () => Math.min(1, (this.tutYaw || 0) / 0.9), onEnter: () => { this.tutYaw = 0; } },
                { id: 'nitro', title: 'stm.tut.nitro.t', hint: { keyboard: 'stm.tut.nitro.k', touch: 'stm.tut.nitro.m', mouse: 'stm.tut.nitro.m', pad: 'stm.tut.nitro.k' }, target: { touch: '#stm .tb.nitro', mouse: '#stm .tb.nitro' },
                    check: () => Math.min(1, (this.tutNitro || 0) / 0.6), onEnter: () => { this.tutNitro = 0; } },
                { id: 'air', title: 'stm.tut.air.t', hint: { keyboard: 'stm.tut.air.k', touch: 'stm.tut.air.m', mouse: 'stm.tut.air.m', pad: 'stm.tut.air.k' }, event: 'air' },
                { id: 'cp', title: 'stm.tut.cp.t', hint: 'stm.tut.cp.h', event: 'cp', skipIf: () => this.run && this.run.stage > 0,
                    world: () => { const c = ObbyCourse.checkpoints[this.run ? this.run.stage : 0]; return c ? { x: c.x, y: c.z, h: c.y + 700 } : null; } },
            ],
            state: () => this.save, field: 'tutorialDone', persist: () => this.persist(),
            onFinish: (reason) => { Platform.analytics('tutorial_finished', { result: reason === 'skip' ? 'skip' : 'done' }); },
            css: '.lory-tut{font-family:var(--stm-font)!important}',
        });
    },

    // -------------------------------------------------------------------------------------------
    // Звук: мотор, ветер и шум колёс — синтез (как в Obby Car Master); визг шин, эффекты и музыка — файлы
    // -------------------------------------------------------------------------------------------

    _sfx(url, volume) {
        if (this.save && this.save.sfx === false) return;
        try { Sound.play(url, { volume: volume == null ? 0.6 : volume }); } catch (e) { /* без звука игра идёт */ }
    },

    _beep(go) { if (this.save.sfx !== false) try { Sound.play(go ? 'synth:go' : 'synth:beep', { volume: 0.55 }); } catch (e) { /* тихо */ } },

    _music(kind, force) {
        if (this._musicKind === kind && !force) return;
        this._musicKind = kind;
        try {
            if (this.save.music === false) { Sound.stopMusic(); return; }
            if (kind === 'race') Sound.music(['assets/sounds/music-race-1.ogg', 'assets/sounds/music-race-2.ogg'][this.levelIndex() % 2]);
            else Sound.music('assets/sounds/music-menu.ogg');
        } catch (e) { /* без музыки */ }
    },

    _initSound() {
        const R = 22050;
        let seed = 12345;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const noise = (seconds, color) => {
            const n = Math.floor(R * seconds), out = new Float32Array(n);
            let b0 = 0, b1 = 0, last = 0;
            for (let i = 0; i < n; i++) {
                const w = rnd() * 2 - 1;
                if (color === 'brown') { last = (last + 0.02 * w) / 1.02; out[i] = last * 3.2; }
                else { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; out[i] = (b0 + b1 + w * 0.18) * 0.18; }
            }
            const fade = Math.floor(R * 0.05);
            for (let i = 0; i < fade; i++) { const k = i / fade; out[i] = out[i] * k + out[n - fade + i] * (1 - k); }
            return Sound.makeBuffer(out.subarray(0, n - fade), R);
        };
        const engine = () => {
            const f0 = 45, per = R / f0, n = R, out = new Float32Array(n);
            for (let k = 0; k < f0; k++) {
                const t0 = k * per + Math.round((rnd() - 0.5) * 4), amp = 0.8 + rnd() * 0.4, len = Math.floor(per * 2.2);
                for (let i = 0; i < len; i++) {
                    const t = i / R, env = Math.exp(-t * 48);
                    out[(t0 + i + n) % n] += amp * env * (Math.sin(6.2832 * 140 * t) * 0.55 + Math.sin(6.2832 * 290 * t) * 0.22 + (rnd() * 2 - 1) * 0.2);
                }
            }
            for (let i = 0; i < n; i++) { const ph = (i % per) / per; out[i] += (1 - 2 * ph) * 0.2 + Math.sin(6.2832 * ph) * 0.4 + Math.sin(6.2832 * ph * 2) * 0.12; }
            let mx = 1e-6;
            for (let i = 0; i < n; i++) mx = Math.max(mx, Math.abs(out[i]));
            for (let i = 0; i < n; i++) out[i] *= 0.8 / mx;
            return Sound.makeBuffer(out, R);
        };
        const tone = (f, dur, f2) => { const n = Math.floor(R * dur), out = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / R, k = i / n; out[i] = Math.sin(6.2832 * (f + (f2 ? (f2 - f) * k : 0)) * t) * Math.min(1, t / 0.01) * (1 - k) * 0.6; } return Sound.makeBuffer(out, R); };
        try {
            const b1 = tone(660, 0.22), b2 = tone(990, 0.5, 1320);
            if (b1) Sound.putBuffer('beep', b1);
            if (b2) Sound.putBuffer('go', b2);
            const bufs = { roll: noise(2, 'brown'), wind: noise(3, 'pink'), engine: engine() };
            for (const [name, buf] of Object.entries(bufs)) {
                if (!buf) continue;
                Sound.putBuffer(name, buf);
                this.loops[name] = Sound.loop('synth:' + name, { volume: 0 });
            }
        } catch (e) { console.warn('Синтез звука:', e); }
        // визг шин в заносе — запись (BigSoundBank #0500, CC0), склеенная в бесшовную петлю
        this.loops.screech = Sound.loop('assets/sounds/skid-loop.ogg', { volume: 0 });
    },

    _sound() {
        const C = this.car, L = this.loops;
        const on = (this.state === 'race' || this.state === 'intro') && this.save.sfx !== false;
        const sp = Math.abs(C.vf);
        if (L.engine) L.engine.set(on ? 0.15 + 0.2 * Math.abs(C.throttle) + (C.nitroOn ? 0.1 : 0) : 0, 0.55 + C.rpm * 1.75 + (C.nitroOn ? 0.15 : 0));
        const squeal = on && C.grounded && sp > 250 ? Math.max(0, Math.min(1, (C.slip - 0.3) * 2.2)) : 0;
        if (L.screech) L.screech.set(squeal * (C.handbrake ? 0.5 : 0.38), 0.94 + Math.min(0.14, sp / 15000));
        if (L.roll) L.roll.set(on && C.grounded ? Math.min(0.28, sp / 7000) : 0, 0.7 + Math.min(1.2, sp / 2600) * 0.6);
        if (L.wind) L.wind.set(on ? Math.min(0.45, Math.max(0, (Math.hypot(C.v[0], C.v[1], C.v[2]) - 900) / 4500)) : 0, 1);
    },
};
