const admin = require('firebase-admin');
const fs = require('fs');

// --- CONFIGURATION ---
const UPDATE_INTERVAL_MS = 2000; // 2 seconds
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
const MAX_WRITES = 60; // ~2 minutes

// Initialize Firebase
let db = null;

try {
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        const serviceAccount = require(SERVICE_ACCOUNT_PATH);
        const databaseURL = `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`;

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: databaseURL
            });
        }
        console.log("Firebase RTDB initialized for energy simulation.");
        db = admin.database();
    } else {
        console.warn(`WARNING: Service account key not found at ${SERVICE_ACCOUNT_PATH}.`);
        console.warn("Running in DRY RUN mode.");
    }
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

// --- UTILS ---
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

// --- ENERGY STATE PRESETS ---
const STATE_PRESETS = {
    good: {
        voltage: { min: 228, max: 232 },
        current: { min: 0.8, max: 1.5 },
        powerFactor: 0.95,
        baseEnergy: 100
    },
    mediocre: {
        voltage: { min: 215, max: 225 },
        current: { min: 2.0, max: 4.0 },
        powerFactor: 0.85,
        baseEnergy: 150
    },
    faulty: {
        voltage: { min: 180, max: 210 },
        current: { min: 5.0, max: 10.0 },
        powerFactor: 0.70,
        baseEnergy: 250
    }
};

// --- ENERGY SIMULATOR ---
class EnergySimulator {
    constructor() {
        this.state = 'good';
        this.energy = 100;
        this.voltage = 230;
        this.current = 1.0;
    }

    setState(newState) {
        if (STATE_PRESETS[newState]) {
            this.state = newState;
            console.log(`Energy state changed to: ${newState.toUpperCase()}`);
        }
    }

    update() {
        const preset = STATE_PRESETS[this.state];

        // Random walk within preset ranges
        this.voltage = clamp(
            this.voltage + randomFloat(-1, 1),
            preset.voltage.min,
            preset.voltage.max
        );

        this.current = clamp(
            this.current + randomFloat(-0.1, 0.1),
            preset.current.min,
            preset.current.max
        );

        // Calculate power
        const power = this.voltage * this.current * preset.powerFactor;

        // Accumulate energy (kWh)
        this.energy += (power / 1000) * (UPDATE_INTERVAL_MS / 3600000);

        return {
            voltage: parseFloat(this.voltage.toFixed(1)),
            current: parseFloat(this.current.toFixed(2)),
            power: parseFloat(power.toFixed(1)),
            energy: parseFloat(this.energy.toFixed(2)),
            timestamp: admin.database.ServerValue.TIMESTAMP,
            device_type: 'Industrial Motor',
            machine_id: 'PLUG-001',
            state: this.state
        };
    }
}

// --- STATE WATCHER ---
const simulator = new EnergySimulator();

if (db) {
    // Watch for state changes from UI
    db.ref('simulation/energy_state').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.condition) {
            simulator.setState(data.condition);
        }
    });
    console.log("Watching for energy state changes...");
}

// --- MAIN EXECUTION ---
console.log("Starting Energy Simulation...");
console.log(`Update Interval: ${UPDATE_INTERVAL_MS}ms`);

let writeCount = 0;

setInterval(async () => {
    const data = simulator.update();

    if (db) {
        try {
            // Write to live path (single value, always overwritten)
            await db.ref('energy/live').set(data);

            // Also push to history for charts
            await db.ref('energy/history').push(data);

            console.log(`[${new Date().toISOString()}] V: ${data.voltage}V, I: ${data.current}A, P: ${data.power}W, State: ${data.state}`);
        } catch (error) {
            console.error("Error writing to Firebase:", error.message);
        }
    } else {
        console.log(`[DRY RUN] ${JSON.stringify(data)}`);
    }

    writeCount++;
    if (writeCount >= MAX_WRITES) {
        console.log(`Completed ${MAX_WRITES} write cycles. Exiting...`);
        process.exit(0);
    }
}, UPDATE_INTERVAL_MS);

console.log("Energy Simulator running. Press Ctrl+C to stop.");
