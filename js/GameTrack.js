// GameTrack.js — как выглядит трасса и мир вокруг. Логика трассы — ObbyCourse (коллайдеры, движение, этапы); здесь
// только вид: асфальт сверху, красно-белые бортики по кромкам, бетонные бока; сегменты одной дуги или петли (arc=N)
// рисуются одной гладкой лентой (физика — бруски); трамплины со шевронами, ускорители, катящиеся шины (модель
// props/tire.glb), вертушки и молоты; ворота чекпоинтов и финиша (props/*_gate.glb), разметка старта и решётки.
// Мир: небо-купол, далеко внизу — побережье с городом (текстура рисуется кодом по зерну уровня), здания, корабли,
// облака между трассой и землёй; парящий подиум гаража. Решений вид не принимает (инвариант 4).

const TRACK_CURB = 70;            // px: ширина бортика на кромке
const TRACK_CURB_STRIPE = 180;    // px: длина полосы бортика
const TRACK_TILE = 900;           // px: повтор текстуры асфальта
const TRACK_DROP = 27000;         // px: на сколько ниже самой низкой опоры трассы лежит земля с городом
const TRACK_MAP_AREA = 260000;    // px: сторона нарисованной карты побережья

/** @satisfies {Record<string, any>} */
const Track = {
    /** @type {any} */ app: null,
    /** @type {any} */ view: null,
    /** @type {any[]} */ meshes: [],
    /** @type {any[]} */ nodes: [],
    /** @type {any[]} */ gates: [],
    /** @type {Record<string, any>} */ mats: {},
    /** @type {any} */ sky: null,
    /** @type {any[]} */ clouds: [],
    /** @type {any[]} */ ships: [],
    /** @type {any} */ podium: null,
    /** @type {any} */ garage: null,
    groundY: 0,
    _stage: 0,
    time: 0,

    // ---------------------------------------------------------------------------------------------
    // Постройка (под экраном загрузки уровня; ObbyCourse.build уже вызван)
    // ---------------------------------------------------------------------------------------------

    async build(app, levelIndex) {
        this.clear();
        this.app = app;
        const view = this.view = app.location.view;
        const scene = view.scene;
        view.camera.minZ = 20;
        view.camera.maxZ = 140000;
        this._hideGround(app.location.terrain);
        this._makeMaterials(scene);
        const C = ObbyCourse;
        const chunk = 6000;
        /** @type {Map<string, any>} */
        const chunks = new Map();
        /** @type {Map<number, any[]>} */
        const arcs = new Map();
        for (const p of C.pieces) {
            if (p.type === 'arrow') continue;
            if (p.dynamic) { await this._buildDynamic(view, p); continue; }
            if (p.prm.arc) { const k = p.prm.arc; if (!arcs.has(k)) arcs.set(k, []); arcs.get(k).push(p); continue; }
            const key = Math.floor(p.O[0] / chunk) + ',' + Math.floor(p.O[2] / chunk);
            let b = chunks.get(key);
            if (!b) { b = this._builder(); chunks.set(key, b); }
            b.setTransform(p.O, p.ax, p.ay, p.az);
            this._geometry(b, p);
        }
        for (const list of arcs.values()) {
            const b = this._builder();
            this._ribbon(b, list.sort((a, c) => (a.prm.seg || 0) - (c.prm.seg || 0)));
            for (const m of b.toMeshes(scene, this.mats, 'arc')) this._register(view, m, true);
        }
        for (const b of chunks.values()) for (const m of b.toMeshes(scene, this.mats, 'track')) this._register(view, m, true);
        this._startPaint(view);
        await this._gates(view);
        await this._scenery(view, levelIndex || 0);
        await this._buildPodium(view);
        this.setStage(0);
        this.update(0, null);
        return this;
    },

    clear() {
        const view = this.view;
        for (const m of this.meshes) { try { if (view) World3D.removeObject(view, m); m.dispose(false, false); } catch (e) { /* уже */ } }
        for (const k in this.mats) { try { this.mats[k].dispose(false, true); } catch (e) { /* уже */ } }
        this.meshes = []; this.nodes = []; this.gates = []; this.mats = {}; this.clouds = []; this.ships = [];
        this.sky = null; this.podium = null; this.garage = null; this._stage = 0;
    },

    _hideGround(terrain) {
        const t = /** @type {any} */ (terrain);
        if (!t) return;
        for (const m of t.meshes || []) if (m && m.setEnabled) m.setEnabled(false);
        for (const m of [t.mesh, t.outer]) if (m && m.setEnabled) m.setEnabled(false);
        for (const w of t.waters || []) if (w && w.mesh && w.mesh.setEnabled) w.mesh.setEnabled(false);
    },

    _register(view, mesh, isStatic, opts) {
        mesh.isPickable = false;
        if (isStatic) { mesh.freezeWorldMatrix(); mesh.doNotSyncBoundingInfo = true; }
        World3D.addObject(view, mesh, 'prop', Object.assign({ outline: false, ink: false }, opts || {}));
        this.meshes.push(mesh);
        return mesh;
    },

    // ---------------------------------------------------------------------------------------------
    // Материалы: текстуры рисуются на холсте (нет холста — ровный цвет, сцена не падает)
    // ---------------------------------------------------------------------------------------------

    _tex(scene, name, w, h, draw) {
        try {
            const t = new BABYLON.DynamicTexture('trk-' + name, { width: w, height: h || w }, scene, true);
            const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (t.getContext()));
            if (!ctx) { t.dispose(); return null; }
            draw(ctx, w, h || w);
            t.update(true);
            t.wrapU = t.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
            t.anisotropicFilteringLevel = 8;
            return t;
        } catch (e) { return null; }
    },

    _makeMaterials(scene) {
        const std = (name, hex, spec) => {
            const m = new BABYLON.StandardMaterial('trk-' + name, scene);
            m.diffuseColor = BABYLON.Color3.FromHexString(hex);
            m.specularColor = new BABYLON.Color3(spec || 0.05, spec || 0.05, spec || 0.05);
            m.backFaceCulling = false;
            this.mats[name] = m;
            return m;
        };
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        // асфальт: фото-текстура (Poly Haven, CC0) чуть темнее; пока грузится — ровный серый
        const asphalt = std('asphalt', '#5d6066', 0.08);
        try {
            const t = new BABYLON.Texture('assets/textures/asphalt.webp', scene, false, true, BABYLON.Texture.TRILINEAR_SAMPLINGMODE, null, () => { asphalt.diffuseTexture = null; });
            t.anisotropicFilteringLevel = 8;
            asphalt.diffuseTexture = t;
            asphalt.diffuseColor = new BABYLON.Color3(1.75, 1.75, 1.8);   // фото тёмное: светлее, как серый асфальт трассы
        } catch (e) { /* без текстуры — цвет */ }
        const concrete = std('concrete', '#c9c6be');
        const ct = this._tex(scene, 'concrete', 256, 256, (ctx, n) => {
            ctx.fillStyle = '#c4c1b9'; ctx.fillRect(0, 0, n, n);
            for (let i = 0; i < 1800; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 2, 1 + rnd() * 2); }
            ctx.fillStyle = 'rgba(60,55,50,0.25)'; ctx.fillRect(0, 0, n, 2); ctx.fillRect(0, 0, 2, n);
        });
        if (ct) { concrete.diffuseTexture = ct; concrete.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        // бок плиты: бетон с поясом-плинтусом
        const side = std('side', '#8d8a84');
        const st = this._tex(scene, 'side', 256, 256, (ctx, n) => {
            const g = ctx.createLinearGradient(0, 0, 0, n); g.addColorStop(0, '#a9a59d'); g.addColorStop(1, '#7c7972');
            ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
            for (let i = 0; i < 1400; i++) { ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 2, 1 + rnd() * 2); }
            ctx.fillStyle = 'rgba(40,38,35,0.35)'; ctx.fillRect(0, 0, 3, n);
        });
        if (st) { side.diffuseTexture = st; side.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        // бортик: красно-белые полосы вдоль (u — длина)
        const curb = std('curb', '#e8e8e8', 0.12);
        const cbt = this._tex(scene, 'curb', 128, 32, (ctx, w, h) => {
            ctx.fillStyle = '#f2f2f0'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#d7262b'; ctx.fillRect(0, 0, w / 2, h);
            ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, h - 3, w, 3);
        });
        if (cbt) { curb.diffuseTexture = cbt; curb.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        // трамплин: асфальт с лаймовыми шевронами по ходу
        const ramp = std('ramp', '#5d6066', 0.08);
        const rt = this._tex(scene, 'ramp', 256, 256, (ctx, n) => {
            ctx.fillStyle = '#55585e'; ctx.fillRect(0, 0, n, n);
            for (let i = 0; i < 2200; i++) { ctx.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.07)'; ctx.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 1.5, 1 + rnd() * 1.5); }
            ctx.fillStyle = '#c5ef5c';
            for (const y0 of [0.15, 0.6]) {
                ctx.beginPath();
                ctx.moveTo(n * 0.15, n * y0); ctx.lineTo(n * 0.5, n * (y0 + 0.22)); ctx.lineTo(n * 0.85, n * y0);
                ctx.lineTo(n * 0.85, n * (y0 + 0.1)); ctx.lineTo(n * 0.5, n * (y0 + 0.32)); ctx.lineTo(n * 0.15, n * (y0 + 0.1)); ctx.closePath(); ctx.fill();
            }
        });
        if (rt) { ramp.diffuseTexture = rt; ramp.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        const ice = std('ice', '#d6f6ff', 0.6); ice.specularPower = 48;
        // металлическая плита (паром): рифление и лаймовая кайма
        const metal = std('metal', '#9aa3ad', 0.4);
        const mt = this._tex(scene, 'metal', 256, 256, (ctx, n) => {
            ctx.fillStyle = '#8f98a2'; ctx.fillRect(0, 0, n, n);
            ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3;
            for (let y = 8; y < n; y += 24) for (let x = (y / 24 % 2) * 12; x < n; x += 24) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 6); ctx.stroke(); }
            ctx.fillStyle = '#c5ef5c'; ctx.fillRect(0, 0, n, 10); ctx.fillRect(0, n - 10, n, 10);
        });
        if (mt) { metal.diffuseTexture = mt; metal.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        // разметка-предупреждение: жёлто-графитовые диагонали
        const hazard = std('hazard', '#f5c400');
        const ht = this._tex(scene, 'hazard', 128, 128, (ctx, n) => {
            ctx.fillStyle = '#f2c200'; ctx.fillRect(0, 0, n, n);
            ctx.fillStyle = '#22252b';
            for (let k = -n; k < n * 2; k += 64) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 32, 0); ctx.lineTo(k + 32 - n, n); ctx.lineTo(k - n, n); ctx.closePath(); ctx.fill(); }
        });
        if (ht) { hazard.diffuseTexture = ht; hazard.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        const kill = std('kill', '#ff4a1c'); kill.emissiveColor = new BABYLON.Color3(0.9, 0.25, 0.05); kill.metadata = { toon: false };
        // ускоритель: лаймовые стрелки бегут вперёд
        const boost = std('boost', '#c5ef5c'); boost.emissiveColor = new BABYLON.Color3(0.35, 0.45, 0.15);
        const bt = this._tex(scene, 'boost', 256, 128, (ctx, w, h) => {
            ctx.fillStyle = '#22252b'; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#c5ef5c';
            for (const ox of [0, w / 2]) { ctx.beginPath(); ctx.moveTo(ox + 10, h * 0.1); ctx.lineTo(ox + w * 0.3, h * 0.5); ctx.lineTo(ox + 10, h * 0.9); ctx.lineTo(ox + 50, h * 0.9); ctx.lineTo(ox + w * 0.3 + 40, h * 0.5); ctx.lineTo(ox + 50, h * 0.1); ctx.closePath(); ctx.fill(); }
        });
        if (bt) { boost.diffuseTexture = bt; boost.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        const jump = std('jump', '#ff4fa3'); jump.emissiveColor = new BABYLON.Color3(0.2, 0.1, 0.15);
        const pillar = std('pillar', '#f0f0ee');
        const pt = this._tex(scene, 'pillar', 64, 256, (ctx, w, h) => {
            for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#f0f0ee' : '#d7262b'; ctx.fillRect(0, i * h / 4, w, h / 4); }
        });
        if (pt) { pillar.diffuseTexture = pt; pillar.diffuseColor = new BABYLON.Color3(1, 1, 1); }
        std('post', '#e9ecef', 0.2);
        const bar = std('bar', '#d7262b'); bar.emissiveColor = new BABYLON.Color3(0.15, 0.02, 0.02);
        std('arm', '#9fb4c8'); std('head', '#2b2e35', 0.3); std('pivot', '#2b2e35');
        const paint = std('paint', '#f4f4f0'); paint.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.25);
        const checker = std('checker', '#ffffff');
        const cht = this._tex(scene, 'checker', 128, 128, (ctx, n) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { ctx.fillStyle = (x + y) % 2 ? '#14141c' : '#ffffff'; ctx.fillRect(x * n / 4, y * n / 4, n / 4, n / 4); } });
        if (cht) checker.diffuseTexture = cht;
        const lime = std('lime', '#c5ef5c'); lime.emissiveColor = new BABYLON.Color3(0.45, 0.6, 0.18); lime.metadata = { toon: false };
        void concrete;
    },

    // ---------------------------------------------------------------------------------------------
    // Геометрия (как у ObbyCourseView: многоугольники в локальных осях детали, пачки по материалам)
    // ---------------------------------------------------------------------------------------------

    _builder() {
        /** @type {Record<string, { pos: number[], nrm: number[], uv: number[], idx: number[] }>} */
        const bufs = {};
        let O = [0, 0, 0], AX = [1, 0, 0], AY = [0, 1, 0], AZ = [0, 0, 1];
        const tp = (p) => [O[0] + p[0] * AX[0] + p[1] * AY[0] + p[2] * AZ[0], O[1] + p[0] * AX[1] + p[1] * AY[1] + p[2] * AZ[1], O[2] + p[0] * AX[2] + p[1] * AY[2] + p[2] * AZ[2]];
        const tn = (n) => [n[0] * AX[0] + n[1] * AY[0] + n[2] * AZ[0], n[0] * AX[1] + n[1] * AY[1] + n[2] * AZ[1], n[0] * AX[2] + n[1] * AY[2] + n[2] * AZ[2]];
        const buf = (key) => bufs[key] || (bufs[key] = { pos: [], nrm: [], uv: [], idx: [] });
        return {
            setTransform(o, ax, ay, az) { O = o; AX = ax; AY = ay; AZ = az; },
            identity() { O = [0, 0, 0]; AX = [1, 0, 0]; AY = [0, 1, 0]; AZ = [0, 0, 1]; },
            poly(key, pts, nrms, uvs) {
                const b = buf(key), base = b.pos.length / 3;
                for (let i = 0; i < pts.length; i++) {
                    const p = tp(pts[i]), n = tn(Array.isArray(nrms[0]) ? nrms[i] : nrms);
                    b.pos.push(p[0], p[1], p[2]); b.nrm.push(n[0], n[1], n[2]); b.uv.push(uvs[i][0], uvs[i][1]);
                }
                for (let i = 1; i + 1 < pts.length; i++) b.idx.push(base, base + i, base + i + 1);
            },
            toMeshes(scene, mats, name) {
                const out = [];
                for (const key of Object.keys(bufs)) {
                    const b = bufs[key];
                    if (!b.idx.length) continue;
                    const mesh = new BABYLON.Mesh(name + '-' + key, scene);
                    const vd = new BABYLON.VertexData();
                    vd.positions = b.pos; vd.normals = b.nrm; vd.uvs = b.uv; vd.indices = b.idx;
                    vd.applyToMesh(mesh, false);
                    mesh.material = mats[key] || mats.side;
                    out.push(mesh);
                }
                return out;
            },
        };
    },

    _topKey(p) {
        if (p.def && /^start/.test(p.def.name || '')) return 'asphalt';
        return ({ white: 'concrete', ice: 'ice', yellow: 'hazard', mint: 'metal' })[p.color] || 'asphalt';
    },

    _geometry(b, p) {
        const hx = p.sx / 2, hz = p.sz / 2;
        const curb = p.prm.curb !== 0 && !p.prm.loop;
        switch (p.type) {
            case 'box': this._slab(b, hx, -p.sy, 0, hz, this._topKey(p), curb && hz > 160); break;
            case 'kill': case 'lava': case 'water': this._box(b, hx, -p.sy, 0, hz, 'kill', 'kill'); break;
            case 'cyl': this._cyl(b, hx, hz, -p.sy, 0, 36, this._topKey(p), curb && hx > 200); break;
            case 'ramp': this._wedge(b, hx, p.sy, hz, curb && hz > 160); break;
            case 'arch': this._arch(b, hx, p.sy, hz, 28, curb && hz > 160); break;
            case 'boost': this._box(b, hx, 0, 6, hz, 'boost', 'side'); break;
            case 'jump': this._cyl(b, hx, hz, 0, 14, 30, 'jump', false); break;
            case 'pillar': this._box(b, hx, 0, p.sy, hz, 'pillar', 'pillar', true); break;
            case 'fence': this._box(b, hx, 0, 46, 6, 'curb', 'curb'); break;
            case 'spinner': this._cylRaw(b, 26, 26, 0, p.sy + 26, 14, 'post'); break;
            case 'hammer': this._box(b, 16, -16, 16, 16, 'pivot', 'pivot'); break;
            default: this._slab(b, hx, -p.sy, 0, hz, this._topKey(p), false);
        }
    },

    // Плита дороги: верх (асфальт, мировые UV), бортики по длинным кромкам (верх и пояс на боку), бетонные бока.
    _slab(b, hx, y0, y1, hz, topKey, curbs) {
        const S = TRACK_TILE, cw = curbs ? Math.min(TRACK_CURB, hz * 0.12) : 0, P = TRACK_CURB_STRIPE * 2;
        const uv = (x, z) => [(x + hx) / S, (z + hz) / S];
        const iz = hz - cw;
        b.poly(topKey, [[-hx, y1, -iz], [-hx, y1, iz], [hx, y1, iz], [hx, y1, -iz]], [0, 1, 0], [uv(-hx, -iz), uv(-hx, iz), uv(hx, iz), uv(hx, -iz)]);
        if (cw > 0) {
            for (const s of [-1, 1]) {
                const za = s * iz, zb = s * hz;
                const q = [[-hx, y1 + 0.5, za], [-hx, y1 + 0.5, zb], [hx, y1 + 0.5, zb], [hx, y1 + 0.5, za]];
                b.poly('curb', s > 0 ? q : q.slice().reverse(), [0, 1, 0], (s > 0 ? [[0, 0], [0, 1], [2 * hx / P, 1], [2 * hx / P, 0]] : [[2 * hx / P, 0], [2 * hx / P, 1], [0, 1], [0, 0]]));
            }
        }
        const band = cw > 0 ? Math.min(34, (y1 - y0) * 0.4) : 0;
        const k = 1 / 256;
        // бока по длине: пояс бортика сверху, ниже бетон
        for (const s of [-1, 1]) {
            const z = s * hz, n = [0, 0, s];
            const face = (ya, yb, key, uvs) => { const q = [[-hx, ya, z], [-hx, yb, z], [hx, yb, z], [hx, ya, z]]; b.poly(key, s > 0 ? q : q.slice().reverse(), n, s > 0 ? uvs : uvs.slice().reverse()); };
            face(y0, y1 - band, 'side', [[0, y0 * k], [0, (y1 - band) * k], [2 * hx * k, (y1 - band) * k], [2 * hx * k, y0 * k]]);
            if (band > 0) face(y1 - band, y1, 'curb', [[0, 0], [0, 1], [2 * hx / P, 1], [2 * hx / P, 0]]);
        }
        b.poly('side', [[hx, y0, -hz], [hx, y1, -hz], [hx, y1, hz], [hx, y0, hz]], [1, 0, 0], [[0, y0 * k], [0, y1 * k], [2 * hz * k, y1 * k], [2 * hz * k, y0 * k]]);
        b.poly('side', [[-hx, y0, hz], [-hx, y1, hz], [-hx, y1, -hz], [-hx, y0, -hz]], [-1, 0, 0], [[0, y0 * k], [0, y1 * k], [2 * hz * k, y1 * k], [2 * hz * k, y0 * k]]);
        b.poly('side', [[-hx, y0, -hz], [hx, y0, -hz], [hx, y0, hz], [-hx, y0, hz]], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    },

    _box(b, hx, y0, y1, hz, topKey, sideKey, vStripes) {
        const S = TRACK_TILE, k = 1 / 256;
        const uvTop = (x, z) => [(x + hx) / S, (z + hz) / S];
        b.poly(topKey, [[-hx, y1, -hz], [-hx, y1, hz], [hx, y1, hz], [hx, y1, -hz]], [0, 1, 0], [uvTop(-hx, -hz), uvTop(-hx, hz), uvTop(hx, hz), uvTop(hx, -hz)]);
        b.poly(sideKey, [[-hx, y0, -hz], [hx, y0, -hz], [hx, y0, hz], [-hx, y0, hz]], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        const v = (y) => (vStripes ? (y - y0) / Math.max(1, y1 - y0) * Math.max(1, Math.round((y1 - y0) / 240)) : y * k);
        b.poly(sideKey, [[hx, y0, -hz], [hx, y1, -hz], [hx, y1, hz], [hx, y0, hz]], [1, 0, 0], [[0, v(y0)], [0, v(y1)], [1, v(y1)], [1, v(y0)]]);
        b.poly(sideKey, [[-hx, y0, hz], [-hx, y1, hz], [-hx, y1, -hz], [-hx, y0, -hz]], [-1, 0, 0], [[0, v(y0)], [0, v(y1)], [1, v(y1)], [1, v(y0)]]);
        b.poly(sideKey, [[hx, y0, hz], [hx, y1, hz], [-hx, y1, hz], [-hx, y0, hz]], [0, 0, 1], [[0, v(y0)], [0, v(y1)], [1, v(y1)], [1, v(y0)]]);
        b.poly(sideKey, [[-hx, y0, -hz], [-hx, y1, -hz], [hx, y1, -hz], [hx, y0, -hz]], [0, 0, -1], [[0, v(y0)], [0, v(y1)], [1, v(y1)], [1, v(y0)]]);
    },

    _cylRaw(b, rx, rz, y0, y1, seg, key) {
        const ring = [];
        for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2; ring.push([Math.cos(a), Math.sin(a)]); }
        b.poly(key, ring.map(([c, s]) => [c * rx, y1, s * rz]).reverse(), [0, 1, 0], ring.map(([c, s]) => [c, s]).reverse());
        for (let i = 0; i < seg; i++) {
            const [c0, s0] = ring[i], [c1, s1] = ring[(i + 1) % seg];
            b.poly(key, [[c0 * rx, y0, s0 * rz], [c0 * rx, y1, s0 * rz], [c1 * rx, y1, s1 * rz], [c1 * rx, y0, s1 * rz]], [[c0, 0, s0], [c0, 0, s0], [c1, 0, s1], [c1, 0, s1]], [[i / seg, 0], [i / seg, 1], [(i + 1) / seg, 1], [(i + 1) / seg, 0]]);
        }
    },

    // Круглая площадка: верх, кольцо бортика, бетонный бок.
    _cyl(b, rx, rz, y0, y1, seg, topKey, curbs) {
        const S = TRACK_TILE, ring = [];
        for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2; ring.push([Math.cos(a), Math.sin(a)]); }
        const cw = curbs ? TRACK_CURB : 0, kx = (rx - cw) / rx, kz = (rz - cw) / rz;
        const uv = (x, z) => [(x + rx) / S, (z + rz) / S];
        b.poly(topKey, ring.map(([c, s]) => [c * rx * kx, y1, s * rz * kz]).reverse(), [0, 1, 0], ring.map(([c, s]) => uv(c * rx * kx, s * rz * kz)).reverse());
        const per = 2 * Math.PI * rx / (TRACK_CURB_STRIPE * 2);
        for (let i = 0; i < seg; i++) {
            const [c0, s0] = ring[i], [c1, s1] = ring[(i + 1) % seg];
            if (cw > 0) b.poly('curb', [[c1 * rx, y1 + 0.5, s1 * rz], [c1 * rx * kx, y1 + 0.5, s1 * rz * kz], [c0 * rx * kx, y1 + 0.5, s0 * rz * kz], [c0 * rx, y1 + 0.5, s0 * rz]], [0, 1, 0],
                [[(i + 1) / seg * per, 1], [(i + 1) / seg * per, 0], [i / seg * per, 0], [i / seg * per, 1]]);
            b.poly('side', [[c0 * rx, y0, s0 * rz], [c0 * rx, y1, s0 * rz], [c1 * rx, y1, s1 * rz], [c1 * rx, y0, s1 * rz]], [[c0, 0, s0], [c0, 0, s0], [c1, 0, s1], [c1, 0, s1]],
                [[i / seg * 8, y0 / 256], [i / seg * 8, y1 / 256], [(i + 1) / seg * 8, y1 / 256], [(i + 1) / seg * 8, y0 / 256]]);
        }
        b.poly('side', ring.map(([c, s]) => [c * rx, y0, s * rz]), [0, -1, 0], ring.map(([c, s]) => [c, s]));
    },

    // Трамплин-клин: верх со шевронами, бортики по бокам, бетонные бока.
    _wedge(b, hx, sy, hz, curbs) {
        const len = Math.hypot(2 * hx, sy), n = [-sy / len, 2 * hx / len, 0];
        const cw = curbs ? Math.min(TRACK_CURB, hz * 0.12) : 0, iz = hz - cw, P = TRACK_CURB_STRIPE * 2;
        const vLen = len / Math.max(300, Math.min(700, 2 * hz));
        b.poly('ramp', [[-hx, 0, -iz], [-hx, 0, iz], [hx, sy, iz], [hx, sy, -iz]], n, [[0, 0], [1, 0], [1, vLen], [0, vLen]].map(([u, v]) => [u, v]));
        if (cw > 0) for (const s of [-1, 1]) {
            const za = s * iz, zb = s * hz, lift = 0.6;
            const q = [[-hx, lift, za], [-hx, lift, zb], [hx, sy + lift, zb], [hx, sy + lift, za]];
            b.poly('curb', s > 0 ? q : q.slice().reverse(), n, s > 0 ? [[0, 0], [0, 1], [len / P, 1], [len / P, 0]] : [[len / P, 0], [len / P, 1], [0, 1], [0, 0]]);
        }
        b.poly('side', [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz]], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        b.poly('side', [[hx, 0, -hz], [hx, sy, -hz], [hx, sy, hz], [hx, 0, hz]], [1, 0, 0], [[0, 0], [0, sy / 256], [2 * hz / 256, sy / 256], [2 * hz / 256, 0]]);
        b.poly('curb', [[-hx, 0, hz], [hx, 0, hz], [hx, sy, hz]], [0, 0, 1], [[0, 0], [len / P, 0], [len / P, 1]]);
        b.poly('curb', [[-hx, 0, -hz], [hx, sy, -hz], [hx, 0, -hz]], [0, 0, -1], [[0, 0], [len / P, 1], [len / P, 0]]);
    },

    _arch(b, hx, sy, hz, seg, curbs) {
        const pts = [];
        let arc = 0;
        for (let i = 0; i <= seg; i++) {
            const X = -1 + 2 * i / seg, x = X * hx, y = sy * (0.5 + 0.5 * Math.cos(Math.PI * X));
            if (i) arc += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
            const slope = -0.5 * Math.PI * Math.sin(Math.PI * X) * sy / hx, l = Math.hypot(slope, 1);
            pts.push({ x, y, nx: -slope / l, ny: 1 / l, u: arc / TRACK_TILE, c: arc / (TRACK_CURB_STRIPE * 2) });
        }
        const cw = curbs ? Math.min(TRACK_CURB, hz * 0.12) : 0, iz = hz - cw;
        for (let i = 0; i < seg; i++) {
            const a = pts[i], c = pts[i + 1];
            const na = [a.nx, a.ny, 0], nc = [c.nx, c.ny, 0];
            b.poly('asphalt', [[a.x, a.y, -iz], [a.x, a.y, iz], [c.x, c.y, iz], [c.x, c.y, -iz]], [na, na, nc, nc], [[a.u, 0], [a.u, 2 * iz / TRACK_TILE], [c.u, 2 * iz / TRACK_TILE], [c.u, 0]]);
            if (cw > 0) for (const s of [-1, 1]) {
                const q = [[a.x, a.y + 0.5, s * iz], [a.x, a.y + 0.5, s * hz], [c.x, c.y + 0.5, s * hz], [c.x, c.y + 0.5, s * iz]];
                b.poly('curb', s > 0 ? q : q.slice().reverse(), s > 0 ? [na, na, nc, nc] : [nc, nc, na, na], s > 0 ? [[a.c, 0], [a.c, 1], [c.c, 1], [c.c, 0]] : [[c.c, 0], [c.c, 1], [a.c, 1], [a.c, 0]]);
            }
        }
        b.poly('side', [[-hx, 0, -hz], [hx, 0, -hz], [hx, 0, hz], [-hx, 0, hz]], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        const side = (zz, nz) => {
            for (let i = 0; i < seg; i++) {
                const a = pts[i], c = pts[i + 1], tri = [[0, 0, zz], [a.x, a.y, zz], [c.x, c.y, zz]];
                b.poly('side', nz > 0 ? tri : tri.reverse(), [0, 0, nz], [[0, 0], [a.x / 256, a.y / 256], [c.x / 256, c.y / 256]]);
            }
        };
        side(hz, 1); side(-hz, -1);
    },

    // Лента дуги или петли: сегменты-бруски одной группы arc=N — одна гладкая поверхность (в мире).
    _ribbon(b, list) {
        b.identity();
        const add = (a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]];
        const sc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
        const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
        const hz = list[0].sz / 2, th = list[0].sy;
        const curbs = list[0].prm.curb !== 0;
        const P = [], L = [], N = [];
        for (let i = 0; i < list.length; i++) {
            const p = list[i], A = add(p.O, sc(p.ax, -p.sx / 2)), B = add(p.O, sc(p.ax, p.sx / 2));
            if (i === 0) { P.push(A); L.push(p.az); N.push(p.ay); }
            else { const q = list[i - 1]; const Bq = add(q.O, sc(q.ax, q.sx / 2)); P[P.length - 1] = sc(add(Bq, A), 0.5); L[L.length - 1] = norm(add(q.az, p.az)); N[N.length - 1] = norm(add(q.ay, p.ay)); }
            P.push(B); L.push(p.az); N.push(p.ay);
        }
        const cw = curbs ? Math.min(TRACK_CURB, hz * 0.12) : 0, iz = hz - cw;
        let u = 0;
        const PS = TRACK_CURB_STRIPE * 2;
        for (let i = 0; i + 1 < P.length; i++) {
            const a = P[i], c = P[i + 1], la = L[i], lc = L[i + 1], na = N[i], nc = N[i + 1];
            const d = Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]), u1 = u + d;
            const at = (p, l, z, n, lift) => add(add(p, sc(l, z)), sc(n, lift || 0));
            b.poly('asphalt', [at(a, la, -iz, na), at(a, la, iz, na), at(c, lc, iz, nc), at(c, lc, -iz, nc)], [na, na, nc, nc],
                [[u / TRACK_TILE, 0], [u / TRACK_TILE, 2 * iz / TRACK_TILE], [u1 / TRACK_TILE, 2 * iz / TRACK_TILE], [u1 / TRACK_TILE, 0]]);
            if (cw > 0) {
                b.poly('curb', [at(a, la, iz, na, 0.6), at(a, la, hz, na, 0.6), at(c, lc, hz, nc, 0.6), at(c, lc, iz, nc, 0.6)], [na, na, nc, nc], [[u / PS, 0], [u / PS, 1], [u1 / PS, 1], [u1 / PS, 0]]);
                b.poly('curb', [at(c, lc, -iz, nc, 0.6), at(c, lc, -hz, nc, 0.6), at(a, la, -hz, na, 0.6), at(a, la, -iz, na, 0.6)], [nc, nc, na, na], [[u1 / PS, 0], [u1 / PS, 1], [u / PS, 1], [u / PS, 0]]);
            }
            // бока и низ
            const dn = (p, n) => add(p, sc(n, -th));
            for (const s of [-1, 1]) {
                const ea = at(a, la, s * hz, na), ec = at(c, lc, s * hz, nc);
                const q = [dn(ea, na), ea, ec, dn(ec, nc)];
                const ln = sc(la, s);
                b.poly('side', s > 0 ? q : q.slice().reverse(), ln, s > 0 ? [[u / 256, -th / 256], [u / 256, 0], [u1 / 256, 0], [u1 / 256, -th / 256]] : [[u1 / 256, -th / 256], [u1 / 256, 0], [u / 256, 0], [u / 256, -th / 256]]);
            }
            const ba = dn(at(a, la, -hz, na), na), bb = dn(at(a, la, hz, na), na), bc = dn(at(c, lc, hz, nc), nc), bd = dn(at(c, lc, -hz, nc), nc);
            b.poly('side', [bd, bc, bb, ba], sc(na, -1), [[0, 0], [1, 0], [1, 1], [0, 1]]);
            u = u1;
        }
        // торцы
        for (const [i, s] of [[0, -1], [P.length - 1, 1]]) {
            const p = P[i], l = L[i], n = N[i];
            const a = add(p, sc(l, -hz)), c = add(p, sc(l, hz));
            const q = [add(a, sc(n, -th)), a, c, add(c, sc(n, -th))];
            const f = list[s < 0 ? 0 : list.length - 1].ax;
            b.poly('side', s > 0 ? q : q.slice().reverse(), sc(f, s), [[0, 0], [0, 1], [1, 1], [1, 0]]);
        }
    },

    // ---------------------------------------------------------------------------------------------
    // Подвижные детали: свой корень, поза ставится в update
    // ---------------------------------------------------------------------------------------------

    async _buildDynamic(view, p) {
        const scene = view.scene;
        const root = new BABYLON.Mesh('dyn-' + p.type, scene);
        root.rotationQuaternion = new BABYLON.Quaternion();
        const make = (fill, parent) => {
            const b = this._builder(); fill(b);
            for (const m of b.toMeshes(scene, this.mats, 'dyn')) { m.parent = parent || root; m.isPickable = false; }
        };
        let bar = null, arm = null, tire = null;
        if (p.prm.tire) {
            // огромная шина: модель props/tire.glb (Ø 1 м, ось Y Blender) под размер детали; нет файла — цилиндр
            tire = new BABYLON.Mesh('tire-spin', scene);
            tire.parent = root;
            tire.rotationQuaternion = new BABYLON.Quaternion();
            try {
                const model = await Model3D.load('assets/models/props/tire.glb');
                const mesh = Model3D.build(model, scene, { name: 'tire' });
                mesh.parent = tire;
                // ось шины: Blender Y -> локальная Z модели; деталь — цилиндр с осью локальной Y (верх в 0, низ в −sy)
                const s = p.sx / 100;
                mesh.scaling.set(s, s, p.sy / 42);
                mesh.rotation.x = Math.PI / 2;
                mesh.position.y = -p.sy / 2;
                for (const m of mesh.getChildMeshes(false)) m.isPickable = false;
            } catch (e) {
                make(b => this._cylRaw(b, p.sx / 2, p.sx / 2, -p.sy, 0, 28, 'head'), tire);
            }
        } else if (p.type === 'spinner') {
            make(b => this._cylRaw(b, 26, 26, 0, p.sy + 26, 14, 'post'));
            bar = new BABYLON.Mesh('spinner-bar', scene);
            bar.parent = root;
            bar.rotationQuaternion = new BABYLON.Quaternion();
            const t = Math.max(18, p.sz / 2);
            make(b => this._box(b, p.sx / 2, p.sy - t, p.sy + t, t, 'bar', 'bar'), bar);
        } else if (p.type === 'hammer') {
            make(b => this._box(b, 18, -18, 18, 18, 'pivot', 'pivot'));
            arm = new BABYLON.Mesh('hammer-swing', scene);
            arm.parent = root;
            arm.rotationQuaternion = new BABYLON.Quaternion();
            make(b => this._box(b, 10, -p.sy, 0, 10, 'arm', 'arm'), arm);
            const head = BABYLON.MeshBuilder.CreateCylinder('hammer-head', { diameter: p.sx, height: p.sz, tessellation: 22 }, scene);
            head.material = this.mats.head;
            head.parent = arm;
            head.rotation.x = Math.PI / 2;
            head.position.y = -p.sy;
            head.isPickable = false;
        } else {
            make(b => this._geometry(b, p));
        }
        World3D.addObject(view, root, 'prop', { outline: false, ink: false });
        this.meshes.push(root);
        this.nodes.push({ p, root, bar, arm, tire, roll: 0, lastX: null });
    },

    // ---------------------------------------------------------------------------------------------
    // Старт: линия старта и слоты решётки — краской на асфальте
    // ---------------------------------------------------------------------------------------------

    _startPaint(view) {
        const scene = view.scene, sp = ObbyCourse.respawn(0);
        const b = this._builder();
        const fx = Math.cos(sp.yaw), fz = Math.sin(sp.yaw), rx = -fz, rz = fx;
        const y = sp.y - (typeof OBBY_RESPAWN_LIFT !== 'undefined' ? OBBY_RESPAWN_LIFT : 30) + 1.2;
        const pt = (along, lat) => [sp.x + fx * along + rx * lat, y, sp.z + fz * along + rz * lat];
        const quad = (key, a0, a1, l0, l1, u) => b.poly(key, [pt(a0, l0), pt(a0, l1), pt(a1, l1), pt(a1, l0)], [0, 1, 0], u || [[0, 0], [0, 1], [1, 1], [1, 0]]);
        // шахматная линия старта поперёк дороги перед машиной
        const half = 500;
        quad('checker', 300, 380, -half, half, [[0, 0], [0, 12], [1, 12], [1, 0]]);
        // рамки слотов: игрок и 4 бота
        const slot = (a, l) => {
            const w = 130, L = 260, t = 12;
            quad('paint', a - L, a - L + t, l - w, l + w); quad('paint', a + L - t, a + L, l - w, l + w);
            quad('paint', a - L, a + L, l - w, l - w + t); quad('paint', a - L, a + L, l + w - t, l + w);
        };
        slot(0, 0);
        const back = typeof BOT_GRID_BACK !== 'undefined' ? BOT_GRID_BACK : 750, side = typeof BOT_GRID_SIDE !== 'undefined' ? BOT_GRID_SIDE : 240;
        for (let i = 0; i < 4; i++) slot(-back * (Math.floor(i / 2) + 1), side * (i % 2 ? 1 : -1));
        for (const m of b.toMeshes(scene, this.mats, 'start')) { this._register(view, m, true, { castShadow: false }); m.receiveShadows = true; }
    },

    // ---------------------------------------------------------------------------------------------
    // Ворота чекпоинтов и финиша
    // ---------------------------------------------------------------------------------------------

    async _gates(view) {
        const scene = view.scene, C = ObbyCourse;
        const glow = (root, color) => {
            for (const m of root.getChildMeshes(false)) {
                const part = m.metadata && m.metadata.part;
                if (part !== 'Glow' && part !== 'Lights') continue;
                const mat = new BABYLON.StandardMaterial('gate-glow', scene);
                mat.diffuseColor = BABYLON.Color3.FromHexString(color);
                mat.emissiveColor = BABYLON.Color3.FromHexString(color).scale(0.8);
                mat.metadata = { toon: false };
                m.material = mat;
                return mat;
            }
            return null;
        };
        const place = async (url, s, kind, n) => {
            let root = null;
            try { root = Model3D.build(await Model3D.load(url), scene, { name: kind }); } catch (e) { root = null; }
            if (!root) {
                // запасные ворота: две стойки и перекладина
                root = new BABYLON.Mesh(kind, scene);
                for (const z of [-650, 650]) { const post = BABYLON.MeshBuilder.CreateBox('gate-post', { width: 40, height: 600, depth: 40 }, scene); post.parent = root; post.position.set(0, 300, z); post.material = this.mats.pivot; }
                const beam = BABYLON.MeshBuilder.CreateBox('gate-beam', { width: 40, height: 60, depth: 1340 }, scene); beam.parent = root; beam.position.set(0, 600, 0); beam.material = kind === 'finish' ? this.mats.checker : this.mats.lime;
            }
            const w = Math.max(700, 2 * (s.r - 120));
            const k = Math.max(0.55, (w + 160) / 1420);
            root.scaling.set(1, Math.min(1.2, Math.max(0.8, k)), k);
            root.position.set(s.x, s.y, s.z);
            root.rotation.y = -s.yaw;
            for (const m of root.getChildMeshes(false)) m.isPickable = false;
            World3D.addObject(view, root, 'prop', { outline: false, ink: false });
            this.meshes.push(root);
            const mat = glow(root, kind === 'finish' ? '#c5ef5c' : '#ffffff');
            this.gates.push({ kind, n, root, mat });
        };
        for (const cp of C.checkpoints) await place('assets/models/props/checkpoint_gate.glb', cp, 'checkpoint', cp.n);
        if (C.finish) await place('assets/models/props/finish_gate.glb', C.finish, 'finish', C.finish.n);
    },

    /** Взятые этапы: ворота пройденных чекпоинтов гаснут, следующие светятся лаймом. */
    setStage(stage) {
        this._stage = stage | 0;
        for (const g of this.gates) {
            if (!g.mat || g.kind === 'finish') continue;
            const done = g.n <= this._stage, next = g.n === this._stage + 1;
            const c = done ? '#5b6170' : next ? '#c5ef5c' : '#ffffff';
            g.mat.diffuseColor = BABYLON.Color3.FromHexString(c);
            g.mat.emissiveColor = BABYLON.Color3.FromHexString(c).scale(done ? 0.2 : 0.8);
        }
    },

    // ---------------------------------------------------------------------------------------------
    // Мир: небо, побережье с городом далеко внизу, здания, корабли, облака
    // ---------------------------------------------------------------------------------------------

    async _scenery(view, li) {
        const scene = view.scene, C = ObbyCourse;
        // центр и габарит трассы
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (const p of C.pieces) { x0 = Math.min(x0, p.O[0]); x1 = Math.max(x1, p.O[0]); z0 = Math.min(z0, p.O[2]); z1 = Math.max(z1, p.O[2]); }
        if (!Number.isFinite(x0)) { x0 = x1 = z0 = z1 = 0; }
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        this.groundY = C.minTop - TRACK_DROP;
        let seed = 1000 + li * 7919;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        // берег: прямая под углом через центр трассы со смещением; суша — с одной стороны
        const ang = rnd() * Math.PI * 2, nx = Math.cos(ang), nz = Math.sin(ang), off = (rnd() - 0.5) * 30000;
        const A = TRACK_MAP_AREA, N = IS_MOBILE ? 1024 : 2048;
        const land = (wx, wz) => (wx - cx) * nx + (wz - cz) * nz - off + Math.sin(((wx - cx) * -nz + (wz - cz) * nx) / 9000) * 4500 + Math.sin(((wx - cx) * -nz + (wz - cz) * nx) / 3100) * 1600;
        /** @type {Array<[number, number, number]>} */
        const blocks = [];   // центры кварталов (мир) и их «высота»
        const tex = this._tex(scene, 'coast', N, N, (ctx, n) => {
            const px = A / n;
            const img = ctx.createImageData(n, n), d = img.data;
            for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
                const wx = cx + (i + 0.5 - n / 2) * px, wz = cz + (j + 0.5 - n / 2) * px;
                const s = land(wx, wz);
                let r, g, b;
                if (s < -2600) { const k = Math.min(1, (-s - 2600) / 40000); r = 38 - 22 * k; g = 150 - 60 * k; b = 190 - 30 * k; }       // море: мелко -> глубоко
                else if (s < 0) { const k = (s + 2600) / 2600; r = 52 + 150 * k; g = 170 + 50 * k; b = 196 + 10 * k; }                  // прибой
                else if (s < 2600) { r = 233; g = 214; b = 168; }                                                                         // пляж
                else { r = 120; g = 128; b = 120; }                                                                                       // город (дальше — кварталы)
                const o = (j * n + i) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
            }
            ctx.putImageData(img, 0, 0);
            // кварталы: сетка улиц вдоль берега
            const tx = -nz, tz = nx, step = 9000, road = 1300;
            const toPx = (wx, wz) => [(wx - cx) / px + n / 2, (wz - cz) / px + n / 2];
            for (let a = -A; a < A; a += step) for (let c = 2600 + 1800; c < A; c += step) {
                const bx = cx + tx * a + nx * (c + off), bz = cz + tz * a + nz * (c + off);
                if (Math.abs(bx - cx) > A / 2 || Math.abs(bz - cz) > A / 2) continue;
                if (land(bx, bz) < 4200) continue;
                const [qx, qy] = toPx(bx, bz);
                const sz = (step - road) / px;
                ctx.save(); ctx.translate(qx, qy); ctx.rotate(Math.atan2(tz, tx));
                const kind = rnd();
                const fill = kind < 0.12 ? '#5f9a52' : kind < 0.2 ? '#7a7f86' : ['#b9b4aa', '#c9bfae', '#a8a59f', '#d2cbbd', '#b37a5c'][Math.floor(rnd() * 5)];
                ctx.fillStyle = fill; ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
                if (kind >= 0.12) for (let k = 0; k < 6; k++) {   // крыши внутри квартала
                    const w = sz * (0.2 + rnd() * 0.3), h = sz * (0.2 + rnd() * 0.3);
                    ctx.fillStyle = ['#e7e3dc', '#8d939b', '#cfc6b6', '#9c6b52', '#dedad2'][Math.floor(rnd() * 5)];
                    ctx.fillRect(-sz / 2 + rnd() * (sz - w), -sz / 2 + rnd() * (sz - h), w, h);
                } else { ctx.fillStyle = '#4f8a45'; for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc((rnd() - 0.5) * sz, (rnd() - 0.5) * sz, sz * 0.06, 0, 6.3); ctx.fill(); } }
                ctx.restore();
                if (kind >= 0.2) blocks.push([bx, bz, Math.max(0, 1 - Math.hypot(a, c - 20000) / 90000)]);
            }
            // набережная — шоссе вдоль берега
            ctx.strokeStyle = '#4a4d52'; ctx.lineWidth = 1500 / px; ctx.beginPath();
            for (let a = -A; a <= A; a += 2000) {
                let c = 3200; for (let it = 0; it < 6; it++) { const bx = cx + tx * a + nx * (c + off), bz = cz + tz * a + nz * (c + off); c += 3300 - land(bx, bz); }
                const [qx, qy] = toPx(cx + tx * a + nx * (c + off), cz + tz * a + nz * (c + off));
                if (a === -A) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
            }
            ctx.stroke();
            // причалы
            ctx.fillStyle = '#d8d4cc';
            for (let k = 0; k < 7; k++) {
                const a = (rnd() - 0.5) * A * 0.8;
                let c = 0; for (let it = 0; it < 6; it++) { const bx = cx + tx * a + nx * (c + off), bz = cz + tz * a + nz * (c + off); c -= land(bx, bz); }
                const [qx, qy] = toPx(cx + tx * a + nx * (c + off), cz + tz * a + nz * (c + off));
                ctx.save(); ctx.translate(qx, qy); ctx.rotate(Math.atan2(nz, nx)); ctx.fillRect(-5000 / px, -260 / px, 5000 / px, 520 / px); ctx.restore();
            }
        });
        const ground = BABYLON.MeshBuilder.CreateGround('coast', { width: A * 3, height: A * 3, subdivisions: 1 }, scene);
        ground.position.set(cx, this.groundY, cz);
        const gm = new BABYLON.StandardMaterial('coast-mat', scene);
        gm.specularColor = new BABYLON.Color3(0, 0, 0);
        gm.diffuseColor = new BABYLON.Color3(0.22, 0.5, 0.66);
        if (tex) {
            tex.wrapU = tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
            tex.uScale = 3; tex.vScale = 3; tex.uOffset = -1; tex.vOffset = -1;
            gm.diffuseTexture = tex; gm.diffuseColor = new BABYLON.Color3(1, 1, 1);
        }
        gm.emissiveColor = new BABYLON.Color3(0.12, 0.14, 0.16);
        gm.metadata = { toon: false };
        ground.material = gm;
        // Ground(x, z): UV v растёт к -Z — разворот, чтобы картинка легла так же, как считалась
        ground.rotation.y = 0; ground.scaling.z = -1;
        this._register(view, ground, true, { castShadow: false });
        // здания: тонкие инстансы четырёх моделей на кварталах ближе к центру города
        const max = IS_MOBILE ? 90 : 220;
        blocks.sort((a, b) => b[2] - a[2]);
        const urls = ['assets/models/props/building_1.glb', 'assets/models/props/building_2.glb', 'assets/models/props/building_3.glb', 'assets/models/props/building_4.glb'];
        const per = [[], [], [], []];
        for (const [bx, bz, w] of blocks.slice(0, max)) {
            const k = w > 0.6 && rnd() < 0.55 ? 0 : Math.floor(rnd() * 4);
            per[k].push(BABYLON.Matrix.Compose(new BABYLON.Vector3(1, 0.7 + rnd() * 0.8 + w * 0.6, 1), BABYLON.Quaternion.RotationYawPitchRoll(Math.atan2(nx, -nz) + (rnd() < 0.5 ? 0 : Math.PI / 2), 0, 0),
                new BABYLON.Vector3(bx + (rnd() - 0.5) * 2000, this.groundY, bz + (rnd() - 0.5) * 2000)));
        }
        for (let k = 0; k < 4; k++) await this._instances(view, urls[k], per[k]);
        // корабли в море
        const shipM = [];
        for (let k = 0; k < (IS_MOBILE ? 4 : 8); k++) {
            let tries = 0, sx = 0, sz = 0;
            do { sx = cx + (rnd() - 0.5) * A * 0.7; sz = cz + (rnd() - 0.5) * A * 0.7; } while (land(sx, sz) > -9000 && ++tries < 30);
            const yaw = Math.atan2(nx, -nz) + (rnd() < 0.5 ? 0 : Math.PI);
            shipM.push({ x: sx, z: sz, yaw, v: 150 + rnd() * 200 });
        }
        const shipRoot = await this._instances(view, 'assets/models/props/ship.glb', shipM.map(s => BABYLON.Matrix.Compose(new BABYLON.Vector3(1, 1, 1), BABYLON.Quaternion.RotationYawPitchRoll(-s.yaw, 0, 0), new BABYLON.Vector3(s.x, this.groundY, s.z))));
        this.ships = shipRoot ? [{ root: shipRoot, list: shipM }] : [];
        await this._clouds(view, rnd, cx, cz, x1 - x0, z1 - z0);
        this._skyDome(view);
    },

    /** Модель url тонкими инстансами по матрицам (одна пачка на часть модели). Нет файла — ничего. */
    async _instances(view, url, matrices) {
        if (!matrices.length) return null;
        let model = null;
        try { model = await Model3D.load(url); } catch (e) { return null; }
        const root = Model3D.build(model, view.scene, { name: 'inst' });
        const buf = new Float32Array(matrices.length * 16);
        matrices.forEach((m, i) => m.copyToArray(buf, i * 16));
        for (const m of /** @type {any[]} */ (root.getChildMeshes(false))) {
            m.thinInstanceSetBuffer('matrix', buf, 16, false);
            m.isPickable = false;
            m.alwaysSelectAsActiveMesh = true;
            if (m.material) { m.material.metadata = Object.assign({}, m.material.metadata, { toon: false }); }
        }
        World3D.addObject(view, root, 'prop', { outline: false, ink: false, castShadow: false });
        this.meshes.push(root);
        root.metadata = Object.assign({}, root.metadata, { buf, count: matrices.length });
        return root;
    },

    async _clouds(view, rnd, cx, cz, w, h) {
        const urls = ['assets/models/decor/cloud_1.glb', 'assets/models/decor/cloud_2.glb', 'assets/models/decor/cloud_3.glb', 'assets/models/decor/cloud_4.glb'];
        const span = Math.max(w, h) + 60000;
        const n = IS_MOBILE ? 14 : 26;
        for (let i = 0; i < n; i++) {
            const url = urls[i % 4];
            let root = null;
            try { root = Model3D.build(await Model3D.load(url), view.scene, { name: 'cloud' }); } catch (e) { root = null; }
            if (!root) continue;
            // облака: ниже трассы (между ней и городом) и вдали на высоте трассы — не ближе 9000 px к ней
            const below = i % 4 !== 0;
            const s = below ? 7 + rnd() * 9 : 6 + rnd() * 7;
            root.scaling.set(s, s * 0.55, s);
            const ang = rnd() * Math.PI * 2, rad = (below ? 4000 : 12000) + rnd() * span * 0.5;
            root.position.set(cx + Math.cos(ang) * rad, below ? ObbyCourse.minTop - 7000 - rnd() * (TRACK_DROP - 12000) : ObbyCourse.minTop + rnd() * 6000, cz + Math.sin(ang) * rad);
            root.rotation.y = rnd() * 6.28;
            for (const m of root.getChildMeshes(false)) {
                m.isPickable = false;
                if (m.material) { m.material.emissiveColor = new BABYLON.Color3(0.55, 0.58, 0.62); m.material.specularColor = new BABYLON.Color3(0, 0, 0); m.material.metadata = { toon: false }; }
            }
            World3D.addObject(view, root, 'prop', { outline: false, ink: false, castShadow: false });
            this.meshes.push(root);
            this.clouds.push({ root, v: 40 + rnd() * 60 });
        }
    },

    // Купол неба: от светлой дымки у горизонта к синему зениту; едет за камерой, тумана не знает.
    _skyDome(view) {
        const scene = view.scene;
        const dome = BABYLON.MeshBuilder.CreateSphere('sky', { diameter: 200000, segments: 24, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
        const pos = dome.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const col = new Float32Array(pos.length / 3 * 4);
        const zen = [0.16, 0.46, 0.86], hor = [0.78, 0.9, 0.98], low = [0.6, 0.78, 0.9];
        for (let i = 0; i < pos.length / 3; i++) {
            const y = pos[i * 3 + 1] / 100000;
            const c = y >= 0 ? hor.map((v, k) => v + (zen[k] - v) * Math.pow(y, 0.6)) : hor.map((v, k) => v + (low[k] - v) * Math.min(1, -y * 3));
            col[i * 4] = c[0]; col[i * 4 + 1] = c[1]; col[i * 4 + 2] = c[2]; col[i * 4 + 3] = 1;
        }
        dome.setVerticesData(BABYLON.VertexBuffer.ColorKind, col);
        const m = new BABYLON.StandardMaterial('sky-mat', scene);
        m.disableLighting = true; m.emissiveColor = new BABYLON.Color3(1, 1, 1); m.fogEnabled = false; m.backFaceCulling = false;
        m.metadata = { toon: false };
        dome.material = m;
        dome.infiniteDistance = true;
        dome.isPickable = false;
        dome.renderingGroupId = 0;
        m.disableDepthWrite = true;
        this.meshes.push(dome);
        this.sky = dome;
    },

    // ---------------------------------------------------------------------------------------------
    // Гараж: подиум парит рядом со стартом
    // ---------------------------------------------------------------------------------------------

    async _buildPodium(view) {
        const sp = ObbyCourse.respawn(0);
        const fx = Math.cos(sp.yaw), fz = Math.sin(sp.yaw), rx = -fz, rz = fx;
        const g = { x: sp.x - fx * 2600 - rx * 3600, y: sp.y + 1400, z: sp.z - fz * 2600 - rz * 3600, yaw: sp.yaw };
        this.garage = g;
        let root = null;
        try { root = Model3D.build(await Model3D.load('assets/models/props/podium.glb'), view.scene, { name: 'podium' }); } catch (e) { root = null; }
        if (!root) {
            root = BABYLON.MeshBuilder.CreateCylinder('podium', { diameter: 700, height: 50, tessellation: 40 }, view.scene);
            root.material = this.mats.pivot;
            root.position.y = 25;
            const holder = new BABYLON.Mesh('podium-root', view.scene); root.parent = holder; root = holder;
        }
        root.position.set(g.x, g.y, g.z);
        for (const m of root.getChildMeshes(false)) {
            m.isPickable = false;
            if (m.metadata && m.metadata.part === 'Glow' && m.material) { m.material.emissiveColor = new BABYLON.Color3(0.55, 0.75, 0.2); m.material.metadata = { toon: false }; }
        }
        World3D.addObject(view, root, 'prop', { outline: false, ink: false });
        this.meshes.push(root);
        this.podium = root;
    },

    /** Где стоит машина на подиуме: { x, y (верх подиума), z, yaw }. */
    podiumSpot() { const g = this.garage || { x: 0, y: 0, z: 0, yaw: 0 }; return { x: g.x, y: g.y + 50, z: g.z, yaw: g.yaw }; },

    // ---------------------------------------------------------------------------------------------
    // Кадр
    // ---------------------------------------------------------------------------------------------

    update(dt, focus) {
        const C = ObbyCourse;
        this.time += dt;
        const t = C.time, mats = this.mats;
        if (mats.boost && mats.boost.diffuseTexture) mats.boost.diffuseTexture.uOffset = -(t * 1.6) % 1;
        if (mats.kill) { const k = 0.75 + 0.25 * Math.sin(t * 4); mats.kill.emissiveColor.set(0.95 * k, 0.32 * k, 0.06 * k); }
        for (const g of this.gates) if (g.mat && g.n === this._stage + 1) { const k = 0.6 + 0.4 * Math.sin(this.time * 5); g.mat.emissiveColor.set(0.77 * k, 0.94 * k, 0.36 * k); }
        const R = 18000;
        for (const n of this.nodes) {
            const p = n.p;
            if (focus && p.reach && (p.reach[3] < focus.x - R || p.reach[0] > focus.x + R || p.reach[5] < focus.z - R || p.reach[2] > focus.z + R)) continue;
            const pose = C.current(p);
            const O = pose.O, ax = pose.ax, ay = pose.ay, az = pose.az;
            n.root.position.set(O[0], O[1], O[2]);
            BABYLON.Quaternion.FromRotationMatrixToRef(BABYLON.Matrix.FromValues(ax[0], ax[1], ax[2], 0, ay[0], ay[1], ay[2], 0, az[0], az[1], az[2], 0, 0, 0, 0, 1), n.root.rotationQuaternion);
            if (n.bar) BABYLON.Quaternion.RotationAxisToRef(BABYLON.Axis.Y, pose.angle, n.bar.rotationQuaternion);
            if (n.arm) BABYLON.Quaternion.RotationAxisToRef(BABYLON.Axis.X, pose.angle, n.arm.rotationQuaternion);
            if (n.tire) {
                // катится: поворот вокруг своей оси (локальная Y детали) по пройденному пути
                const along = O[0] * ax[0] + O[2] * ax[2];
                if (n.lastX != null) n.roll += (along - n.lastX) / (p.sx / 2);
                n.lastX = along;
                BABYLON.Quaternion.RotationAxisToRef(BABYLON.Axis.Y, -n.roll, n.tire.rotationQuaternion);
            }
            if (p.role === 'fall') n.root.setEnabled(p.fallState !== 'drop' || p.fallDrop < 2500);
        }
        for (const c of this.clouds) { c.root.position.x += c.v * dt; }
        for (const s of this.ships) {
            const buf = s.root.metadata && s.root.metadata.buf;
            if (!buf || !dt) continue;
            s.list.forEach((sh, i) => { sh.x += Math.cos(sh.yaw) * sh.v * dt; sh.z += Math.sin(sh.yaw) * sh.v * dt; buf[i * 16 + 12] = sh.x; buf[i * 16 + 14] = sh.z; });
            for (const m of /** @type {any[]} */ (s.root.getChildMeshes(false))) m.thinInstanceBufferUpdated('matrix');
        }
    },
};
