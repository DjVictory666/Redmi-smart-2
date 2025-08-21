let connectedDevice = null;
let gattServer = null;
let timeCharacteristic = null;
let stepCharacteristic = null;
let heartRateCharacteristic = null;

const statusDiv = document.querySelector('#status');

async function connectBand() {
    try {
        connectedDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'Band' }],
            optionalServices: ['current_time', 'heart_rate'] // standard UUIDk
        });

        connectedDevice.addEventListener('gattserverdisconnected', () => {
            statusDiv.textContent += '\n🔌 Karkötő leválasztva!';
        });

        gattServer = await connectedDevice.gatt.connect();
        const timeService = await gattServer.getPrimaryService('current_time');
        timeCharacteristic = await timeService.getCharacteristic('current_time');

        const hrService = await gattServer.getPrimaryService('heart_rate');
        heartRateCharacteristic = await hrService.getCharacteristic('heart_rate_measurement');

        statusDiv.textContent = `✅ Csatlakozva: ${connectedDevice.name}`;

        // Automatikus időszinkron
        syncTimeWithPhone();

    } catch (error) {
        statusDiv.textContent += `\n❌ Hiba a csatlakozáskor: ${error}`;
        console.error(error);
    }
}

// Automatikus szinkron a telefon idejével
async function syncTimeWithPhone() {
    if (!gattServer || !timeCharacteristic) return;
    const now = new Date();
    writeTime(now.getFullYear(), now.getMonth()+1, now.getDate(),
              now.getHours(), now.getMinutes(), now.getSeconds());
}

// Manuális időszinkron
async function syncCustomTime() {
    if (!gattServer || !timeCharacteristic) await connectBand();
    const dateStr = document.querySelector('#dateInput').value;
    const timeStr = document.querySelector('#timeInput').value;

    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute, second] = timeStr.split(':').map(Number);
        writeTime(year, month, day, hour, minute, second);
    } catch {
        statusDiv.textContent += '\n❌ Hibás dátum vagy idő!';
    }
}

function writeTime(year, month, day, hour, minute, second) {
    if (!timeCharacteristic) return;

    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = hétfő

    const buffer = new ArrayBuffer(10);
    const view = new DataView(buffer);
    view.setUint16(0, year, true);
    view.setUint8(2, month);
    view.setUint8(3, day);
    view.setUint8(4, hour);
    view.setUint8(5, minute);
    view.setUint8(6, second);
    view.setUint8(7, dayOfWeek);
    view.setUint8(8, 0); // fraction256
    view.setUint8(9, 0); // adjust reason

    timeCharacteristic.writeValue(buffer)
        .then(() => statusDiv.textContent += `\n⏰ Idő frissítve: ${year}-${month}-${day} ${hour}:${minute}:${second}`)
        .catch(err => statusDiv.textContent += `\n⚠️ Nem sikerült beállítani az időt: ${err}`);
}

// Adatok kiolvasása
async function readData() {
    if (!heartRateCharacteristic) {
        statusDiv.textContent += '\n⛔ Pulzus karakterisztika nem elérhető.';
        return;
    }

    // Pulzus olvasása
    const hrValue = await heartRateCharacteristic.readValue();
    const heartRate = hrValue.getUint8(1); // egyszerűsített olvasás
    statusDiv.textContent += `\n❤️ Pulzus: ${heartRate} bpm`;

    // Lépésszám: itt csak példa, mert a Redmi custom UUID-t használ
    statusDiv.textContent += '\n👣 Lépésszám kiolvasásához custom UUID szükséges (nem publikus)';
}

// Gombok eseménykezelői
document.querySelector('#connectBtn').addEventListener('click', connectBand);
document.querySelector('#autoSyncBtn').addEventListener('click', syncTimeWithPhone);
document.querySelector('#manualSyncBtn').addEventListener('click', syncCustomTime);
document.querySelector('#readDataBtn').addEventListener('click', readData);
