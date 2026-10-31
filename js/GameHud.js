// GameHud.js — интерфейс Skill Test Master (DOM поверх #world3d): стиль «графит + лайм» гоночной трассы — косые
// кнопки-ливреи, билеты трасс со схемой трассы (рисуется по карте), гараж с полосками характеристик, HUD заезда
// (место, прогресс с чекпоинтами и соперниками, очки, спидометр, нитро), всплывающие трюки, отсчёт, пауза,
// результаты, «Как играть», экранные кнопки для телефона (← → слева, тормоз / газ / нитро справа — через
// Input.setVirtual). Тексты — Lang (ru / en). Логики игры здесь нет: кнопки зовут обработчики Game.

Object.assign(LANG_STRINGS.ru, {
    'stm.levels': 'Трассы', 'stm.garage': 'Гараж', 'stm.track': 'Трасса', 'stm.select': 'Выбрать', 'stm.selected': 'Выбрана',
    'stm.buy': 'Открыть за {n}', 'stm.need': 'Нужно ещё {n}', 'stm.done': 'Пройдена', 'stm.next': 'Дальше', 'stm.go': 'Поехали!',
    'stm.locked': 'Закрыта', 'stm.adPoints': '+{n} за рекламу', 'stm.trackAds': 'Реклама {n} / {total}', 'stm.adWait': 'Реклама через {n} с', 'stm.adNone': 'Реклама недоступна',
    'stm.speed': 'Скорость', 'stm.accel': 'Разгон', 'stm.grip': 'Сцепление', 'stm.air': 'Полёт',
    'stm.carLock': 'Пройди трасс: {n}', 'stm.carFree': 'Доступна', 'stm.carAds': 'Открыть за рекламу: {n} / {total}', 'stm.watch': 'Реклама {n} / {total}', 'stm.carOpen': 'Машина открыта: {name}!', 'stm.place': 'Место', 'stm.kmh': 'км/ч', 'stm.nitro': 'Нитро',
    'stm.cp': 'Чекпоинт {n} из {total}', 'stm.paused': 'Пауза', 'stm.resume': 'Продолжить', 'stm.restart': 'Заново', 'stm.toCp': 'К чекпоинту',
    'stm.howto': 'Как играть', 'stm.menu': 'Меню', 'stm.sound': 'Звуки', 'stm.music': 'Музыка', 'stm.quality': 'Графика',
    'stm.q.auto': 'Авто', 'stm.q.low': 'Низкая', 'stm.q.medium': 'Средняя', 'stm.q.high': 'Высокая',
    'stm.finished': 'Трасса пройдена!', 'stm.rTrack': 'Трасса', 'stm.rStunts': 'Трюки', 'stm.rPlace': 'Место {n}', 'stm.rTotal': 'Итого',
    'stm.nextLevel': 'Следующая', 'stm.toLevels': 'К трассам', 'stm.again': 'Ещё раз', 'stm.close': 'Понятно',
    'stm.diff': 'Сложность', 'stm.bought': 'Трасса открыта!', 'stm.newCar': 'Новая машина в гараже: {name}!',
    'stm.fall': 'Падение!', 'stm.crash': 'Авария!', 'stm.botFinish': '{name} финишировал {n}-м', 'stm.knock': 'Вы протаранили {name}!',
    'stm.air.t': 'Полёт', 'stm.flip': 'Сальто', 'stm.flip2': 'Двойное сальто', 'stm.spin': 'Вертушка', 'stm.landing': 'Чистая посадка', 'stm.drift': 'Дрифт',
    'stm.help.drive': 'Газ / тормоз и задний ход', 'stm.help.steer': 'Руль', 'stm.help.air': 'В полёте: W / S — сальто, A / D — разворот',
    'stm.help.nitro': 'Нитро', 'stm.help.hand': 'Ручник (занос)', 'stm.help.reset': 'К последнему чекпоинту', 'stm.help.pause': 'Пауза',
    'stm.help.goal': 'Доберись до финишных ворот раньше соперников. Не упади с трассы: вернёшься на последний чекпоинт. Трюки в воздухе и дрифт дают очки — за очки открываются новые трассы.',
    'stm.help.touch': 'Слева — руль, справа — газ, тормоз и нитро. Свайп по экрану — осмотреться.',
    'stm.tut.gas.t': 'Газ', 'stm.tut.gas.k': 'Жми W или ↑ — машина поедет', 'stm.tut.gas.m': 'Держи кнопку газа справа',
    'stm.tut.steer.t': 'Руль', 'stm.tut.steer.k': 'A / D или ← / → — поворот', 'stm.tut.steer.m': 'Кнопки ← → слева — поворот',
    'stm.tut.nitro.t': 'Нитро', 'stm.tut.nitro.k': 'Shift — ускорение, бак наполняется сам', 'stm.tut.nitro.m': 'Кнопка нитро — ускорение',
    'stm.tut.cp.t': 'Ворота чекпоинта', 'stm.tut.cp.h': 'Проедь через светящиеся ворота: после падения вернёшься сюда',
    'stm.tut.air.t': 'Трамплин', 'stm.tut.air.k': 'В полёте W / S наклоняют машину — сделай сальто за очки', 'stm.tut.air.m': 'В полёте газ и тормоз наклоняют машину',
    'stm.loading.level': 'Трасса {n}',
    'stm.gift': 'Подарок', 'stm.wheel': 'Колесо', 'stm.records': 'Рекорды', 'stm.giftTitle': 'Ежедневный <b>подарок</b>', 'stm.wheelTitle': 'Колесо <b>фортуны</b>',
    'stm.conflictTitle': 'Игра открыта ещё где-то', 'stm.conflict': 'Прогресс изменился на другом устройстве или в другой вкладке. Перезагрузите игру, чтобы продолжить сохраняться.', 'stm.reload': 'Перезагрузить',
    'stm.noRecords': 'Пока нет лучших игроков', 'stm.login': 'Войдите в аккаунт', 'stm.wait': 'Загрузка…', 'stm.pts': 'очков',
    'stm.carPrize': 'Машина', 'stm.plusCar': '+ машина', 'stm.exclusive': 'Эксклюзив', 'stm.paint': 'Окраска', 'stm.paintFactory': 'Заводская',
    'stm.paintLocked': 'Эксклюзивная окраска — подарок 7-го дня', 'stm.gotPoints': '+{n} очков', 'stm.gotCar': 'Машина «{name}» открыта!',
    'stm.gotPaint': 'Окраска «{name}» уже на машине!', 'stm.win': 'Выигрыш!',
    'reward.coins': 'Очки: {n}', 'reward.item': 'Машина: {name}', 'reward.randomItem': 'Случайная машина', 'reward.randomItems': 'Случайные машины: {n}',
    'reward.exclusive': 'Окраска «{name}»', 'reward.big': 'Крупная награда: {n} очков', 'reward.dup': 'Уже есть — очки: {n}',
    'daily.noX2': 'Эксклюзивная окраска выдаётся один раз, без удвоения', 'daily.exclusive': 'Эксклюзивная окраска', 'daily.exclusiveHint': 'Только в подарке 7-го дня',
    'wheel.ad': 'За рекламу: ещё вращение ({a} из {b})',
});
Object.assign(LANG_STRINGS.en, {
    'stm.levels': 'Tracks', 'stm.garage': 'Garage', 'stm.track': 'Track', 'stm.select': 'Select', 'stm.selected': 'Selected',
    'stm.buy': 'Unlock for {n}', 'stm.need': '{n} more needed', 'stm.done': 'Cleared', 'stm.next': 'Next', 'stm.go': 'Let’s go!',
    'stm.locked': 'Locked', 'stm.adPoints': '+{n} for an ad', 'stm.trackAds': 'Ad {n} / {total}', 'stm.adWait': 'Ad in {n} s', 'stm.adNone': 'Ad unavailable',
    'stm.speed': 'Speed', 'stm.accel': 'Acceleration', 'stm.grip': 'Grip', 'stm.air': 'Air control',
    'stm.carLock': 'Clear tracks: {n}', 'stm.carFree': 'Available', 'stm.carAds': 'Unlock with ads: {n} / {total}', 'stm.watch': 'Watch ad {n} / {total}', 'stm.carOpen': 'Car unlocked: {name}!', 'stm.place': 'Place', 'stm.kmh': 'km/h', 'stm.nitro': 'Nitro',
    'stm.cp': 'Checkpoint {n} of {total}', 'stm.paused': 'Paused', 'stm.resume': 'Resume', 'stm.restart': 'Restart', 'stm.toCp': 'To checkpoint',
    'stm.howto': 'How to play', 'stm.menu': 'Menu', 'stm.sound': 'Sounds', 'stm.music': 'Music', 'stm.quality': 'Graphics',
    'stm.q.auto': 'Auto', 'stm.q.low': 'Low', 'stm.q.medium': 'Medium', 'stm.q.high': 'High',
    'stm.finished': 'Track cleared!', 'stm.rTrack': 'Track', 'stm.rStunts': 'Stunts', 'stm.rPlace': 'Place {n}', 'stm.rTotal': 'Total',
    'stm.nextLevel': 'Next track', 'stm.toLevels': 'Tracks', 'stm.again': 'Again', 'stm.close': 'Got it',
    'stm.diff': 'Difficulty', 'stm.bought': 'Track unlocked!', 'stm.newCar': 'New car in the garage: {name}!',
    'stm.fall': 'Fell off!', 'stm.crash': 'Crashed!', 'stm.botFinish': '{name} finished #{n}', 'stm.knock': 'You rammed {name}!',
    'stm.air.t': 'Airtime', 'stm.flip': 'Flip', 'stm.flip2': 'Double flip', 'stm.spin': 'Spin', 'stm.landing': 'Clean landing', 'stm.drift': 'Drift',
    'stm.help.drive': 'Gas / brake and reverse', 'stm.help.steer': 'Steer', 'stm.help.air': 'In the air: W / S — flip, A / D — turn',
    'stm.help.nitro': 'Nitro', 'stm.help.hand': 'Handbrake (drift)', 'stm.help.reset': 'Back to checkpoint', 'stm.help.pause': 'Pause',
    'stm.help.goal': 'Reach the finish gate before your rivals. Fall off and you return to the last checkpoint. Airtime stunts and drifts earn points — points unlock new tracks.',
    'stm.help.touch': 'Left side — steering, right side — gas, brake and nitro. Swipe the screen to look around.',
    'stm.tut.gas.t': 'Gas', 'stm.tut.gas.k': 'Press W or ↑ to drive', 'stm.tut.gas.m': 'Hold the gas button on the right',
    'stm.tut.steer.t': 'Steering', 'stm.tut.steer.k': 'A / D or ← / → to turn', 'stm.tut.steer.m': 'Use ← → on the left to turn',
    'stm.tut.nitro.t': 'Nitro', 'stm.tut.nitro.k': 'Shift — boost, the tank refills by itself', 'stm.tut.nitro.m': 'Nitro button — boost',
    'stm.tut.cp.t': 'Checkpoint gate', 'stm.tut.cp.h': 'Drive through the glowing gate: after a fall you return here',
    'stm.tut.air.t': 'Ramp', 'stm.tut.air.k': 'In the air W / S tilt the car — flip it for points', 'stm.tut.air.m': 'In the air gas and brake tilt the car',
    'stm.loading.level': 'Track {n}',
    'stm.gift': 'Gift', 'stm.wheel': 'Wheel', 'stm.records': 'Leaderboard', 'stm.giftTitle': 'Daily <b>gift</b>', 'stm.wheelTitle': 'Wheel of <b>fortune</b>',
    'stm.conflictTitle': 'Game open elsewhere', 'stm.conflict': 'Your progress changed on another device or tab. Reload the game to keep saving.', 'stm.reload': 'Reload',
    'stm.noRecords': 'No top players yet', 'stm.login': 'Sign in', 'stm.wait': 'Loading…', 'stm.pts': 'points',
    'stm.carPrize': 'Car', 'stm.plusCar': '+ car', 'stm.exclusive': 'Exclusive', 'stm.paint': 'Paint', 'stm.paintFactory': 'Factory',
    'stm.paintLocked': 'Exclusive paint — the day 7 gift', 'stm.gotPoints': '+{n} points', 'stm.gotCar': 'Car “{name}” unlocked!',
    'stm.gotPaint': 'Paint “{name}” is on your car!', 'stm.win': 'You won!',
    'reward.coins': 'Points: {n}', 'reward.item': 'Car: {name}', 'reward.randomItem': 'Random car', 'reward.randomItems': 'Random cars: {n}',
    'reward.exclusive': 'Paint “{name}”', 'reward.big': 'Big reward: {n} points', 'reward.dup': 'Already owned — points: {n}',
    'daily.noX2': 'The exclusive paint is given once, no doubling', 'daily.exclusive': 'Exclusive paint', 'daily.exclusiveHint': 'Only as the day 7 gift',
    'wheel.ad': 'Watch ad: one more spin ({a} of {b})',
});

// Значки меню (свои, в цветах интерфейса): подарок, колесо, пьедестал рекордов, стрелка колеса, машина приза.
const STM_ICONS = {
    gift: '<svg viewBox="0 0 48 48"><rect x="7" y="21" width="34" height="21" rx="2" fill="#2b2f37" stroke="#c5ef5c" stroke-width="3"/><rect x="4" y="14" width="40" height="9" rx="2" fill="#c5ef5c"/>'
        + '<rect x="21" y="14" width="6" height="28" fill="#c5ef5c"/><path d="M24 14c-3-7-12-9-12-3 0 3 5 3 12 3zm0 0c3-7 12-9 12-3 0 3-5 3-12 3z" fill="none" stroke="#c5ef5c" stroke-width="3" stroke-linejoin="round"/></svg>',
    wheel: '<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="18" fill="#2b2f37" stroke="#c5ef5c" stroke-width="3"/>'
        + '<path d="M24 26L24 8A18 18 0 0 1 39.6 17ZM24 26L39.6 35A18 18 0 0 1 24 44ZM24 26L8.4 35A18 18 0 0 1 8.4 17Z" fill="#c5ef5c"/>'
        + '<circle cx="24" cy="26" r="4.5" fill="#f3f5f2"/><path d="M18.5 2h11L24 11z" fill="#f3f5f2"/></svg>',
    podium: '<svg viewBox="0 0 48 48"><rect x="17" y="18" width="14" height="24" fill="#c5ef5c"/><rect x="4" y="26" width="13" height="16" fill="#3a3f49" stroke="#c5ef5c" stroke-width="2"/>'
        + '<rect x="31" y="31" width="13" height="11" fill="#3a3f49" stroke="#c5ef5c" stroke-width="2"/><path d="M17 15l2-9 5 4 5-4 2 9z" fill="#f3f5f2"/></svg>',
    pointer: '<svg class="ptr" viewBox="0 0 34 42"><path d="M3 3h28L17 39z" fill="#c5ef5c" stroke="#101215" stroke-width="3" stroke-linejoin="round"/><circle cx="17" cy="12" r="4" fill="#101215"/></svg>',
    /** Машина приза; color — цвет кузова (окраска 7-го дня). */
    car: (color) => `<svg viewBox="0 0 64 44"><path d="M5 30l5-11c1.4-3 4-4.5 7-4.5h28c3 0 5.6 1.5 7 4.5l5 11v8H5z" fill="${color || '#c5ef5c'}"/>`
        + '<path d="M16 17.5h30l4 9.5H12z" fill="#1f2228"/><path d="M10 24h44" stroke="rgba(255,255,255,.35)" stroke-width="2"/>'
        + '<circle cx="18" cy="38" r="6" fill="#101215" stroke="#f3f5f2" stroke-width="2.5"/><circle cx="46" cy="38" r="6" fill="#101215" stroke="#f3f5f2" stroke-width="2.5"/></svg>',
};

/** Заголовок меню из GAME_TITLE сборки (на Пикабу — русское название): второе слово цветом, остальное прячется в портрете. */
function stmTitleHtml() {
    const w = String(GAME_TITLE).split(':')[0].trim().split(/\s+/);
    return w[0] + (w[1] ? ` <b>${w[1]}</b>` : '') + (w.length > 2 ? ` <span>${w.slice(2).join(' ')}</span>` : '');
}

const HUD_CSS = `
@font-face { font-family: 'Oswald STM'; font-weight: 500; font-display: swap; src: url('assets/fonts/oswald-cyrillic-500-normal.woff2') format('woff2'); unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
@font-face { font-family: 'Oswald STM'; font-weight: 500; font-display: swap; src: url('assets/fonts/oswald-latin-500-normal.woff2') format('woff2'); unicode-range: U+0000-00FF, U+2000-206F, U+2190-21FF; }
@font-face { font-family: 'Oswald STM'; font-weight: 700; font-display: swap; src: url('assets/fonts/oswald-cyrillic-700-normal.woff2') format('woff2'); unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
@font-face { font-family: 'Oswald STM'; font-weight: 700; font-display: swap; src: url('assets/fonts/oswald-latin-700-normal.woff2') format('woff2'); unicode-range: U+0000-00FF, U+2000-206F, U+2190-21FF; }
:root { --g0:#101215; --g1:#17191e; --g2:#1f2228; --g3:#2b2f37; --g4:#3a3f49; --lime:#c5ef5c; --lime2:#a3d63c; --ink:#f3f5f2; --mut:#8e96a3; --red:#ff4b3a;
  --carbon: repeating-linear-gradient(45deg, rgba(255,255,255,.025) 0 6px, rgba(0,0,0,.08) 6px 12px);
  --stm-font: 'Oswald STM', 'Arial Narrow', Impact, sans-serif; }
#stm { position: fixed; inset: 0; pointer-events: none; z-index: 20; font-family: var(--stm-font); color: var(--ink); user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
#stm * { box-sizing: border-box; }
#stm .scr { position: absolute; inset: 0; display: none; }
#stm .scr.on { display: block; }
#stm button { font-family: inherit; color: inherit; border: 0; background: none; cursor: pointer; pointer-events: auto; -webkit-tap-highlight-color: transparent; }
#stm .btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: .4em; min-height: 46px; padding: 0 1.3em; font-weight: 700; font-size: 20px; text-transform: uppercase; letter-spacing: .04em;
  background: var(--g3); color: var(--ink); clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%); transition: transform .12s, filter .12s; }
#stm .btn:hover { filter: brightness(1.12); } #stm .btn:active { transform: translateY(2px) scale(.98); }
#stm .btn.lime { background: var(--lime); color: #15180f; }
#stm .btn.big { min-height: 60px; font-size: 28px; padding: 0 1.6em; }
#stm .btn.ghost { background: transparent; box-shadow: inset 0 0 0 2px var(--g4); clip-path: none; border-radius: 4px; }
#stm .btn[disabled] { filter: grayscale(1) brightness(.6); cursor: default; }
#stm .ico { width: 1.3em; height: 1.3em; object-fit: contain; flex: none; }
/* верхняя полоса меню */
#stm .top { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; gap: 10px; padding: calc(10px + var(--lory-safe-top, 0px)) 14px 10px; pointer-events: none;
  background: linear-gradient(180deg, rgba(16,18,21,.92), rgba(16,18,21,.6) 70%, transparent); }
#stm .top h1 { margin: 0; font-size: 30px; font-weight: 700; text-transform: uppercase; font-style: italic; letter-spacing: .02em; text-shadow: 0 2px 0 #000; white-space: nowrap; }
#stm .top h1 b { color: var(--lime); }
#stm .top .sp { flex: 1; }
#stm .chip { pointer-events: auto; display: inline-flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; background: var(--g1); box-shadow: inset 0 0 0 2px var(--g3); border-radius: 4px; font-size: 22px; font-weight: 700; white-space: nowrap; }
#stm .chip.pts { color: var(--lime); }
#stm .chip.ad { color: var(--ink); box-shadow: inset 0 0 0 2px var(--lime); font-size: 17px; }
#stm .chip.ad[disabled] { box-shadow: inset 0 0 0 2px var(--g3); color: var(--mut); }
#stm .iconbtn { width: 42px; height: 42px; display: inline-flex; align-items: center; justify-content: center; background: var(--g1); box-shadow: inset 0 0 0 2px var(--g3); border-radius: 4px; font-size: 22px; }
#stm .iconbtn img { width: 30px; height: 30px; }
/* трассы: билеты */
#stm .levels { position: absolute; left: 0; right: 0; top: calc(64px + var(--lory-safe-top, 0px)); bottom: 88px; overflow-y: auto; overscroll-behavior: contain; pointer-events: auto; padding: 8px 14px 20px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(156px, 1fr)); gap: 14px; align-content: start; }
#stm .ticket { position: relative; background: var(--g1) var(--carbon); clip-path: polygon(0 0, 100% 0, 100% 38%, calc(100% - 9px) 44%, 100% 50%, 100% 100%, 0 100%, 0 50%, 9px 44%, 0 38%);
  padding: 8px 10px 10px; cursor: pointer; transition: transform .12s; box-shadow: inset 0 0 0 2px var(--g3); }
#stm .ticket:hover { transform: translateY(-2px); }
#stm .ticket.sel { box-shadow: inset 0 0 0 3px var(--lime); }
#stm .ticket .hd { display: flex; align-items: baseline; justify-content: space-between; }
#stm .ticket .no { font-size: 34px; font-weight: 700; font-style: italic; line-height: 1; color: transparent; -webkit-text-stroke: 1.5px var(--ink); }
#stm .ticket.sel .no, #stm .ticket.open .no { color: var(--ink); -webkit-text-stroke: 0; }
#stm .ticket .lbl { font-size: 12px; letter-spacing: .14em; color: var(--mut); text-transform: uppercase; }
#stm .ticket .df { color: var(--lime); font-size: 15px; letter-spacing: -2px; font-weight: 700; }
#stm .ticket .df i { color: var(--g4); font-style: normal; }
#stm .ticket canvas { display: block; width: 100%; aspect-ratio: 16 / 10; margin: 6px 0 8px; border-radius: 3px; background: #1a5a86; }
#stm .ticket .st { display: flex; align-items: center; justify-content: center; gap: 6px; height: 32px; font-size: 18px; font-weight: 700; text-transform: uppercase; background: var(--g2); }
#stm .ticket.open .st { background: var(--lime); color: #15180f; }
#stm .ticket.cant .st { color: var(--mut); }
#stm .ticket .st img { width: 20px; height: 20px; }
#stm .ticket .st .tad { margin-left: 8px; font-size: 14px; color: var(--lime); }
#stm .ticket.lock canvas { filter: grayscale(.85) brightness(.6); }
#stm .ticket .done { position: absolute; right: 8px; top: 46px; background: var(--lime); color: #15180f; font-size: 13px; font-weight: 700; padding: 2px 6px; text-transform: uppercase; transform: rotate(4deg); }
#stm .bar { position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 12px; padding: 12px 14px calc(12px + var(--lory-safe-bottom, 0px)); background: linear-gradient(0deg, rgba(16,18,21,.95), rgba(16,18,21,.7) 70%, transparent); pointer-events: none; }
#stm .bar .info { flex: 1; min-width: 0; font-size: 18px; color: var(--mut); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#stm .bar .info b { color: var(--ink); font-size: 24px; margin-right: 8px; font-style: italic; }
/* гараж */
#stm .gpanel { position: absolute; right: 14px; top: calc(70px + var(--lory-safe-top, 0px)); bottom: 14px; width: min(380px, 42vw); display: flex; flex-direction: column; gap: 10px; pointer-events: auto;
  background: var(--g1) var(--carbon); padding: 16px 18px; box-shadow: inset 0 0 0 2px var(--g3); clip-path: polygon(0 0, 100% 0, 100% 100%, 18px 100%, 0 calc(100% - 18px)); }
#stm .gpanel .cn { font-size: 40px; font-weight: 700; font-style: italic; text-transform: uppercase; line-height: 1; }
#stm .gpanel .cl { font-size: 14px; letter-spacing: .16em; color: var(--mut); text-transform: uppercase; }
#stm .stat { display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 10px; font-size: 16px; color: var(--mut); text-transform: uppercase; }
#stm .stat .tr { height: 12px; background: var(--g3); clip-path: polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%); }
#stm .stat .tr i { display: block; height: 100%; background: var(--lime); transition: width .3s; }
#stm .gpanel .lk { font-size: 18px; color: var(--mut); display: flex; gap: 8px; align-items: center; }
#stm .gpanel .lk.ok { color: var(--lime); }
#stm .gpanel .lk { flex-wrap: wrap; } #stm .gpanel .lk .adbar { flex-basis: 100%; height: 8px; background: var(--g3); display: block; }
#stm .gpanel .lk .adbar b { display: block; height: 100%; background: var(--lime); }
#stm .btn.adbtn { background: var(--g1); color: var(--lime); box-shadow: inset 0 0 0 3px var(--lime); clip-path: none; }
#stm .btn .adtag { display: inline-flex; width: 1.3em; height: 1.3em; align-items: center; justify-content: center; background: var(--lime); color: #15180f; font-size: .7em; }
#stm .gpanel .sp { flex: 1; }
#stm .gpanel .dots { display: flex; gap: 5px; flex-wrap: wrap; }
#stm .gpanel .dots i { width: 18px; height: 6px; background: var(--g3); } #stm .gpanel .dots i.on { background: var(--lime); }
#stm .arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 58px; height: 58px; pointer-events: auto; background: var(--g1); box-shadow: inset 0 0 0 2px var(--g3); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
#stm .arrow img { width: 44px; height: 44px; }
#stm .arrow.l { left: 14px; }
#stm .arrow.r { right: calc(min(380px, 42vw) + 28px); }
/* HUD заезда */
#stm .place { position: absolute; left: 14px; top: calc(12px + var(--lory-safe-top, 0px)); display: flex; align-items: flex-end; gap: 4px; text-shadow: 0 3px 0 #000; }
#stm .place b { font-size: 64px; font-style: italic; line-height: .85; color: var(--lime); }
#stm .place span { font-size: 26px; font-weight: 700; }
#stm .place small { display: block; font-size: 12px; letter-spacing: .2em; color: var(--mut); text-transform: uppercase; }
#stm .prog { position: absolute; left: 50%; transform: translateX(-50%); top: calc(16px + var(--lory-safe-top, 0px)); width: min(46vw, 520px); height: 14px; background: rgba(16,18,21,.75); box-shadow: inset 0 0 0 2px var(--g3); }
#stm .prog .fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--lime); }
#stm .prog .tick { position: absolute; top: -4px; bottom: -4px; width: 3px; background: var(--ink); opacity: .7; }
#stm .prog .dot { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 2px #000; }
#stm .prog .dot.me { width: 16px; height: 16px; margin: -8px 0 0 -8px; background: var(--lime); }
#stm .prog .flag { position: absolute; right: -26px; top: -8px; width: 26px; height: 26px; }
#stm .score { position: absolute; right: 14px; top: calc(12px + var(--lory-safe-top, 0px)); display: flex; gap: 8px; align-items: center; }
#stm .score .pts { display: flex; align-items: center; gap: 6px; height: 46px; padding: 0 14px 0 8px; background: rgba(16,18,21,.85); box-shadow: inset 0 0 0 2px var(--g3); font-size: 28px; font-weight: 700; color: var(--lime); }
#stm .score .pts img { width: 34px; height: 34px; }
#stm .speedo { position: absolute; right: 18px; bottom: calc(16px + var(--lory-safe-bottom, 0px)); text-align: right; text-shadow: 0 3px 0 #000; }
#stm .speedo b { font-size: 58px; font-style: italic; line-height: .9; }
#stm .speedo small { display: block; font-size: 14px; letter-spacing: .2em; color: var(--mut); }
#stm .nitro { margin-top: 6px; width: 180px; height: 12px; margin-left: auto; background: rgba(16,18,21,.8); box-shadow: inset 0 0 0 2px var(--g3); clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%); }
#stm .nitro i { display: block; height: 100%; background: linear-gradient(90deg, #3aa8ff, #9ff3ff); }
#stm .nitro.on i { background: linear-gradient(90deg, #ff7a1a, #ffe36b); }
#stm .pops { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 4px; }
#stm .pop { font-size: 30px; font-weight: 700; font-style: italic; text-transform: uppercase; color: var(--lime); text-shadow: 0 3px 0 #000, 0 0 18px rgba(197,239,92,.35); animation: stm-pop 1.4s ease-out forwards; white-space: nowrap; }
#stm .pop em { color: var(--ink); font-style: normal; margin-left: 8px; }
@keyframes stm-pop { 0% { opacity: 0; transform: scale(1.5) skewX(-8deg); } 12% { opacity: 1; transform: scale(1) skewX(-8deg); } 75% { opacity: 1; } 100% { opacity: 0; transform: translateY(-30px) skewX(-8deg); } }
#stm .count { position: absolute; left: 50%; top: 38%; transform: translate(-50%, -50%); font-size: 160px; font-weight: 700; font-style: italic; text-shadow: 0 6px 0 #000; display: none; }
#stm .count.on { display: block; animation: stm-count .9s ease-out; }
#stm .count.go { color: var(--lime); font-size: 110px; }
@keyframes stm-count { 0% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; } 25% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { opacity: .9; } }
#stm .toast { position: absolute; left: 50%; top: calc(48px + var(--lory-safe-top, 0px)); transform: translateX(-50%); padding: 6px 16px; background: rgba(16,18,21,.88); box-shadow: inset 0 0 0 2px var(--lime); font-size: 20px; font-weight: 700; text-transform: uppercase; opacity: 0; transition: opacity .25s; white-space: nowrap; }
#stm .toast.on { opacity: 1; }
#stm .tbtns { position: absolute; right: 14px; top: calc(66px + var(--lory-safe-top, 0px)); display: flex; gap: 8px; }
/* экранные кнопки (касания) */
#stm .touch { display: none; }
#stm.touchmode .scr.race.on .touch { display: block; }
#stm .tb { position: absolute; pointer-events: auto; width: 92px; height: 92px; background-size: contain; background-repeat: no-repeat; background-position: center; touch-action: none; opacity: .92; }
#stm .tb.on { transform: scale(.92); opacity: 1; filter: brightness(1.25); }
#stm .tb.left { left: calc(14px + var(--lory-safe-left, 0px)); bottom: calc(18px + var(--lory-safe-bottom, 0px)); background-image: url('assets/ui/btn-left.webp'); }
#stm .tb.right { left: calc(118px + var(--lory-safe-left, 0px)); bottom: calc(18px + var(--lory-safe-bottom, 0px)); background-image: url('assets/ui/btn-right.webp'); }
#stm .tb.gas { right: calc(14px + var(--lory-safe-right, 0px)); bottom: calc(18px + var(--lory-safe-bottom, 0px)); width: 104px; height: 104px; background-image: url('assets/ui/btn-gas.webp'); }
#stm .tb.brake { right: calc(128px + var(--lory-safe-right, 0px)); bottom: calc(18px + var(--lory-safe-bottom, 0px)); background-image: url('assets/ui/btn-brake.webp'); }
#stm .tb.nitro { right: calc(20px + var(--lory-safe-right, 0px)); bottom: calc(132px + var(--lory-safe-bottom, 0px)); width: 84px; height: 84px; background-image: url('assets/ui/btn-nitro.webp'); }
#stm.touchmode .speedo { right: 50%; transform: translateX(50%); bottom: calc(12px + var(--lory-safe-bottom, 0px)); text-align: center; }
#stm.touchmode .speedo b { font-size: 44px; }
#stm.touchmode .nitro { margin: 4px auto 0; width: 140px; }
/* окна */
#stm .modal { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(8,10,12,.62); pointer-events: auto; padding: 14px; }
#stm .modal.on { display: flex; }
#stm .card { width: min(520px, 100%); max-height: 100%; overflow: auto; background: var(--g1) var(--carbon); box-shadow: inset 0 0 0 2px var(--g3); padding: 20px 22px; display: flex; flex-direction: column; gap: 12px;
  clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px)); }
#stm .card h2 { margin: 0; font-size: 40px; font-style: italic; text-transform: uppercase; line-height: 1; }
#stm .card h2 b { color: var(--lime); }
#stm .card .row { display: flex; gap: 10px; flex-wrap: wrap; }
#stm .card .row .btn { flex: 1; }
#stm .card .tg { display: flex; justify-content: space-between; align-items: center; font-size: 20px; text-transform: uppercase; padding: 6px 0; border-bottom: 1px solid var(--g3); }
#stm .card .tg button { min-width: 120px; height: 38px; background: var(--g3); font-size: 18px; font-weight: 700; text-transform: uppercase; }
#stm .card .tg button.on { background: var(--lime); color: #15180f; }
#stm .res { display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; font-size: 22px; }
#stm .res span:nth-child(even) { text-align: right; color: var(--lime); font-weight: 700; }
#stm .res .tot { font-size: 30px; border-top: 2px solid var(--g3); padding-top: 6px; }
#stm .medal { display: flex; align-items: center; gap: 14px; }
#stm .medal b { font-size: 84px; font-style: italic; line-height: .9; color: var(--lime); }
#stm .medal.p2 b { color: #d9dde3; } #stm .medal.p3 b { color: #d99a5b; } #stm .medal.p4 b, #stm .medal.p5 b { color: var(--mut); }
#stm .medal img { width: 72px; height: 72px; }
#stm .keys { display: grid; grid-template-columns: auto 1fr; gap: 8px 14px; align-items: center; font-size: 18px; }
#stm .kc { display: inline-flex; gap: 4px; flex-wrap: wrap; }
#stm .kc kbd { font-family: inherit; min-width: 34px; height: 32px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; background: var(--g3); box-shadow: inset 0 -3px 0 rgba(0,0,0,.4); border-radius: 4px; font-size: 16px; font-weight: 700; }
#stm .card p { margin: 0; font-size: 18px; color: var(--mut); line-height: 1.35; }
/* колонка меню: подарок, колесо, рекорды */
#stm .rail { position: absolute; left: calc(14px + var(--lory-safe-left, 0px)); top: calc(74px + var(--lory-safe-top, 0px)); display: flex; flex-direction: column; gap: 10px; pointer-events: none; }
#stm .rbtn { position: relative; width: 78px; height: 78px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: var(--g1) var(--carbon);
  box-shadow: inset 0 0 0 2px var(--g3); border-radius: 6px; font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; transition: transform .12s; }
#stm .rbtn:hover { box-shadow: inset 0 0 0 2px var(--lime); } #stm .rbtn:active { transform: scale(.95); }
#stm .rbtn svg { width: 40px; height: 40px; flex: none; }
#stm .rbtn .dot { position: absolute; top: 5px; right: 5px; width: 12px; height: 12px; border-radius: 50%; background: var(--red); box-shadow: 0 0 0 2px var(--g1); display: none; }
#stm .rbtn.badge .dot { display: block; animation: stm-pulse 1.2s infinite; }
@keyframes stm-pulse { 50% { transform: scale(1.35); } }
#stm .levels-scr .levels { left: calc(100px + var(--lory-safe-left, 0px)); }
/* окна подарка, колеса, рекордов */
#stm .card.wide { width: min(660px, 100%); }
#stm .card.wide { white-space: normal; }
#stm .card .row .btn { white-space: nowrap; }
#stm .card.wide .btn.big { font-size: 24px; min-height: 54px; padding: 0 .8em; }
#stm .card .hdr { display: flex; align-items: center; gap: 10px; }
#stm .card .hdr h2 { flex: 1; }
#stm .card .hdr .iconbtn { margin-right: 16px; flex: none; }
#stm .days { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
#stm .day { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px 6px; background: var(--g2); box-shadow: inset 0 0 0 2px var(--g3); min-height: 108px; }
#stm .day .dn { font-size: 13px; letter-spacing: .12em; color: var(--mut); text-transform: uppercase; }
#stm .day .di { width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; }
#stm .day .di img, #stm .day .di svg { width: 100%; height: 100%; object-fit: contain; }
#stm .day .dv { font-size: 21px; font-weight: 700; color: var(--lime); line-height: 1.05; text-align: center; }
#stm .day .dv small { display: block; font-size: 12px; color: var(--ink); font-weight: 500; letter-spacing: .04em; text-transform: uppercase; }
#stm .day.today { box-shadow: inset 0 0 0 3px var(--lime); background: #262b1d; }
#stm .day.today .dn { color: var(--lime); }
#stm .day.claimed > * { opacity: .35; }
#stm .day.claimed::after { content: '✓'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700; color: var(--lime); text-shadow: 0 2px 0 #000; }
#stm .day.locked .di { filter: grayscale(.5) brightness(.8); }
#stm .day.d7 { grid-column: span 2; flex-direction: row; gap: 12px; justify-content: flex-start; padding: 8px 12px; background: linear-gradient(120deg, #2f3529, #1f2228 60%); box-shadow: inset 0 0 0 2px var(--lime2); }
#stm .day.d7.today { box-shadow: inset 0 0 0 3px var(--lime); }
#stm .day.d7 .di { width: 84px; height: 64px; }
#stm .day.d7 .dt { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 0; }
#stm .day.d7 .dv { text-align: left; font-size: 22px; }
#stm .day .ex { font-size: 11px; letter-spacing: .1em; background: var(--lime); color: #15180f; padding: 1px 6px; text-transform: uppercase; font-weight: 700; }
#stm .day .dh { font-size: 12px; color: var(--mut); }
#stm .ghint { font-size: 16px; color: var(--mut); text-align: center; min-height: 1.3em; }
#stm .wwrap { display: flex; gap: 18px; align-items: center; }
#stm .wbox { position: relative; width: min(300px, 40vw, 58vh); aspect-ratio: 1; flex: none; }
#stm .wbox .dwrap { position: absolute; inset: 0; overflow: hidden; border-radius: 50%; }   /* повёрнутый диск не раздувает прокрутку окна */
#stm .wbox .disk { width: 100%; height: 100%; display: block; }
#stm .wbox .ptr { position: absolute; left: 50%; top: -8px; width: 34px; height: 42px; transform: translateX(-50%); filter: drop-shadow(0 3px 0 rgba(0,0,0,.55)); }
#stm .wside { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
#stm .wside .btn { width: 100%; }
#stm .wres { text-align: center; font-size: 26px; font-weight: 700; color: var(--lime); min-height: 1.3em; text-transform: uppercase; line-height: 1.1; }
#stm .wres.pop { animation: stm-wpop .5s ease-out; }
@keyframes stm-wpop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
#stm .lb { display: flex; flex-direction: column; gap: 4px; }
#stm .lb .lrow { display: grid; grid-template-columns: 40px 36px 1fr auto; align-items: center; gap: 10px; padding: 4px 10px; background: var(--g2); font-size: 18px; }
#stm .lb .lrow.me { box-shadow: inset 0 0 0 2px var(--lime); }
#stm .lb .rk { font-weight: 700; font-style: italic; color: var(--mut); font-size: 22px; }
#stm .lb .lrow.top .rk { color: var(--lime); }
#stm .lb .av { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: var(--g3); display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--lime); }
#stm .lb .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#stm .lb .sc { color: var(--lime); font-weight: 700; }
#stm .lb-empty { text-align: center; color: var(--mut); font-size: 20px; padding: 18px 0; }
/* окраска в гараже */
#stm .paints { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
#stm .paints .pl { font-size: 14px; letter-spacing: .14em; color: var(--mut); text-transform: uppercase; flex-basis: 100%; }
#stm .paints button { position: relative; width: 32px; height: 32px; border-radius: 50%; box-shadow: inset 0 0 0 2px rgba(0,0,0,.35), 0 0 0 2px var(--g3); }
#stm .paints button.sel { box-shadow: inset 0 0 0 2px rgba(0,0,0,.35), 0 0 0 3px var(--lime); }
#stm .paints button.lock { filter: grayscale(.75) brightness(.5); }
#stm .paints button.lock::after { content: '7'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 15px; }
/* низкий альбомный и портрет */
@media (max-width: 700px) { #stm .bar { flex-wrap: wrap; } #stm .bar .info { flex-basis: 100%; } #stm .bar .btn.big { flex: 1; font-size: 20px; min-height: 50px; padding: 0 .6em; } #stm .levels { bottom: 128px; } }
@media (max-height: 460px) {
  #stm .top h1 { font-size: 22px; } #stm .chip { height: 34px; font-size: 18px; } #stm .iconbtn { width: 36px; height: 36px; }
  #stm .levels { top: calc(52px + var(--lory-safe-top, 0px)); bottom: 70px; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 10px; }
  #stm .bar { flex-wrap: nowrap; padding-top: 8px; padding-bottom: calc(8px + var(--lory-safe-bottom, 0px)); } #stm .bar .info { display: none; }
  #stm .bar .btn.big { flex: 1; }
  #stm .ticket .no { font-size: 26px; } #stm .ticket canvas { aspect-ratio: 16 / 8; margin: 4px 0; }
  #stm .btn.big { min-height: 48px; font-size: 22px; }
  #stm .gpanel { top: calc(54px + var(--lory-safe-top, 0px)); gap: 6px; padding: 10px 14px; } #stm .gpanel .cn { font-size: 30px; } #stm .stat { font-size: 13px; grid-template-columns: 90px 1fr; }
  #stm .place b { font-size: 46px; } #stm .speedo b { font-size: 40px; } #stm .tb { width: 76px; height: 76px; } #stm .tb.gas { width: 86px; height: 86px; } #stm .tb.right { left: calc(98px + var(--lory-safe-left, 0px)); }
  #stm .tb.brake { right: calc(108px + var(--lory-safe-right, 0px)); } #stm .tb.nitro { bottom: calc(110px + var(--lory-safe-bottom, 0px)); width: 68px; height: 68px; }
  #stm .card { padding: 12px 16px; gap: 8px; } #stm .card h2 { font-size: 28px; } #stm .res { font-size: 18px; } #stm .medal b { font-size: 56px; }
  #stm .pop { font-size: 24px; } #stm .count { font-size: 110px; }
  #stm .rail { top: calc(54px + var(--lory-safe-top, 0px)); gap: 6px; } #stm .rbtn { width: 62px; height: 62px; font-size: 11px; } #stm .rbtn svg { width: 30px; height: 30px; }
  #stm .levels-scr .levels { left: calc(82px + var(--lory-safe-left, 0px)); }
  #stm .days { gap: 6px; } #stm .day { min-height: 74px; padding: 4px 3px 3px; gap: 0; } #stm .day .dn { font-size: 11px; } #stm .day .di { width: 32px; height: 32px; } #stm .day .dv { font-size: 16px; } #stm .day.d7 .di { width: 60px; height: 44px; }
  #stm .wbox { width: min(240px, 40vw, 62vh); } #stm .wres { font-size: 20px; }
  #stm .paints .pl { display: none; } #stm .paints button { width: 26px; height: 26px; } #stm .gpanel .dots { display: none; }
  #stm .modal { padding: 8px; } #stm .card.wide .btn.big { font-size: 18px; min-height: 42px; } #stm .card.wide .btn { min-height: 40px; font-size: 16px; } #stm .ghint { font-size: 13px; min-height: 0; }
}
@media (max-aspect-ratio: 1/1) {
  #stm .top h1 span { display: none; }
  #stm .gpanel { left: 10px; right: 10px; width: auto; top: auto; bottom: 10px; max-height: 52%; }
  #stm .arrow { top: 34%; } #stm .arrow.r { right: 14px; }
  #stm .prog { top: calc(90px + var(--lory-safe-top, 0px)); width: 70vw; }
  #stm .score { top: calc(10px + var(--lory-safe-top, 0px)); }
  #stm .levels { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  #stm .chip.ad .t { display: none; }
  #stm .rail { flex-direction: row; left: calc(14px + var(--lory-safe-left, 0px)); right: calc(14px + var(--lory-safe-right, 0px)); top: calc(62px + var(--lory-safe-top, 0px)); }
  #stm .rbtn { flex: 1; width: auto; height: 46px; flex-direction: row; gap: 6px; font-size: 15px; } #stm .rbtn svg { width: 28px; height: 28px; }
  #stm .levels-scr .levels { left: 0; top: calc(118px + var(--lory-safe-top, 0px)); }
  #stm .wwrap { flex-direction: column; } #stm .wbox { width: min(300px, 76vw, 44vh); } #stm .wside { width: 100%; }
}
@media (max-width: 560px) {
  #stm .tb { width: 74px; height: 74px; } #stm .tb.gas { width: 84px; height: 84px; }
  #stm .tb.right { left: calc(96px + var(--lory-safe-left, 0px)); }
  #stm .tb.brake { right: calc(104px + var(--lory-safe-right, 0px)); }
  #stm .tb.nitro { width: 66px; height: 66px; bottom: calc(112px + var(--lory-safe-bottom, 0px)); }
  #stm.touchmode .speedo { bottom: calc(104px + var(--lory-safe-bottom, 0px)); }
  #stm.touchmode .speedo b { font-size: 36px; }
  #stm .place b { font-size: 48px; }
  #stm .top h1 { font-size: 22px; }
  #stm .card h2 { font-size: 30px; }
}
body.lory-paused #stm .race .touch { display: none !important; }
`;

/** @satisfies {Record<string, any>} */
const GameHud = {
    /** @type {HTMLElement | null} */ root: null,
    /** @type {Record<string, any>} */ h: {},
    /** @type {Record<string, HTMLElement>} */ el: {},
    screen: 'none',
    _toastT: 0,
    _thumbs: {},

    init(handlers) {
        this.h = handlers || {};
        const st = document.createElement('style');
        st.id = 'stm-css'; st.textContent = HUD_CSS;
        document.head.appendChild(st);
        const r = document.createElement('div');
        r.id = 'stm';
        r.innerHTML = `
<div class="scr levels-scr">
  <div class="top"><h1>${stmTitleHtml()}</h1><div class="sp"></div>
    <button class="chip ad" data-k="ad"><img class="ico" src="assets/ui/ic-trophy.webp" alt=""><span class="t"></span></button>
    <div class="chip pts"><img class="ico" src="assets/ui/ic-trophy.webp" alt=""><span data-k="pts">0</span></div>
    <button class="iconbtn" data-k="settings" aria-label="settings"><img src="assets/ui/ic-settings.webp" alt=""></button></div>
  <div class="rail">
    <button class="rbtn" data-k="gift">${STM_ICONS.gift}<span data-t="stm.gift"></span><i class="dot"></i></button>
    <button class="rbtn" data-k="wheel">${STM_ICONS.wheel}<span data-t="stm.wheel"></span><i class="dot"></i></button>
    <button class="rbtn" data-k="rec" style="display:none">${STM_ICONS.podium}<span data-t="stm.records"></span></button>
  </div>
  <div class="levels" data-k="grid"></div>
  <div class="bar"><div class="info" data-k="linfo"></div><button class="btn big adbtn" data-k="lad"></button><button class="btn lime big" data-k="lgo"></button></div>
</div>
<div class="scr garage-scr">
  <div class="top"><button class="iconbtn" data-k="back" aria-label="back">‹</button><h1 data-t="stm.garage"></h1><div class="sp"></div>
    <div class="chip pts"><img class="ico" src="assets/ui/ic-trophy.webp" alt=""><span data-k="pts2">0</span></div></div>
  <button class="arrow l" data-k="prev" aria-label="prev"><img src="assets/ui/btn-left.webp" alt=""></button>
  <button class="arrow r" data-k="next" aria-label="next"><img src="assets/ui/btn-right.webp" alt=""></button>
  <div class="gpanel">
    <div class="cl" data-k="gcl"></div><div class="cn" data-k="gname"></div>
    <div data-k="gstats"></div>
    <div class="lk" data-k="glock"></div>
    <div class="paints" data-k="gpaints"></div>
    <div class="sp"></div>
    <div class="dots" data-k="gdots"></div>
    <button class="btn lime big" data-k="ggo"></button>
  </div>
</div>
<div class="scr race">
  <div class="place"><div><small data-t="stm.place"></small><b data-k="place">1</b><span data-k="of">/5</span></div></div>
  <div class="prog" data-k="prog"><div class="fill" data-k="pfill"></div><img class="flag" src="assets/ui/ic-flags.webp" alt=""></div>
  <div class="score"><div class="pts"><img src="assets/ui/ic-trophy.webp" alt=""><span data-k="rpts">0</span></div></div>
  <div class="tbtns"><button class="iconbtn" data-k="reset" aria-label="reset">⟲</button><button class="iconbtn" data-k="pause" aria-label="pause">❚❚</button></div>
  <div class="speedo"><b data-k="spd">0</b><small data-t="stm.kmh"></small><div class="nitro" data-k="nitro"><i data-k="nfill"></i></div></div>
  <div class="pops" data-k="pops"></div>
  <div class="count" data-k="count"></div>
  <div class="touch">
    <div class="tb left" data-v="left"></div><div class="tb right" data-v="right"></div>
    <div class="tb brake" data-v="brake"></div><div class="tb gas" data-v="gas"></div><div class="tb nitro" data-v="nitro"></div>
  </div>
</div>
<div class="toast" data-k="toast"></div>
<div class="modal" data-k="mpause"><div class="card">
  <h2 data-t="stm.paused"></h2>
  <button class="btn lime big" data-k="resume" data-t="stm.resume"></button>
  <div class="row"><button class="btn" data-k="pcp" data-t="stm.toCp"></button><button class="btn" data-k="prestart" data-t="stm.restart"></button></div>
  <div class="row"><button class="btn" data-k="phow" data-t="stm.howto"></button><button class="btn" data-k="pmenu" data-t="stm.menu"></button></div>
  <div data-k="ptoggles"></div>
</div></div>
<div class="modal" data-k="msettings"><div class="card"><h2 data-t="stm.quality"></h2><div data-k="stoggles"></div>
  <div class="row"><button class="btn" data-k="shelp" data-t="stm.howto"></button><button class="btn lime" data-k="sclose" data-t="stm.close"></button></div></div></div>
<div class="modal" data-k="mres"><div class="card" data-k="rescard"></div></div>
<div class="modal" data-k="mhelp"><div class="card">
  <h2 data-t="stm.howto"></h2><p data-t="stm.help.goal"></p>
  <div class="keys" data-k="hkeys"></div><p data-k="htouch" data-t="stm.help.touch"></p>
  <button class="btn lime" data-k="hclose" data-t="stm.close"></button>
</div></div>
<div class="modal" data-k="mgift"><div class="card wide">
  <div class="hdr"><h2 data-k="gtitle"></h2><button class="iconbtn" data-k="gclose" aria-label="close">✕</button></div>
  <div class="days" data-k="gdays"></div>
  <div class="row"><button class="btn lime big" data-k="gclaim"></button><button class="btn big adbtn" data-k="gx2"></button></div>
  <div class="ghint" data-k="ghint"></div>
</div></div>
<div class="modal" data-k="mwheel"><div class="card wide">
  <div class="hdr"><h2 data-k="wtitle"></h2><button class="iconbtn" data-k="wclose" aria-label="close">✕</button></div>
  <div class="wwrap">
    <div class="wbox"><div class="dwrap"><svg class="disk" data-k="wdisk" viewBox="-150 -150 300 300"></svg></div>${STM_ICONS.pointer}</div>
    <div class="wside"><div class="wres" data-k="wres"></div>
      <button class="btn lime big" data-k="wfree"></button><button class="btn adbtn" data-k="wad"></button><div class="ghint" data-k="whint"></div></div>
  </div>
</div></div>
<div class="modal" data-k="mconflict"><div class="card"><h2 data-t="stm.conflictTitle"></h2><p data-t="stm.conflict"></p>
  <button class="btn lime" data-k="creload" data-t="stm.reload"></button></div></div>
<div class="modal" data-k="mrec"><div class="card">
  <div class="hdr"><h2 data-t="stm.records"></h2><button class="iconbtn" data-k="rclose" aria-label="close">✕</button></div>
  <div class="lb" data-k="rlist"></div>
  <button class="btn lime" data-k="rlogin" data-t="stm.login"></button>
</div></div>`;
        document.body.appendChild(r);
        this.root = r;
        r.querySelectorAll('[data-k]').forEach((e) => { this.el[/** @type {HTMLElement} */ (e).dataset.k] = /** @type {HTMLElement} */ (e); });
        const on = (k, fn) => { const e = this.el[k]; if (e) e.addEventListener('click', (ev) => { ev.stopPropagation(); this.click(); fn(); }); };
        on('lgo', () => this.h.onLevelGo && this.h.onLevelGo());
        on('lad', () => this.h.onLevelAd && this.h.onLevelAd());
        on('ad', () => this.h.onAd && this.h.onAd());
        on('settings', () => this.settings(true));
        on('sclose', () => this.settings(false));
        on('shelp', () => { this.settings(false); this.help(true); });
        on('back', () => this.h.onBack && this.h.onBack());
        on('prev', () => this.h.onCar && this.h.onCar(-1));
        on('next', () => this.h.onCar && this.h.onCar(1));
        on('ggo', () => this.h.onGo && this.h.onGo());
        on('reset', () => this.h.onReset && this.h.onReset());
        on('pause', () => this.h.onPause && this.h.onPause());
        on('resume', () => this.h.onPause && this.h.onPause());
        on('pcp', () => this.h.onReset && this.h.onReset(true));
        on('prestart', () => this.h.onRestart && this.h.onRestart());
        on('phow', () => this.help(true));
        on('pmenu', () => this.h.onMenu && this.h.onMenu());
        on('hclose', () => this.help(false));
        on('gift', () => this.h.onGift && this.h.onGift());
        on('wheel', () => this.h.onWheel && this.h.onWheel());
        on('rec', () => this.h.onRecords && this.h.onRecords());
        on('rlogin', () => this.h.onLogin && this.h.onLogin());
        on('creload', () => location.reload());
        on('gclaim', () => this.h.onClaim && this.h.onClaim(false));
        on('gx2', () => this.h.onClaim && this.h.onClaim(true));
        on('wfree', () => this.h.onSpin && this.h.onSpin('free'));
        on('wad', () => this.h.onSpin && this.h.onSpin('ad'));
        for (const [b, m] of [['gclose', 'mgift'], ['wclose', 'mwheel'], ['rclose', 'mrec']]) on(b, () => this.close(m));
        this.el.gpaints.addEventListener('click', (e) => {
            const b = /** @type {HTMLElement} */ (e.target).closest('[data-p]');
            if (!b) return;
            e.stopPropagation(); this.click();
            if (this.h.onPaint) this.h.onPaint(/** @type {HTMLElement} */ (b).dataset.p);
        });
        this._touch();
        Lang.apply();
        window.addEventListener('lory-input-device', () => this._syncTouch());
        this._syncTouch();
        window.addEventListener('resize', () => { if (this.screen === 'levels') this._drawThumbs(); });
    },

    click() { try { Sound.play('assets/sounds/click.ogg', { volume: 0.5 }); } catch (e) { /* тихо */ } },

    /** Экран: 'levels' | 'garage' | 'race' | 'none'. */
    show(name) {
        this.screen = name;
        const map = { levels: 'levels-scr', garage: 'garage-scr', race: 'race' };
        this.root.querySelectorAll('.scr').forEach((s) => s.classList.toggle('on', s.classList.contains(map[name] || '-')));
        this._syncTouch();
    },

    _syncTouch() {
        const touch = (typeof Input !== 'undefined' && (Input.device === 'touch' || Input.mouseTouch)) || IS_MOBILE;
        this.root.classList.toggle('touchmode', !!touch);
    },

    // Экранные кнопки: каждая — своё действие Input (setVirtual), мультитач, отпускание при уходе пальца и паузе.
    _touch() {
        const held = new Map();
        const release = (id) => { const k = held.get(id); if (!k) return; held.delete(id); if (![...held.values()].some(v => v.v === k.v)) { Input.setVirtual(k.v, false); k.el.classList.remove('on'); } };
        this.root.querySelectorAll('.tb').forEach((n) => {
            const el = /** @type {HTMLElement} */ (n), v = el.dataset.v;
            el.addEventListener('pointerdown', (e) => {
                e.preventDefault(); e.stopPropagation();
                try { el.setPointerCapture(e.pointerId); } catch (er) { /* без захвата */ }
                held.set(e.pointerId, { v, el });
                Input.setVirtual(v, true); el.classList.add('on');
                if (typeof Input !== 'undefined' && Input._setDevice) Input._setDevice('touch');
            });
            for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, (e) => release(/** @type {PointerEvent} */ (e).pointerId));
        });
        const all = () => { for (const id of [...held.keys()]) release(id); };
        window.addEventListener('lory-release-input', all);
        window.addEventListener('blur', all);
        if (typeof Pause !== 'undefined' && Pause.onChange) Pause.onChange(() => { if (Pause.active) all(); });
    },

    /** Свободная часть экрана для витрины гаража (камера ставит машину туда). */
    freeArea() {
        const W = innerWidth, H = innerHeight;
        const p = this.root && this.root.querySelector('.gpanel');
        if (this.screen !== 'garage' || !p) return { x: 0, y: 0, w: W, h: H };
        const r = p.getBoundingClientRect();
        if (W <= H) return { x: 0, y: 60, w: W, h: Math.max(80, r.top - 60) };
        return { x: 70, y: 60, w: Math.max(80, r.left - 140), h: H - 80 };
    },

    // ---------------------------------------------------------------------------------------------
    // Трассы
    // ---------------------------------------------------------------------------------------------

    setPoints(n) {
        const s = Math.floor(n).toLocaleString('ru-RU').replace(/ /g, ' ');
        if (this.el.pts) this.el.pts.textContent = s;
        if (this.el.pts2) this.el.pts2.textContent = s;
    },

    /** Кнопка «+N за рекламу»: state { show, enabled, label }. */
    setAd(state) {
        const b = /** @type {HTMLButtonElement} */ (this.el.ad);
        if (!b) return;
        b.style.display = state.show ? '' : 'none';
        b.disabled = !state.enabled;
        b.querySelector('.t').textContent = state.label;
    },

    /** model: { items: [{ id, n, price, diff, open, done, place, sel, can }], points, info, action: { label, enabled } } */
    renderLevels(model) {
        const g = this.el.grid;
        if (!g) return;
        if (!g.childElementCount || g.childElementCount !== model.items.length) {
            g.innerHTML = '';
            for (const it of model.items) {
                const t = document.createElement('div');
                t.className = 'ticket';
                t.innerHTML = `<div class="hd"><div><div class="lbl">${Lang.t('stm.track')}</div><div class="no">${String(it.n).padStart(2, '0')}</div></div><div class="df"></div></div><canvas width="240" height="150"></canvas><div class="st"></div>`;
                t.addEventListener('click', () => { this.click(); if (this.h.onLevelPick) this.h.onLevelPick(it.id); });
                t.dataset.id = it.id;
                g.appendChild(t);
            }
            this._drawThumbs();
        }
        model.items.forEach((it, i) => {
            const t = /** @type {HTMLElement} */ (g.children[i]);
            t.className = 'ticket' + (it.open ? ' open' : ' lock') + (it.sel ? ' sel' : '') + (!it.open && !it.can ? ' cant' : '');
            t.querySelector('.df').innerHTML = '›'.repeat(it.diff) + '<i>' + '›'.repeat(5 - it.diff) + '</i>';
            const st = t.querySelector('.st');
            st.innerHTML = it.open ? (it.sel ? Lang.t('stm.selected') : Lang.t('stm.select'))
                : `<img src="assets/ui/ic-trophy.webp" alt="">${it.price.toLocaleString('ru-RU').replace(/ /g, ' ')}${it.ads ? `<span class="tad">▶ ${it.seen ? it.seen + '/' : ''}${it.ads}</span>` : ''}`;
            let d = /** @type {HTMLElement} */ (t.querySelector('.done'));
            if (it.done && !d) { d = /** @type {HTMLElement} */ (document.createElement('div')); d.className = 'done'; t.appendChild(d); }
            if (d) { d.textContent = it.done ? (it.place ? '#' + it.place : Lang.t('stm.done')) : ''; d.style.display = it.done ? '' : 'none'; }
        });
        this.setPoints(model.points);
        this.el.linfo.innerHTML = model.info;
        const go = /** @type {HTMLButtonElement} */ (this.el.lgo);
        go.textContent = model.action.label;
        go.disabled = !model.action.enabled;
        const ad = /** @type {HTMLButtonElement} */ (this.el.lad), a = model.adAction;
        ad.style.display = a && a.show ? '' : 'none';
        if (a && a.show) { ad.innerHTML = '<span class="adtag">▶</span>' + a.label; ad.disabled = !a.enabled; }
        const sel = g.querySelector('.ticket.sel');
        if (sel && model.scroll) sel.scrollIntoView({ block: 'nearest' });
    },

    // Схема трассы сверху: детали карты — серые плиты с красной кромкой, трамплины — лайм, на фоне моря.
    _drawThumbs() {
        const g = this.el.grid;
        if (!g || typeof GAME_MAPS === 'undefined') return;
        g.querySelectorAll('.ticket').forEach((t) => {
            const id = /** @type {HTMLElement} */ (t).dataset.id, cv = /** @type {HTMLCanvasElement} */ (t.querySelector('canvas'));
            const map = GAME_MAPS.find(m => m.id === id);
            if (!cv || !map) return;
            const ctx = cv.getContext('2d');
            if (!ctx) return;
            const W = cv.width, H = cv.height;
            const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#2a87b5'); bg.addColorStop(1, '#155277');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(255,255,255,.06)';
            for (let i = 0; i < 6; i++) ctx.fillRect(0, i * H / 6 + 4, W, 1);
            const parts = map.objects.filter(o => o.kind !== 'marker' && /models\/obby\//.test(o.model || ''));
            if (!parts.length) return;
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            for (const o of parts) { const r = Math.max(o.scale[0], o.scale[2]) * 50; x0 = Math.min(x0, o.x - r); x1 = Math.max(x1, o.x + r); y0 = Math.min(y0, o.y - r); y1 = Math.max(y1, o.y + r); }
            const k = Math.min((W - 16) / (x1 - x0), (H - 16) / (y1 - y0));
            const ox = (W - (x1 - x0) * k) / 2 - x0 * k, oy = (H - (y1 - y0) * k) / 2 - y0 * k;
            const sorted = parts.slice().sort((a, b) => a.h - b.h);
            for (const pass of [0, 1]) for (const o of sorted) {
                const type = (o.model.split('/').pop() || '').split('_')[0].replace('.glb', '');
                if (['spinner', 'hammer', 'arrow', 'fence'].includes(type)) continue;
                const L = o.scale[0] * 100 * k, Wd = (type === 'cyl' ? o.scale[0] : o.scale[2]) * 100 * k;
                ctx.save(); ctx.translate(ox + o.x * k, oy + o.y * k); ctx.rotate((o.rot[1] || 0) * Math.PI / 180);
                const tilt = Math.cos((o.rot[2] || 0) * Math.PI / 180);
                const Lx = L * Math.abs(tilt);
                if (pass === 0) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-Lx / 2 + 2, -Wd / 2 + 3, Lx, Wd); }
                else {
                    ctx.fillStyle = type === 'ramp' ? '#c5ef5c' : type === 'boost' ? '#9ff3ff' : /tire=1/.test(o.name) ? '#111' : /kill|lava/.test(type) ? '#ff5a1a' : (o.name || '').startsWith('start') ? '#d9d6ce' : '#6b6f77';
                    if (type === 'cyl' && !/tire=1/.test(o.name)) { ctx.beginPath(); ctx.arc(0, 0, Lx / 2, 0, 6.3); ctx.fill(); }
                    else ctx.fillRect(-Lx / 2, -Wd / 2, Lx, Wd);
                    if (type === 'box' && Wd > 3) { ctx.fillStyle = '#e0383d'; ctx.fillRect(-Lx / 2, -Wd / 2, Lx, Math.max(1, Wd * 0.12)); ctx.fillRect(-Lx / 2, Wd / 2 - Math.max(1, Wd * 0.12), Lx, Math.max(1, Wd * 0.12)); }
                }
                ctx.restore();
            }
            const fin = map.objects.find(o => o.name === 'finish'), sp = map.objects.find(o => o.name === 'spawn');
            for (const [o, c] of /** @type {Array<[any, string]>} */ ([[sp, '#c5ef5c'], [fin, '#ffffff']])) if (o) { ctx.fillStyle = c; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox + o.x * k, oy + o.y * k, 5, 0, 6.3); ctx.fill(); ctx.stroke(); }
        });
    },

    // ---------------------------------------------------------------------------------------------
    // Гараж
    // ---------------------------------------------------------------------------------------------

    /** model: { name, cls, bars: { speed, accel, grip, air }, open, lockText, index, total, go: { label, enabled } } */
    renderGarage(model) {
        this.el.gname.textContent = model.name;
        this.el.gcl.textContent = model.cls;
        const row = (k, v) => `<div class="stat"><span>${Lang.t('stm.' + k)}</span><div class="tr"><i style="width:${Math.round(v * 100)}%"></i></div></div>`;
        this.el.gstats.innerHTML = row('speed', model.bars.speed) + row('accel', model.bars.accel) + row('grip', model.bars.grip) + row('air', model.bars.air);
        this.el.glock.className = 'lk' + (model.open ? ' ok' : '');
        this.el.glock.innerHTML = model.open ? '✓ ' + Lang.t('stm.carFree')
            : `<img class="ico" src="assets/ui/ic-lights.webp" alt=""><span>${model.lockText}</span><i class="adbar"><b style="width:${Math.round((model.adProgress || 0) * 100)}%"></b></i>`;
        this.el.gdots.innerHTML = Array.from({ length: model.total }, (_, i) => `<i class="${i === model.index ? 'on' : ''}"></i>`).join('');
        const go = /** @type {HTMLButtonElement} */ (this.el.ggo);
        go.innerHTML = (model.go.ad ? '<span class="adtag">▶</span>' : '') + model.go.label;
        go.disabled = !model.go.enabled;
        go.classList.toggle('adbtn', !!model.go.ad);
        const ps = model.paints || [], cur = ps.find(p => p.sel);
        this.el.gpaints.innerHTML = ps.length ? `<span class="pl">${Lang.t('stm.paint')}: ${cur ? cur.name : ''}</span>`
            + ps.map(p => `<button data-p="${p.id}" class="${p.sel ? 'sel' : ''}${p.owned ? '' : ' lock'}" style="background:${p.color}" title="${p.name}" aria-label="${p.name}"></button>`).join('') : '';
    },

    // ---------------------------------------------------------------------------------------------
    // Меню: подарок дня, колесо фортуны, рекорды
    // ---------------------------------------------------------------------------------------------

    _num(n) { return Math.floor(n).toLocaleString('ru-RU').replace(/[  ]/g, ' '); },

    /** Красные точки на кнопках меню: { gift, wheel } — подарок можно забрать, бесплатное вращение готово. */
    setBadges(b) {
        this.el.gift.classList.toggle('badge', !!b.gift);
        this.el.wheel.classList.toggle('badge', !!b.wheel);
    },

    /** Сохранения больше не пишутся (игру открыли во второй вкладке или на другом устройстве): только перезагрузка. */
    saveConflict() { this.el.mconflict.classList.add('on'); },

    /** Кнопка «Рекорды» (только там, где есть лидерборд площадки). */
    setRecords(on) { this.el.rec.style.display = on ? '' : 'none'; },

    isOpen(k) { return !!(this.el[k] && this.el[k].classList.contains('on')); },

    close(k) {
        if (!this.isOpen(k)) return;
        this.el[k].classList.remove('on');
        if (this.h.onClosed) this.h.onClosed(k);
    },

    /** Esc: закрыть верхнее окно меню (рекорды, подарок, колесо, «Как играть», настройки). true — закрыто. */
    closeTop() {
        for (const k of ['mrec', 'mgift', 'mwheel', 'mhelp', 'msettings']) {
            if (!this.isOpen(k)) continue;
            if (k === 'mhelp') this.help(false);
            else if (k === 'msettings') this.settings(false);
            else this.close(k);
            return true;
        }
        return false;
    },

    /**
     * Окно подарка дня (null — закрыть). m: { days: [{ dayLabel, state, d7, kind: 'points' | 'car' | 'paint', amount, carToo,
     * color, title, tag, hint }], claim: { show, enabled, label }, x2: { show, enabled, label }, hint }.
     */
    gift(m) {
        if (!m) { this.close('mgift'); return; }
        this.el.gtitle.innerHTML = Lang.t('stm.giftTitle');
        const icon = (d) => (d.kind === 'paint' ? STM_ICONS.car(d.color) : d.kind === 'car' ? STM_ICONS.car('') : '<img src="assets/ui/ic-trophy.webp" alt="">');
        this.el.gdays.innerHTML = m.days.map((d) => (d.d7
            ? `<div class="day d7 ${d.state}"><div class="di">${icon(d)}</div><div class="dt"><span class="dn">${d.dayLabel}</span>${d.tag ? `<span class="ex">${d.tag}</span>` : ''}<span class="dv">${d.title}</span><span class="dh">${d.hint}</span></div></div>`
            : `<div class="day ${d.state}"><span class="dn">${d.dayLabel}</span><div class="di">${icon(d)}</div><span class="dv">${this._num(d.amount)}<small>${d.carToo ? Lang.t('stm.plusCar') : Lang.t('stm.pts')}</small></span></div>`)).join('');
        const c = /** @type {HTMLButtonElement} */ (this.el.gclaim), x = /** @type {HTMLButtonElement} */ (this.el.gx2);
        c.style.display = m.claim.show ? '' : 'none'; c.disabled = !m.claim.enabled; c.textContent = m.claim.label;
        x.style.display = m.x2.show ? '' : 'none'; x.disabled = !m.x2.enabled; x.innerHTML = '<span class="adtag">▶</span>' + m.x2.label;
        this.el.ghint.textContent = m.hint || '';
        this.el.mgift.classList.add('on');
    },

    /**
     * Окно колеса (null — закрыть). m: { sectors: [{ kind: 'coins' | 'item', coins }], angle, spinning,
     * free: { enabled, label }, ad: { show, enabled, label }, hint }.
     */
    wheel(m) {
        if (!m) { this.close('mwheel'); return; }
        this.el.wtitle.innerHTML = Lang.t('stm.wheelTitle');
        this._drawDisk(m.sectors);
        if (!m.spinning) this.wheelSpin(m.angle, 0);
        const f = /** @type {HTMLButtonElement} */ (this.el.wfree), a = /** @type {HTMLButtonElement} */ (this.el.wad);
        f.disabled = !m.free.enabled; f.textContent = m.free.label;
        a.style.display = m.ad.show ? '' : 'none'; a.disabled = !m.ad.enabled; a.innerHTML = '<span class="adtag">▶</span>' + m.ad.label;
        this.el.whint.textContent = m.hint || '';
        if (!this.isOpen('mwheel')) this.el.wres.textContent = '';
        this.el.mwheel.classList.add('on');
    },

    /** Диск колеса: секторы равны, сектор 0 — под стрелкой сверху, дальше по часовой (как Wheel.js). */
    _drawDisk(sectors) {
        const key = sectors.map(x => x.kind + x.coins).join(',') + Lang.code;
        if (this._diskKey === key) return;
        this._diskKey = key;
        const n = sectors.length, step = 360 / n, R = 140;
        const pt = (deg, r) => { const a = deg * Math.PI / 180; return (Math.sin(a) * r).toFixed(2) + ' ' + (-Math.cos(a) * r).toFixed(2); };
        let out = '<circle r="149" fill="#101215"/>';
        sectors.forEach((sc, i) => {
            const hot = sc.kind === 'item' || sc.coins >= 2500;
            out += `<path d="M0 0L${pt(i * step - step / 2, R)}A${R} ${R} 0 0 1 ${pt(i * step + step / 2, R)}Z" fill="${hot ? '#c5ef5c' : i % 2 ? '#2b2f37' : '#1f2228'}" stroke="#101215" stroke-width="2"/>`;
            const ink = hot ? '#15180f' : '#c5ef5c';
            const body = sc.kind === 'item'
                ? STM_ICONS.car('#f3f5f2').replace('<svg ', '<svg x="-24" y="-128" width="48" height="33" ') + `<text y="-76" text-anchor="middle" font-size="15" font-weight="700" fill="${ink}">${Lang.t('stm.carPrize').toUpperCase()}</text>`
                : `<text y="-98" text-anchor="middle" font-size="27" font-weight="700" fill="${ink}">${this._num(sc.coins)}</text><text y="-80" text-anchor="middle" font-size="12" fill="${hot ? '#15180f' : '#f3f5f2'}">${Lang.t('stm.pts').toUpperCase()}</text>`;
            out += `<g transform="rotate(${i * step})">${body}</g>`;
        });
        out += `<circle r="${R}" fill="none" stroke="#c5ef5c" stroke-width="6"/>`;
        for (let i = 0; i < n; i++) out += `<circle transform="translate(${pt(i * step - step / 2, R)})" r="4" fill="#f3f5f2"/>`;
        out += '<circle r="27" fill="#17191e" stroke="#c5ef5c" stroke-width="4"/><circle r="9" fill="#c5ef5c"/>';
        this.el.wdisk.innerHTML = out;
    },

    /** Повернуть диск до angle градусов (по часовой) за ms; 0 — сразу. */
    wheelSpin(angle, ms) {
        const d = this.el.wdisk;
        d.style.transition = ms ? `transform ${ms}ms cubic-bezier(.12,.62,.1,1)` : 'none';
        d.style.transform = `rotate(${angle}deg)`;
        if (ms) this.el.wres.textContent = '';
    },

    wheelResult(text) {
        const r = this.el.wres;
        r.textContent = text;
        r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop');
    },

    /** Окно рекордов: { loading } или { list: [{ rank, name, score, me, avatar? }], canLogin }. */
    records(m) {
        const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
        const list = m.list || [];
        this.el.rlist.innerHTML = m.loading ? `<div class="lb-empty">${Lang.t('stm.wait')}</div>`
            : !list.length ? `<div class="lb-empty">${Lang.t('stm.noRecords')}</div>`
                : list.map((r) => `<div class="lrow${r.me ? ' me' : ''}${r.rank <= 3 ? ' top' : ''}"><span class="rk">${esc(r.rank)}</span>`
                    + (r.avatar ? `<img class="av" src="${esc(r.avatar)}" alt="">` : `<span class="av">${esc(String(r.name || '?').slice(0, 1).toUpperCase())}</span>`)
                    + `<span class="nm">${esc(r.name || '—')}</span><span class="sc">${this._num(Number(r.score) || 0)}</span></div>`).join('');
        this.el.rlogin.style.display = !m.loading && m.canLogin ? '' : 'none';
        this.el.mrec.classList.add('on');
    },

    // ---------------------------------------------------------------------------------------------
    // Заезд
    // ---------------------------------------------------------------------------------------------

    setRace(place, total) { this.el.place.textContent = String(place); this.el.of.textContent = '/' + total; },
    setRunPoints(n) { this.el.rpts.textContent = String(Math.floor(n)); },
    setSpeed(kmh, nitro, nitroOn) {
        this.el.spd.textContent = String(Math.max(0, Math.round(kmh)));
        this.el.nfill.style.width = Math.round(nitro * 100) + '%';
        this.el.nitro.classList.toggle('on', !!nitroOn);
    },

    /** Прогресс: me 0..1, ticks — доли чекпоинтов, rivals — доли ботов. */
    setProgress(me, ticks, rivals) {
        const p = this.el.prog;
        this.el.pfill.style.width = (me * 100).toFixed(1) + '%';
        if (p.dataset.ticks !== String(ticks.length)) {
            p.querySelectorAll('.tick').forEach(n => n.remove());
            for (const t of ticks) { const n = document.createElement('i'); n.className = 'tick'; n.style.left = (t * 100) + '%'; p.appendChild(n); }
            p.dataset.ticks = String(ticks.length);
        }
        let dots = p.querySelectorAll('.dot:not(.me)');
        if (dots.length !== rivals.length) {
            p.querySelectorAll('.dot').forEach(n => n.remove());
            for (let i = 0; i < rivals.length; i++) { const n = document.createElement('i'); n.className = 'dot'; p.appendChild(n); }
            const me2 = document.createElement('i'); me2.className = 'dot me'; p.appendChild(me2);
            dots = p.querySelectorAll('.dot:not(.me)');
        }
        rivals.forEach((r, i) => { /** @type {HTMLElement} */ (dots[i]).style.left = (r * 100).toFixed(1) + '%'; });
        const meDot = /** @type {HTMLElement} */ (p.querySelector('.dot.me'));
        if (meDot) meDot.style.left = (me * 100).toFixed(1) + '%';
    },

    /** Всплывающий трюк: «САЛЬТО +60». */
    pop(text, pts) {
        const box = this.el.pops;
        if (!box) return;
        const n = document.createElement('div');
        n.className = 'pop';
        n.innerHTML = text + (pts ? `<em>+${pts}</em>` : '');
        box.appendChild(n);
        while (box.childElementCount > 3) box.firstChild.remove();
        setTimeout(() => n.remove(), 1500);
    },

    /** Отсчёт: 3, 2, 1, 'go' или null — убрать. */
    count(v) {
        const c = this.el.count;
        c.classList.remove('on', 'go');
        if (v == null) return;
        void c.offsetWidth;
        c.textContent = v === 'go' ? Lang.t('stm.go') : String(v);
        c.classList.add('on');
        if (v === 'go') c.classList.add('go');
    },

    toast(text, ms) {
        const t = this.el.toast;
        t.textContent = text;
        t.classList.add('on');
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => t.classList.remove('on'), ms || 1800);
    },

    // ---------------------------------------------------------------------------------------------
    // Окна
    // ---------------------------------------------------------------------------------------------

    _toggles(box, opts) {
        const q = opts.quality;
        box.innerHTML = `<div class="tg"><span>${Lang.t('stm.sound')}</span><button data-a="sfx" class="${opts.sfx ? 'on' : ''}">${opts.sfx ? 'ON' : 'OFF'}</button></div>
<div class="tg"><span>${Lang.t('stm.music')}</span><button data-a="music" class="${opts.music ? 'on' : ''}">${opts.music ? 'ON' : 'OFF'}</button></div>
<div class="tg"><span>${Lang.t('stm.quality')}</span><button data-a="quality" class="on">${Lang.t('stm.q.' + q)}</button></div>`;
        box.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
            e.stopPropagation(); this.click();
            if (this.h.onToggle) this.h.onToggle(/** @type {HTMLElement} */ (b).dataset.a);
        }));
    },

    pause(on, opts) {
        this.el.mpause.classList.toggle('on', !!on);
        if (on && opts) this._toggles(this.el.ptoggles, opts);
    },

    settings(on, opts) {
        this.el.msettings.classList.toggle('on', !!on);
        if (on) this._toggles(this.el.stoggles, opts || (this.h.toggleState ? this.h.toggleState() : { sfx: true, music: true, quality: 'auto' }));
    },

    refreshToggles(opts) {
        if (this.el.mpause.classList.contains('on')) this._toggles(this.el.ptoggles, opts);
        if (this.el.msettings.classList.contains('on')) this._toggles(this.el.stoggles, opts);
    },

    help(on) {
        this.el.mhelp.classList.toggle('on', !!on);
        if (!on) { if (this.h.onHelpClosed) this.h.onHelpClosed(); return; }
        const k = (...keys) => `<span class="kc">${keys.map(x => `<kbd>${x}</kbd>`).join('')}</span>`;
        const ru = Lang.code !== 'en';
        this.el.hkeys.innerHTML = [
            [k('W', 'S', '↑', '↓'), Lang.t('stm.help.drive')], [k('A', 'D', '←', '→'), Lang.t('stm.help.steer')],
            [k('Shift'), Lang.t('stm.help.nitro')], [k(ru ? 'Пробел' : 'Space'), Lang.t('stm.help.hand')],
            [k('Esc', 'Tab'), Lang.t('stm.help.pause')],
            ['✈', Lang.t('stm.help.air')],
        ].map(([a, b]) => `<div>${a}</div><div>${b}</div>`).join('');
    },

    /** Результат: data { place, total, track, stunts, bonus, sum, hasNext }, кнопки — обработчики. */
    results(data, on) {
        const c = this.el.rescard;
        const f = (n) => '+' + Math.floor(n).toLocaleString('ru-RU').replace(/ /g, ' ');
        c.innerHTML = `<h2>${Lang.t('stm.finished')}</h2>
<div class="medal p${data.place}"><b>#${data.place}</b><img src="assets/ui/ic-trophy.webp" alt=""><span>${Lang.t('stm.place')} ${data.place} / ${data.total}</span></div>
<div class="res"><span>${Lang.t('stm.rTrack')}</span><span>${f(data.track)}</span><span>${Lang.t('stm.rStunts')}</span><span>${f(data.stunts)}</span>
<span>${Lang.t('stm.rPlace', { n: data.place })}</span><span>${f(data.bonus)}</span><span class="tot">${Lang.t('stm.rTotal')}</span><span class="tot">${f(data.sum)}</span></div>
<div class="row">${data.hasNext ? `<button class="btn lime big" data-r="next">${Lang.t('stm.nextLevel')}</button>` : `<button class="btn lime big" data-r="levels">${Lang.t('stm.toLevels')}</button>`}</div>
<div class="row"><button class="btn" data-r="again">${Lang.t('stm.again')}</button><button class="btn" data-r="garage">${Lang.t('stm.garage')}</button>${data.hasNext ? `<button class="btn" data-r="levels">${Lang.t('stm.toLevels')}</button>` : ''}</div>`;
        c.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); this.click(); const fn = on[/** @type {HTMLElement} */ (b).dataset.r]; if (fn) fn(); }));
        this.el.mres.classList.add('on');
    },

    hideResults() { this.el.mres.classList.remove('on'); },
};
