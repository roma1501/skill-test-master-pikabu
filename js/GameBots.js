// GameBots.js — соперники на трассе: едут на той же физике машины (createCar), стартуют с решётки вместе с игроком
// и сами проходят трассу по маршруту карты (маркеры route-N: точка на линии езды, scale[0] — скорость в долях
// BOT_REF_SPEED, scale[1] — действие: 1 едем, 2 точка отрыва трамплина — держать скорость точно, 3 приземление).
// Автопилот перенесён из Obby Car Master: руль на точку впереди, скорость по точке маршрута и повороту, выжидание
// вертушек, молотов, катящихся шин и движущихся плит (прогноз по ObbyCourse.poseAt), разгон заново, если к
// трамплину подъехал медленно. Ошибается по своему умению, падает и возвращается на свой чекпоинт, после
// BOT_SKIP_AFTER падений подряд «пропускает этап». У каждого — своя машина и ник над ней. Машины толкаются:
// таран игрока быстрее BOT_KNOCK_SPEED отбрасывает бота. Логика без Babylon (вид — только если есть CarView),
// поэтому трассы проверяются ботами в node: tools/sim-level.mjs.

const BOT_NAMES = {
    ru: ['Гайка', 'Турбик', 'Шумахерыч', 'Пилот_99', 'Карбюратор', 'Шина', 'Дымок', 'Форсаж', 'Бампер', 'Кардан',
        'Ласточка', 'Тормоз', 'Стартер', 'Глушак', 'Поршень', 'Педаль', 'Сцепление', 'Клаксон', 'Руль_Огонь', 'Вираж',
        'Каскадёр', 'Бензин', 'Дрифтер', 'Колёсико', 'Пружинка', 'Трамплин', 'Нитро', 'Капот', 'Спойлер', 'Фара'],
    en: ['Sprocket', 'Turbo', 'Piston', 'Pilot_99', 'Skid', 'Nitro', 'Bumper', 'Throttle', 'Gearbox', 'Drifter',
        'Swallow', 'Clutch', 'Starter', 'Muffler', 'Pedal', 'Horn', 'Stuntman', 'Spoiler', 'Headlight', 'Fender'],
};

/** @satisfies {Record<string, any>} */
const Bots = {
    /** @type {any} */ view: null,
    /** @type {any[]} */ list: [],
    /** @type {any[]} */ route: [],
    /** @type {number[]} */ cpRoute: [],
    /** @type {any[]} */ haz: [],
    /** @type {any[]} */ zones: [],
    /** @type {HTMLElement | null} */ tags: null,
    /** @type {string[]} */ _names: [],
    /** @type {() => number} */ rng: Math.random,
    time: 0,
    /** @type {Record<string, (...a: any[]) => void>} */
    on: {},

    cfg() {
        const U = 'undefined';
        return {
            count: IS_MOBILE ? (typeof BOT_COUNT_MOBILE !== U ? BOT_COUNT_MOBILE : 3) : (typeof BOT_COUNT !== U ? BOT_COUNT : 4),
            skillMin: typeof BOT_SKILL_MIN !== U ? BOT_SKILL_MIN : 0.55,
            skillMax: typeof BOT_SKILL_MAX !== U ? BOT_SKILL_MAX : 0.95,
            knock: typeof BOT_KNOCK_SPEED !== U ? BOT_KNOCK_SPEED : 700,
            shield: typeof BOT_SPAWN_SHIELD !== U ? BOT_SPAWN_SHIELD : 2,
            skip: typeof BOT_SKIP_AFTER !== U ? BOT_SKIP_AFTER : 4,
            ref: typeof BOT_REF_SPEED !== U ? BOT_REF_SPEED : 2600,
            rowBack: typeof BOT_GRID_BACK !== U ? BOT_GRID_BACK : 750,
            side: typeof BOT_GRID_SIDE !== U ? BOT_GRID_SIDE : 240,
        };
    },

    /** Сколько ботов на этом устройстве (низкий уровень графики — меньше). */
    count() {
        const n = this.cfg().count;
        const q = typeof Quality !== 'undefined' && Quality.level != null ? String(Quality.level) : 'high';
        return Math.max(0, q === 'low' || q === '0' ? Math.min(n, 2) : n);
    },

    // ---------------------------------------------------------------------------------------------
    // Постройка: маршрут, опасности, боты на решётке
    // ---------------------------------------------------------------------------------------------

    /**
     * Под экраном загрузки уровня (ObbyCourse.build уже был): маршрут, привязка чекпоинтов, боты.
     * opts: { view (Babylon-вид для CarView; нет — без вида), count, cars: [id], rng, tags (DOM-слой ников) }.
     */
    async build(opts) {
        const o = opts || {};
        this.clear();
        this.view = o.view || null;
        this.rng = o.rng || Math.random;
        this.tags = o.tags || null;
        this.time = 0;
        this.route = ObbyCourse.route.slice();
        // чекпоинт k (этап k) -> индекс точки маршрута
        this.cpRoute = ObbyCourse.stageRoute.slice();
        this._mapHazards();
        const n = o.count != null ? o.count : this.count();
        const pool = (o.cars && o.cars.length ? o.cars : GAME_CARS.map(c => c.id)).slice();
        const jobs = [];
        for (let i = 0; i < n; i++) jobs.push(this._spawn(i, pool[Math.floor(this.rng() * pool.length)]));
        await Promise.all(jobs);
        this.toGrid();
    },

    clear() {
        for (const b of this.list) this._dispose(b);
        this.list = [];
    },

    _dispose(b) {
        try { if (b.view) b.view.dispose(); } catch (e) { /* уже */ }
        if (b.tag) b.tag.remove();
    },

    _name() {
        const lang = typeof Lang !== 'undefined' && Lang.code === 'en' ? 'en' : 'ru';
        const list = BOT_NAMES[lang];
        if (!this._names.length) this._names = list.slice().sort(() => this.rng() - 0.5);
        return this._names.pop();
    },

    async _spawn(i, carId) {
        const b = {
            i, carId, car: createCar(carSpec(carId)), view: null, name: this._name(), skill: 0, ri: 0, cpRi: 0, stage: 0,
            state: 'grid', deadT: 0, waitT: 0, noise: this.rng() * 10, tag: null, finishT: 0, place: 0, progress: 0,
            fails: 0, lastCp: -1, invT: 0, stuckT: 0, bestD: Infinity, turnT: 0, waited: 0, reckless: false, rash: false,
            recklessT: 0, backT: 0, backFor: -1, backN: 0, alignBrake: 0, hzT: 0, hzWait: false, bumpT: 0, knockT: 0,
        };
        const C = this.cfg();
        b.skill = C.skillMin + this.rng() * (C.skillMax - C.skillMin);
        b.rash = this.rng() < (1 - b.skill) * 0.5;
        b.reckless = b.rash;
        b.car.isBot = true;
        b.car.on.die = (reason) => this._die(b, reason);
        if (this.view && typeof CarView !== 'undefined') {
            const cv = new CarView(this.view, 'bot-' + i);
            await cv.setCar(carId);
            b.view = cv;
        }
        if (this.tags && typeof document !== 'undefined') {
            const tag = document.createElement('div');
            tag.className = 'tag off';
            tag.textContent = b.name;
            this.tags.appendChild(tag);
            b.tag = tag;
        }
        this.list.push(b);
    },

    /** Слоты решётки за стартом: два ряда по два, игрок — на самом старте. */
    gridSlot(i) {
        const C = this.cfg(), sp = ObbyCourse.respawn(0);
        const row = Math.floor(i / 2) + 1, side = i % 2 ? 1 : -1;
        const fx = Math.cos(sp.yaw), fz = Math.sin(sp.yaw), rx = -fz, rz = fx;
        const back = C.rowBack * row, lat = C.side * side;
        return { x: sp.x - fx * back + rx * lat, y: sp.y, z: sp.z - fz * back + rz * lat, yaw: sp.yaw };
    },

    /** Все боты — на решётку, стоят до start(). */
    toGrid() {
        for (const b of this.list) {
            const s = this.gridSlot(b.i);
            const h = ObbyCourse.rayDown(s.x, s.y + 200, s.z, 600);
            b.car.reset(s.x, h ? h.y : s.y, s.z, s.yaw);
            b.ri = 0; b.cpRi = 0; b.stage = 0; b.state = 'grid'; b.finishT = 0; b.place = 0; b.progress = 0; b.fails = 0; b.lastCp = -1;
            b.stuckT = 0; b.bestD = Infinity; b.turnT = 0; b.waited = 0; b.backT = 0; b.backN = 0; b.backFor = -1; b.alignBrake = 0;
            b.invT = 0;
            if (b.view) { b.view.setVisible(true); b.view.setAlpha(1); }
            this._pose(b, 0);
        }
    },

    /** Старт гонки: у каждого своя реакция. */
    start() {
        this.time = 0;
        for (const b of this.list) { b.state = 'ride'; b.waitT = 0.08 + this.rng() * (0.5 - 0.35 * b.skill); }
    },

    // ---------------------------------------------------------------------------------------------
    // Опасности у точек маршрута (вертушки, молоты, шины — выждать; движущиеся плиты — дождаться)
    // ---------------------------------------------------------------------------------------------

    _mapHazards() {
        const R = this.route;
        this.haz = R.map(() => null);
        for (const p of ObbyCourse.pieces) {
            if (!p.dynamic || !p.base) continue;
            const tire = p.role === 'move' && p.prm.tire;
            const kind = p.type === 'spinner' ? (p.sy < 330 ? 'spin' : '') : p.type === 'hammer' ? 'hammer' : tire ? 'tire' : p.role === 'move' ? 'move' : '';
            if (!kind) continue;
            const O = p.base.O;
            const span = Math.hypot(p.prm.x || 0, p.prm.z || 0);
            const reach = kind === 'spin' ? p.sx / 2 + 340 : kind === 'hammer' ? p.sy + p.sx / 2 + 340 : kind === 'tire' ? span + p.sx / 2 + 380 : Math.max(p.sx, p.sz) / 2 + 40;
            for (let i = 0; i < R.length; i++) {
                const q = R[i];
                if (Math.hypot(q.x - O[0], q.z - O[2]) > reach || Math.abs(q.y - O[1]) > 900) continue;
                (this.haz[i] || (this.haz[i] = [])).push({ p, kind });
            }
        }
        // ветряки: лопасти поперёк трассы (Turbines)
        if (typeof Turbines !== 'undefined') for (const T of Turbines.list) {
            for (let i = 0; i < R.length; i++) {
                const q = R[i];
                if (Math.hypot(q.x - T.H[0], q.z - T.H[2]) > T.L + 450 || Math.abs(q.y - T.H[1]) > T.L + 300) continue;
                (this.haz[i] || (this.haz[i] = [])).push({ p: T, kind: 'turbine' });
            }
        }
        // зоны вертушек, молотов, шин и ветряков: от первой до последней задетой точки маршрута
        /** @type {any[]} */
        const zones = [];
        for (let i = 0; i < R.length; i++) for (const h of this.haz[i] || []) {
            if (h.kind === 'move') continue;
            const z = zones.find(q => q.p === h.p && i - q.i1 <= 2);
            if (z) z.i1 = i; else zones.push({ p: h.p, h, i0: i, i1: i });
        }
        this.zones = zones;
    },

    // Расстояние между отрезками a1-a2 и b1-b2 на плоскости (x, z).
    _segDist(a1x, a1z, a2x, a2z, b1x, b1z, b2x, b2z) {
        const pt = (px, pz, sx, sz, ex, ez) => {
            const vx = ex - sx, vz = ez - sz, L = vx * vx + vz * vz;
            const u = L > 1e-9 ? Math.max(0, Math.min(1, ((px - sx) * vx + (pz - sz) * vz) / L)) : 0;
            return Math.hypot(px - (sx + vx * u), pz - (sz + vz * u));
        };
        const cr = (ax, az, bx, bz, cx, cz) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
        const d1 = cr(a1x, a1z, a2x, a2z, b1x, b1z), d2 = cr(a1x, a1z, a2x, a2z, b2x, b2z);
        const d3 = cr(b1x, b1z, b2x, b2z, a1x, a1z), d4 = cr(b1x, b1z, b2x, b2z, a2x, a2z);
        if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
        return Math.min(pt(a1x, a1z, b1x, b1z, b2x, b2z), pt(a2x, a2z, b1x, b1z, b2x, b2z), pt(b1x, b1z, a1x, a1z, a2x, a2z), pt(b2x, b2z, a1x, a1z, a2x, a2z));
    },

    // Опасность h для машины с центром q, курсом yaw и половиной длины half в момент трассы t.
    _danger(h, q, t, yaw, half) {
        const p = h.p;
        const hl = half || 240;
        const cy = Math.cos(yaw || 0), sy = Math.sin(yaw || 0);
        const c1x = q.x - cy * hl, c1z = q.z - sy * hl, c2x = q.x + cy * hl, c2z = q.z + sy * hl;
        if (h.kind === 'spin' || h.kind === 'hammer') {
            for (const c of ObbyCourse.capsulesAt(p, t)) {
                const lo = Math.min(c.a[1], c.b[1]) - c.r, hi = Math.max(c.a[1], c.b[1]) + c.r;
                if (q.y != null && (hi < q.y - 40 || lo > q.y + 300)) continue;
                if (this._segDist(c1x, c1z, c2x, c2z, c.a[0], c.a[2], c.b[0], c.b[2]) < c.r + 150) return true;
            }
            return false;
        }
        if (h.kind === 'turbine') {
            // точки корпуса (вдоль и по высоте — низ кузова и крыша высокой машины) против капсул лопастей в момент t
            const y0 = q.y != null ? q.y : h.p.H[1];
            for (const B of Turbines.bladesAt(h.p, t)) {
                const abx = B.b[0] - B.a[0], aby = B.b[1] - B.a[1], abz = B.b[2] - B.a[2], L2 = abx * abx + aby * aby + abz * abz;
                for (const y of [y0 + 90, y0 + 250]) for (const k of [-1, 0, 1]) {
                    const px = q.x + cy * hl * k, pz = q.z + sy * hl * k;
                    const u = Math.max(0, Math.min(1, ((px - B.a[0]) * abx + (y - B.a[1]) * aby + (pz - B.a[2]) * abz) / L2));
                    if (Math.hypot(px - (B.a[0] + abx * u), y - (B.a[1] + aby * u), pz - (B.a[2] + abz * u)) < B.r + 150) return true;
                }
            }
            return false;
        }
        if (h.kind === 'tire') {
            const pose = ObbyCourse.poseAt(p, t, {});
            const r = p.sx / 2;
            const ax = pose.ay, w = p.sy;       // ось шины — локальная Y детали (лежит на боку), ширина — толщина
            const a = [pose.O[0], pose.O[2]], b = [pose.O[0] - ax[0] * w, pose.O[2] - ax[2] * w];
            return this._segDist(c1x, c1z, c2x, c2z, a[0], a[1], b[0], b[1]) < r + 140;
        }
        // движущаяся плита: опасно, если в этот момент точка q (на плите в базовой позе) не лежит на плите с запасом
        const pose = ObbyCourse.poseAt(p, t, {});
        const covered = ObbyCourse.coversPose(p, pose, q.x, q.z, -150) && (q.y == null || Math.abs(pose.O[1] - q.y) < 90);
        return !covered;
    },

    // Проскочит ли бот зону целиком, если поедет сейчас: прибытие к каждой точке зоны по разгону.
    _zoneClear(b, z) {
        const R = this.route, B = b.car;
        const a = B.cfg().accel * 0.7, vz = Math.min(1800, B.cfg().vmax);
        let v = Math.max(0, B.vf), prev = { x: B.p[0], z: B.p[2] }, t = 0;
        const t0 = ObbyCourse.time, half = B.spec.L / 2 + 15;
        for (let j = b.ri; j <= z.i1 + 1 && j < R.length; j++) {
            const q = R[j];
            const d = Math.hypot(q.x - prev.x, q.z - prev.z), yaw = Math.atan2(q.z - prev.z, q.x - prev.x);
            const n = Math.max(1, Math.ceil(d / 120));
            for (let k = 1; k <= n; k++) {
                const dd = d / n;
                const v2 = Math.min(vz, Math.sqrt(v * v + 2 * a * dd));
                t += dd / Math.max(120, (v + v2) / 2);
                v = v2;
                const s = { x: prev.x + (q.x - prev.x) * k / n, y: q.y, z: prev.z + (q.z - prev.z) * k / n };
                for (const dtw of [-0.2, 0, 0.2]) if (this._danger(z.h, s, t0 + t + dtw, yaw, half)) return false;
            }
            prev = q;
        }
        return true;
    },

    /** Впереди движущаяся плита не на месте в момент прибытия: притормозить и выждать. */
    _hazardAhead(b) {
        const R = this.route, B = b.car;
        if (!this.haz) return false;
        const v = Math.max(500, Math.abs(B.vf));
        let dist = 0, prev = { x: B.p[0], z: B.p[2] };
        for (let j = b.ri; j < Math.min(R.length, b.ri + 8); j++) {
            const q = R[j];
            dist += Math.hypot(q.x - prev.x, q.z - prev.z);
            prev = q;
            if (dist > 1600) break;
            const hs = this.haz[j];
            if (!hs) continue;
            if (dist < 150) return false;
            const tau = dist / v, t = ObbyCourse.time, yaw = Math.atan2(q.z - (R[j - 1] || q).z, q.x - (R[j - 1] || q).x) || B.yaw;
            for (const h of hs) {
                if (h.kind !== 'move') continue;
                if (B.wheels.some(w => w.contact && w.col && w.col.piece === h.p)) continue;   // уже на этой плите
                if (dist < 800 && (this._danger(h, q, t + tau, yaw) || this._danger(h, q, t + tau + 0.35, yaw))) return true;
            }
        }
        return false;
    },

    // ---------------------------------------------------------------------------------------------
    // Кадр
    // ---------------------------------------------------------------------------------------------

    /** player: { car, alive } — машина игрока (толкаются); null — без игрока (симулятор, меню). */
    update(dt, player) {
        const R = this.route;
        this.time += dt;
        if (!R.length || !this.list.length) return;
        for (const b of this.list) {
            const B = b.car;
            if (b.state === 'grid') B.step(dt, { throttle: 0, steer: 0, handbrake: true }, 90);
            else if (b.state === 'ride') this._drive(b, dt, 150);
            else if (b.state === 'dead') {
                b.deadT -= dt;
                B.step(dt, {});
                if (b.deadT < 0.35 && B.deadReason === 'fall' && b.view) b.view.setVisible(false);
                if (b.deadT <= 0) {
                    const tries = this.cfg().skip;
                    b.fails = b.lastCp === b.cpRi ? b.fails + 1 : 1;
                    b.lastCp = b.cpRi;
                    if (b.fails >= tries) {
                        const next = this.cpRoute.findIndex((ci, k) => k > b.stage && k < this.cpRoute.length - 1);
                        b.fails = 0;
                        if (next > 0) { b.stage = next; b.cpRi = this.cpRoute[next]; b.lastCp = b.cpRi; }
                    }
                    this._place(b);
                }
            } else if (b.state === 'finish') {
                b.finishT += dt;
                B.step(dt, { throttle: B.vf > 200 ? -0.6 : 0, steer: 0, handbrake: B.vf < 200 }, 60);
                if (b.view && b.finishT > 2.5) b.view.setVisible(false);
            }
            if (b.invT > 0) {
                b.invT -= dt;
                if (b.view) b.view.setAlpha(b.invT > 0 ? (Math.floor(b.invT * 8) % 2 ? 0.35 : 0.85) : 1);
            }
            if (player && player.alive && player.car && b.state === 'ride') this._touchPlayer(b, player.car);
            if (b.state === 'ride' || b.state === 'grid') b.progress = Math.max(b.progress, ObbyCourse.progress(b.stage, B.p[0], B.p[1], B.p[2]));
            this._pose(b, dt);
        }
        this._touchBots();
    },

    /** Вернуть бота на его чекпоинт (после падения или если застрял). */
    _place(b) {
        const s = ObbyCourse.respawn(b.stage);
        b.car.reset(s.x, s.y - 20, s.z, s.yaw);
        b.ri = this.cpRoute[b.stage] || 0;
        b.cpRi = b.ri;
        b.state = 'ride';
        b.waitT = 0.3 + this.rng() * 0.7;
        b.invT = this.cfg().shield;
        b.stuckT = 0; b.bestD = Infinity; b.turnT = 0; b.waited = 0; b.recklessT = 0; b.backT = 0; b.backFor = -1; b.backN = 0; b.alignBrake = 0;
        b.reckless = b.rash;
        if (b.view) b.view.setVisible(true);
        this._pose(b, 0);
    },

    // Автопилот: руль на точку впереди, скорость по точке маршрута, повороту и умению; точный разгон к трамплину.
    _drive(b, dt, hz) {
        const R = this.route, B = b.car, C = this.cfg();
        if (b.waitT > 0) { b.waitT -= dt; B.step(dt, { throttle: 0, steer: 0, handbrake: true }, hz); return; }
        const d2 = (i) => (R[i].x - B.p[0]) ** 2 + (R[i].z - B.p[2]) ** 2 + ((R[i].y - B.p[1]) * (R[i].f === 4 || R[Math.max(0, i - 1)].f === 4 ? 1 : 0.15)) ** 2;
        const ri0 = b.ri;
        while (b.ri < R.length - 1 && (d2(b.ri + 1) < d2(b.ri) || d2(b.ri) < 170 * 170) && Math.abs(R[b.ri + 1].y - B.p[1]) < 2400) b.ri++;
        if (b.ri !== ri0) { b.bestD = Infinity; b.stuckT = 0; }
        // этапы: чекпоинты берутся как у игрока (зона маркера)
        const ns = ObbyCourse.reached(B.p[0], B.p[1], B.p[2], b.stage);
        if (ns > b.stage) {
            b.stage = ns; b.cpRi = Math.max(b.cpRi, this.cpRoute[ns] || b.ri);
            if (ns >= ObbyCourse.stages.length - 1 && ObbyCourse.finish) {
                b.state = 'finish'; b.finishT = 0; b.progress = 1;
                if (this.on.finish) this.on.finish(b);
                return;
            }
        }
        const dn = Math.sqrt(d2(Math.min(R.length - 1, b.ri + 1)));
        if (dn < b.bestD - 60) { b.bestD = dn; b.stuckT = 0; } else b.stuckT += dt;
        if (b.stuckT > 4.5 || (B.u[1] < 0.3 && B.groundTime === 0 && B.airTime > 3 && B.stickT <= 0)) { this._place(b); return; }
        let ti = b.ri;
        const look = 320 + Math.max(0, B.vf) * 0.24;
        while (ti < R.length - 1 && d2(ti) < look * look) ti++;
        let T = R[ti];
        const vg = B.grounded && B.wheels.some(w => w.contact && w.col && w.col.dynamic) ? B._groundVel() : null;
        if (vg) {
            const tt = Math.hypot(T.x - B.p[0], T.z - B.p[2]) / Math.max(400, Math.abs(B.vf));
            T = { x: T.x - vg[0] * tt, z: T.z - vg[2] * tt, y: T.y, s: Math.max(R[ti].s, 0.6), f: 1, yaw: 0 };
        }
        b.aim = T;
        // в петле (точки f=4) — цель в осях машины (по поверхности), полный газ
        const inLoop = R[b.ri].f === 4 || (R[b.ri + 1] && R[b.ri + 1].f === 4);
        let a;
        if (inLoop) {
            const L = R[Math.min(R.length - 1, b.ri + 1)], dx = L.x - B.p[0], dy = L.y - B.p[1], dz = L.z - B.p[2];
            a = Math.atan2(dx * B.r[0] + dy * B.r[1] + dz * B.r[2], Math.max(1, dx * B.f[0] + dy * B.f[1] + dz * B.f[2]));
        } else {
            // руль: на цель от передней оси
            const fx0 = Math.cos(B.yaw), fz0 = Math.sin(B.yaw), axle = B.spec.halfBase;
            const want = Math.atan2(T.z - (B.p[2] + fz0 * axle), T.x - (B.p[0] + fx0 * axle));
            a = want - B.yaw;
            a = Math.atan2(Math.sin(a), Math.cos(a));
        }
        if (Math.abs(a) > 1.6 && B.grounded && !inLoop) b.turnT += dt; else b.turnT = 0;
        if (b.turnT > 2.4) { this._place(b); return; }
        b.noise += dt * 0.7;
        const wobble = Math.sin(b.noise * 2.3) * (1 - b.skill) * 0.16;
        const yawRate = -B.w[1];
        const steer = Math.max(-1, Math.min(1, a * 2.4 + wobble - yawRate * 0.12));
        const vmax = B.cfg().vmax, ref = C.ref;
        const onMove = !!vg;
        // скорость точки маршрута — абсолютная (доля BOT_REF_SPEED), у быстрых машин та же: трамплины рассчитаны на неё
        const sAt = (q) => q.s * ref;
        let tgt = Math.min(vmax, Math.max(450, (onMove ? Math.min(sAt(R[b.ri]), 1500) : Math.min(sAt(R[b.ri]), sAt(R[ti]) + 0.15 * ref)) * (0.9 + 0.1 * b.skill)));
        // трамплин впереди: к точке отрыва — ровно её скорость (с ошибкой по умению), раньше — не быстрее, чем успеем сбросить
        let launch = -1, launchD = 0;
        {
            let dist = 0, prev = { x: B.p[0], z: B.p[2] };
            for (let k = b.ri; k < Math.min(R.length, b.ri + 14) && dist < 3200; k++) {
                const q = R[k];
                dist += Math.hypot(q.x - prev.x, q.z - prev.z); prev = q;
                if (q.f === 2) { launch = k; launchD = dist; break; }
            }
        }
        if (launch >= 0) {
            const need = Math.min(vmax, sAt(R[launch]) * (1 + (1 - b.skill) * 0.06 * Math.sin(b.noise * 1.7 + launch)));
            const brakeA = 2600;
            const capV = Math.sqrt(need * need + 2 * brakeA * Math.max(0, launchD - 80));
            tgt = launchD < 700 ? need : Math.min(Math.max(tgt, need), capV);
            // слишком медленно и уже близко — не дотянуть: сдать назад и разогнаться снова
            const accel = B.cfg().accel * 0.85;
            const reach = Math.sqrt(Math.max(0, B.vf) ** 2 + 2 * accel * Math.max(0, launchD - 60));
            if (b.backFor !== launch) { b.backFor = launch; b.backN = 0; }
            if (B.grounded && !onMove && reach < need * 0.86 && launchD < 1800 && b.backN < 2 && B.vf < need * 0.6) {
                b.backN++;
                b.backT = Math.min(2.2, 0.6 + (need - reach) / 1100);
            }
        }
        // поворот впереди: чем круче, тем медленнее
        {
            let turn = 0, prevYaw = B.yaw, dist = 0, prev = { x: B.p[0], z: B.p[2] };
            const span = 500 + Math.max(0, B.vf) * 0.45;
            for (let k = b.ri; k < Math.min(R.length - 1, b.ri + 10) && dist < span; k++) {
                if (R[k].f === 2 || R[k].f === 4 || R[k + 1].f === 4) break;
                const q = R[k + 1], y = Math.atan2(q.z - R[k].z, q.x - R[k].x);
                dist += Math.hypot(q.x - prev.x, q.z - prev.z); prev = q;
                let dy = y - prevYaw; dy = Math.abs(Math.atan2(Math.sin(dy), Math.cos(dy)));
                turn = Math.max(turn, dy);
            }
            const vc = 2600 * Math.max(0.22, Math.min(1, 1.05 - turn / 1.6));
            tgt = Math.min(tgt, vc);
        }
        let throttle = B.vf < tgt - 120 ? 1 : (B.vf > tgt + 160 ? -0.8 : Math.max(0.15, Math.min(1, tgt / vmax)));
        if (Math.abs(a) > 0.9 && B.grounded && !inLoop) throttle = Math.min(throttle, 0.3);
        if (inLoop || R.slice(b.ri, b.ri + 4).some(q => q.f === 4)) throttle = 1;
        b.hzT -= dt;
        const zone = this.zones.find(z => z.i1 >= b.ri && z.i0 - b.ri <= 4);
        const inZone = zone && b.ri >= zone.i0;
        if (inZone && launch < 0 && B.vf < 1500) throttle = Math.max(throttle, 0.9);        // в зоне препятствия — проскочить, но не разгоняться без предела
        if (b.hzT <= 0) {
            b.hzT = 0.08;
            const near = zone && !inZone && d2(Math.max(0, zone.i0 - 1)) < 700 * 700;
            b.hzWait = !b.reckless && ((near && !this._zoneClear(b, zone)) || (!zone && this._hazardAhead(b)));
        }
        if (b.hzWait) {
            b.waited += dt;
            if (b.waited > 7) { b.reckless = true; b.recklessT = 2.5; }
            throttle = B.vf > 150 ? -0.9 : 0; b.bestD = Infinity; b.stuckT = 0;
        } else b.waited = 0;
        if (b.recklessT > 0) { b.recklessT -= dt; if (b.recklessT <= 0) b.reckless = b.rash; }
        if (b.backT > 0) {
            b.backT -= dt; b.stuckT = 0; b.bestD = Infinity;
            B.step(dt, { throttle: B.vf > 60 ? -1 : -0.85, steer: -Math.max(-1, Math.min(1, a * 1.5)) }, hz);
            return;
        }
        // в полёте: держать машину ровно (газ/тормоз — тангаж), руль — курс на точку приземления
        let handbrake = false;
        if (inLoop && (B.grounded || B.stickT > 0)) { B.step(dt, { throttle: 1, steer: Math.max(-1, Math.min(1, a * 2)) }, hz); return; }
        if (!B.grounded) {
            const pitchErr = B.pitch - Math.max(-0.25, Math.min(0.15, Math.atan2(B.v[1], Math.max(400, B.speed())) * 0.4));
            throttle = Math.max(-1, Math.min(1, pitchErr * 3));
        } else if (Math.abs(a) > 0.7 && B.vf > 900 && b.skill > 0.75) handbrake = true;   // крутой вираж — ручником
        B.step(dt, { throttle, steer, handbrake }, hz);
    },

    _die(b, reason) {
        if (b.state !== 'ride') return;
        b.state = 'dead';
        b.deadT = 1.2 + this.rng() * 0.8;
        if (this.on.die) this.on.die(b, reason);
    },

    // Две машины как цепочки кругов вдоль корпуса: самое глубокое пересечение — нормаль и глубина.
    _overlap(A, B) {
        let best = null;
        const pts = (C) => {
            const fx = Math.cos(C.yaw), fz = Math.sin(C.yaw), half = Math.max(60, C.spec.L / 2 - C.spec.W * 0.45), n = Math.max(2, Math.round(half / 110) + 1);
            const out = [];
            for (let i = 0; i < n; i++) { const k = -half + 2 * half * i / (n - 1); out.push([C.c[0] + fx * k, C.c[2] + fz * k, C.spec.W * 0.5]); }
            return out;
        };
        for (const a of pts(A)) for (const q of pts(B)) {
            const dx = q[0] - a[0], dz = q[1] - a[1], d = Math.hypot(dx, dz), r = a[2] + q[2];
            if (d >= r || d < 1e-3) continue;
            const depth = r - d;
            if (!best || depth > best.depth) best = { nx: dx / d, nz: dz / d, depth };
        }
        return best;
    },

    // Удар машин: импульс по нормали (массы равны), раздвинуть; быстрый таран — бота закручивает и отбрасывает.
    _bump(A, B, knockB) {
        if (Math.abs(A.c[1] - B.c[1]) > 180) return null;
        const o = this._overlap(A, B);
        if (!o) return null;
        const { nx, nz, depth } = o;
        const rel = (A.v[0] - B.v[0]) * nx + (A.v[2] - B.v[2]) * nz;   // >0 — сближаются
        const push = depth * 0.5;
        A.c[0] -= nx * push; A.c[2] -= nz * push; B.c[0] += nx * push; B.c[2] += nz * push;
        A.p[0] -= nx * push; A.p[2] -= nz * push; B.p[0] += nx * push; B.p[2] += nz * push;
        if (rel > 0) {
            const j = rel * 0.6;
            A.v[0] -= nx * j; A.v[2] -= nz * j; B.v[0] += nx * j; B.v[2] += nz * j;
            const side = (nx * Math.sin(B.yaw) - nz * Math.cos(B.yaw));
            B.w[1] += side * Math.min(6, rel / 400) * (knockB ? 1.6 : 0.6);
            A.w[1] -= side * Math.min(3, rel / 800);
        }
        return { rel, nx, nz };
    },

    _touchPlayer(b, P) {
        const B = b.car;
        const hit = this._bump(P, B, !(b.invT > 0));
        if (!hit) return;
        if (hit.rel > 140 && b.bumpT <= this.time) {
            b.bumpT = this.time + 0.25;
            if (this.on.bump) this.on.bump(b, hit.rel, [(P.c[0] + B.c[0]) / 2, Math.max(P.p[1], B.p[1]) + 60, (P.c[2] + B.c[2]) / 2]);
        }
        if (hit.rel > this.cfg().knock && !(b.invT > 0) && b.knockT <= this.time) {
            b.knockT = this.time + 1;
            B.v[0] += hit.nx * hit.rel * 0.5; B.v[2] += hit.nz * hit.rel * 0.5; B.v[1] += 600;
            B.w[0] += B.f[0] * (this.rng() - 0.5) * 6; B.w[2] += B.f[2] * (this.rng() - 0.5) * 6;
            B.stun = 0.8;
            if (this.on.knock) this.on.knock(b);
        }
    },

    _touchBots() {
        const L = this.list;
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
            const a = L[i], b = L[j];
            if ((a.state !== 'ride' && a.state !== 'grid') || (b.state !== 'ride' && b.state !== 'grid')) continue;
            if (Math.abs(a.car.p[0] - b.car.p[0]) > 900 || Math.abs(a.car.p[2] - b.car.p[2]) > 900) continue;
            this._bump(a.car, b.car, false);
        }
    },

    // Вид: машина по физике, ник над ней.
    _pose(b, dt) {
        if (!b.view) return;
        b.view.pose(b.car, dt);
        b.view.effects(b.car, dt, { bot: true, on: b.state === 'ride' });
    },

    /** Ники над машинами (зовёт игра каждый кадр, когда трасса на экране). */
    tagsUpdate(show, eye) {
        if (!this.view) return;
        for (const b of this.list) {
            const tag = b.tag;
            if (!tag) continue;
            const B = b.car;
            const vis = show && b.view && b.view.visible && b.state !== 'dead';
            const dist = eye ? Math.hypot(B.p[0] - eye.x, B.p[1] - eye.y, B.p[2] - eye.z) : 0;
            const pr = vis && dist < 9000 ? this.view.projectToScreen(B.p[0], B.p[2], B.p[1] + B.spec.H + 70) : null;
            if (!pr || !pr.visible || pr.behind) { tag.classList.add('off'); continue; }
            tag.classList.remove('off');
            const k = Math.max(0.55, Math.min(1.1, 1400 / Math.max(400, dist)));
            tag.style.transform = `translate(${pr.x.toFixed(1)}px, ${pr.y.toFixed(1)}px) translate(-50%, -100%) scale(${k.toFixed(3)})`;
        }
    },
};
