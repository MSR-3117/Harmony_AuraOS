const admin = require('firebase-admin');
const fs = require('fs');
const http = require('http');

// --- CONFIGURATION ---
const UPDATE_INTERVAL_MS = 2000; // 2 seconds
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json';
const SIMULATION_ITERATIONS = 10; // Number of cycles per button click

// Initialize Firebase
let db = null;

try {
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        const serviceAccount = require(SERVICE_ACCOUNT_PATH);
        const databaseURL = `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`;
        console.log(`Initializing Realtime Database at: ${databaseURL}`);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: databaseURL
            });
        }
        console.log("Firebase RTDB initialized successfully.");
        db = admin.database();
    } else {
        console.warn(`WARNING: Service account key not found at ${SERVICE_ACCOUNT_PATH}.`);
        process.exit(1);
    }
} catch (e) {
    console.error("Error initializing Firebase:", e);
    process.exit(1);
}

// --- UTILS ---
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

// --- ESP32 HTTP SENDER ---
let esp32Url = null;

function sendToEsp32(data) {
    if (!esp32Url) return;

    const jsonData = JSON.stringify(data);

    // Parse URL - format: "10.64.106.20:8000/machine/data" or "IP:PORT/path"
    let hostname = esp32Url;
    let port = 8000;
    let path = '/machine/data';

    // Check if URL contains path (has / after port)
    const portPathMatch = esp32Url.match(/^([^:]+):(\d+)(\/.*)?$/);
    if (portPathMatch) {
        hostname = portPathMatch[1];
        port = parseInt(portPathMatch[2]) || 8000;
        path = portPathMatch[3] || '/machine/data';
    } else if (esp32Url.includes('/')) {
        // Format: IP/path (no port specified)
        const slashIndex = esp32Url.indexOf('/');
        hostname = esp32Url.substring(0, slashIndex);
        path = esp32Url.substring(slashIndex);
    }

    const options = {
        hostname: hostname,
        port: port,
        path: path,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonData)
        },
        timeout: 5000
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
            console.log(`    → ESP32 [${hostname}:${port}${path}]: ${res.statusCode} ${responseData.substring(0, 50)}`);
        });
    });

    req.on('error', (error) => {
        console.log(`    → ESP32 [${hostname}:${port}${path}]: ${error.code || error.message}`);
    });

    req.on('timeout', () => {
        req.destroy();
        console.log(`    → ESP32 [${hostname}:${port}${path}]: Timeout`);
    });

    req.write(jsonData);
    req.end();
}


// Watch for ESP32 URL changes
db.ref('config/esp32_ip').on('value', (snapshot) => {
    const url = snapshot.val();
    if (url !== esp32Url) {
        esp32Url = url;
        if (url) {
            console.log(`\n✓ ESP32 connected: ${url}`);
        } else {
            console.log('\n✗ ESP32 disconnected');
        }
    }
});

// --- CONDITION PRESETS (Normal/Warning/Critical) ---
const CONDITION_PRESETS = {
    oil_gas: {
        normal: {
            discharge_pressure: { min: 80, max: 100 },
            suction_pressure: { min: 8, max: 12 },
            flow_rate: { min: 1400, max: 1600 },
            gas_composition_ch4: { min: 90, max: 95 },
            gas_composition_co2: { min: 1, max: 2 },
            valve_position: { min: 40, max: 60 },
            pipeline_temperature: { min: 15, max: 30 },
            leak_probability: 0.001
        },
        warning: {
            discharge_pressure: { min: 100, max: 130 },
            suction_pressure: { min: 12, max: 16 },
            flow_rate: { min: 1000, max: 1400 },
            gas_composition_ch4: { min: 85, max: 90 },
            gas_composition_co2: { min: 2, max: 4 },
            valve_position: { min: 30, max: 70 },
            pipeline_temperature: { min: 35, max: 50 },
            leak_probability: 0.02
        },
        critical: {
            discharge_pressure: { min: 130, max: 150 },
            suction_pressure: { min: 16, max: 20 },
            flow_rate: { min: 200, max: 800 },
            gas_composition_ch4: { min: 80, max: 85 },
            gas_composition_co2: { min: 4, max: 5 },
            valve_position: { min: 10, max: 90 },
            pipeline_temperature: { min: 50, max: 60 },
            leak_probability: 0.1
        }
    },

    manufacturing: {
        normal: {
            vibration_rms: { min: 1, max: 3 },
            motor_current: { min: 20, max: 30 },
            bearing_temperature: { min: 40, max: 55 },
            conveyor_speed: { min: 1.2, max: 1.6 },
            power_consumption: { min: 10, max: 15 },
            air_pressure: { min: 6, max: 7 },
            statuses: ['RUNNING']
        },
        warning: {
            vibration_rms: { min: 4, max: 6 },
            motor_current: { min: 30, max: 40 },
            bearing_temperature: { min: 60, max: 75 },
            conveyor_speed: { min: 0.8, max: 1.2 },
            power_consumption: { min: 15, max: 18 },
            air_pressure: { min: 5.5, max: 6 },
            statuses: ['RUNNING', 'MAINTENANCE']
        },
        critical: {
            vibration_rms: { min: 7, max: 10 },
            motor_current: { min: 40, max: 50 },
            bearing_temperature: { min: 75, max: 90 },
            conveyor_speed: { min: 0, max: 0.8 },
            power_consumption: { min: 18, max: 20 },
            air_pressure: { min: 5, max: 5.5 },
            statuses: ['STOPPED', 'MAINTENANCE']
        }
    },

    construction: {
        normal: {
            engine_rpm: { min: 1200, max: 1800 },
            engine_load: { min: 30, max: 60 },
            coolant_temperature: { min: 80, max: 92 },
            oil_pressure: { min: 35, max: 50 },
            hydraulic_pressure: { min: 2800, max: 3500 },
            vehicle_speed: { min: 10, max: 25 },
            fuel_level: { min: 50, max: 100 },
            modes: ['DIGGING', 'LIFT', 'TRAVEL'],
            fault_probability: 0.001
        },
        warning: {
            engine_rpm: { min: 1800, max: 2200 },
            engine_load: { min: 60, max: 80 },
            coolant_temperature: { min: 92, max: 100 },
            oil_pressure: { min: 25, max: 35 },
            hydraulic_pressure: { min: 3500, max: 4200 },
            vehicle_speed: { min: 5, max: 15 },
            fuel_level: { min: 20, max: 50 },
            modes: ['DIGGING', 'IDLE'],
            fault_probability: 0.03
        },
        critical: {
            engine_rpm: { min: 2200, max: 2400 },
            engine_load: { min: 80, max: 100 },
            coolant_temperature: { min: 100, max: 110 },
            oil_pressure: { min: 20, max: 25 },
            hydraulic_pressure: { min: 4200, max: 5000 },
            vehicle_speed: { min: 0, max: 5 },
            fuel_level: { min: 5, max: 20 },
            modes: ['IDLE'],
            fault_probability: 0.15
        }
    }
};

// --- INDUSTRY SIMULATORS ---
class OilGasSimulator {
    constructor(id) {
        this.id = id;
        this.industry = 'oil_gas';
        this.state = {
            discharge_pressure: 90,
            suction_pressure: 10,
            flow_rate: 1500,
            gas_composition_ch4: 92,
            gas_composition_co2: 1.5,
            valve_position: 50,
            pipeline_temperature: 22,
            leak_detected: false
        };
    }

    update(condition = 'normal') {
        const preset = CONDITION_PRESETS.oil_gas[condition] || CONDITION_PRESETS.oil_gas.normal;

        this.state.discharge_pressure = clamp(
            this.state.discharge_pressure + randomFloat(-3, 3),
            preset.discharge_pressure.min, preset.discharge_pressure.max
        );
        this.state.suction_pressure = clamp(
            this.state.suction_pressure + randomFloat(-0.5, 0.5),
            preset.suction_pressure.min, preset.suction_pressure.max
        );
        this.state.flow_rate = clamp(
            this.state.flow_rate + randomFloat(-20, 20),
            preset.flow_rate.min, preset.flow_rate.max
        );
        this.state.gas_composition_ch4 = clamp(
            this.state.gas_composition_ch4 + randomFloat(-0.5, 0.5),
            preset.gas_composition_ch4.min, preset.gas_composition_ch4.max
        );
        this.state.gas_composition_co2 = clamp(
            this.state.gas_composition_co2 + randomFloat(-0.1, 0.1),
            preset.gas_composition_co2.min, preset.gas_composition_co2.max
        );
        this.state.valve_position = clamp(
            this.state.valve_position + randomFloat(-2, 2),
            preset.valve_position.min, preset.valve_position.max
        );
        this.state.pipeline_temperature = clamp(
            this.state.pipeline_temperature + randomFloat(-0.5, 0.5),
            preset.pipeline_temperature.min, preset.pipeline_temperature.max
        );
        this.state.leak_detected = Math.random() < preset.leak_probability;
    }

    getReadings() {
        return {
            ...this.state,
            machine_id: this.id,
            industry: this.industry,
            timestamp: admin.database.ServerValue.TIMESTAMP
        };
    }
}

class ManufacturingSimulator {
    constructor(id) {
        this.id = id;
        this.industry = 'manufacturing';
        this.cycle_count = 0;
        this.state = {
            vibration_rms: 2.0,
            motor_current: 25,
            bearing_temperature: 48,
            conveyor_speed: 1.4,
            cycle_count: 0,
            production_status: 'RUNNING',
            power_consumption: 12,
            air_pressure: 6.5
        };
    }

    update(condition = 'normal') {
        const preset = CONDITION_PRESETS.manufacturing[condition] || CONDITION_PRESETS.manufacturing.normal;

        this.state.vibration_rms = clamp(
            this.state.vibration_rms + randomFloat(-0.2, 0.2),
            preset.vibration_rms.min, preset.vibration_rms.max
        );
        this.state.motor_current = clamp(
            this.state.motor_current + randomFloat(-1, 1),
            preset.motor_current.min, preset.motor_current.max
        );
        this.state.bearing_temperature = clamp(
            this.state.bearing_temperature + randomFloat(-0.5, 0.5),
            preset.bearing_temperature.min, preset.bearing_temperature.max
        );
        this.state.conveyor_speed = clamp(
            this.state.conveyor_speed + randomFloat(-0.05, 0.05),
            preset.conveyor_speed.min, preset.conveyor_speed.max
        );
        this.state.power_consumption = clamp(
            this.state.power_consumption + randomFloat(-0.3, 0.3),
            preset.power_consumption.min, preset.power_consumption.max
        );
        this.state.air_pressure = clamp(
            this.state.air_pressure + randomFloat(-0.05, 0.05),
            preset.air_pressure.min, preset.air_pressure.max
        );

        this.state.production_status = randomChoice(preset.statuses);
        if (this.state.production_status === 'RUNNING') {
            this.cycle_count++;
            this.state.cycle_count = this.cycle_count;
        }
    }

    getReadings() {
        return {
            ...this.state,
            machine_id: this.id,
            industry: this.industry,
            timestamp: admin.database.ServerValue.TIMESTAMP
        };
    }
}

class ConstructionSimulator {
    constructor(id) {
        this.id = id;
        this.industry = 'construction';
        this.state = {
            engine_rpm: 1500,
            engine_load: 45,
            coolant_temperature: 86,
            oil_pressure: 42,
            hydraulic_pressure: 3200,
            vehicle_speed: 15,
            operating_mode: 'DIGGING',
            fuel_level: 75,
            fault_codes: []
        };
    }

    update(condition = 'normal') {
        const preset = CONDITION_PRESETS.construction[condition] || CONDITION_PRESETS.construction.normal;

        this.state.engine_rpm = clamp(
            this.state.engine_rpm + randomInt(-30, 30),
            preset.engine_rpm.min, preset.engine_rpm.max
        );
        this.state.engine_load = clamp(
            this.state.engine_load + randomFloat(-2, 2),
            preset.engine_load.min, preset.engine_load.max
        );
        this.state.coolant_temperature = clamp(
            this.state.coolant_temperature + randomFloat(-0.5, 0.5),
            preset.coolant_temperature.min, preset.coolant_temperature.max
        );
        this.state.oil_pressure = clamp(
            this.state.oil_pressure + randomFloat(-1, 1),
            preset.oil_pressure.min, preset.oil_pressure.max
        );
        this.state.hydraulic_pressure = clamp(
            this.state.hydraulic_pressure + randomFloat(-30, 30),
            preset.hydraulic_pressure.min, preset.hydraulic_pressure.max
        );
        this.state.vehicle_speed = clamp(
            this.state.vehicle_speed + randomFloat(-1, 1),
            preset.vehicle_speed.min, preset.vehicle_speed.max
        );
        this.state.fuel_level = clamp(
            this.state.fuel_level - 0.01,
            preset.fuel_level.min, preset.fuel_level.max
        );

        this.state.operating_mode = randomChoice(preset.modes);

        if (Math.random() < preset.fault_probability && this.state.fault_codes.length < 3) {
            this.state.fault_codes.push(`ERR-${randomInt(100, 999)}`);
        } else if (this.state.fault_codes.length > 0 && Math.random() < 0.05) {
            this.state.fault_codes = [];
        }
    }

    getReadings() {
        return {
            ...this.state,
            machine_id: this.id,
            industry: this.industry,
            timestamp: admin.database.ServerValue.TIMESTAMP
        };
    }
}

// --- SIMULATORS ---
const simulators = {
    oil_gas: new OilGasSimulator('OG-001'),
    manufacturing: new ManufacturingSimulator('MFG-001'),
    construction: new ConstructionSimulator('CONST-001')
};

const COLLECTION_MAP = {
    oil_gas: 'sensor_data_oil_gas',
    manufacturing: 'sensor_data_manufacturing',
    construction: 'sensor_data_construction'
};

// --- SIMULATION RUNNER ---
let isRunning = false;
let shouldStop = false;
let lastTimestamp = 0;

async function runSimulation(industry, condition) {
    if (isRunning) {
        console.log("Simulation already running, skipping...");
        return;
    }

    isRunning = true;
    shouldStop = false;
    let iteration = 0;

    console.log(`\n>>> Starting CONTINUOUS simulation for ${industry.toUpperCase()} - ${condition.toUpperCase()}`);
    if (esp32Url) {
        console.log(`    Sending to ESP32: ${esp32Url}`);
    }
    console.log(`    Press Stop in dashboard to end...\n`);

    const simulator = simulators[industry];
    const collectionName = COLLECTION_MAP[industry];

    while (!shouldStop) {
        iteration++;
        simulator.update(condition);
        const data = simulator.getReadings();

        // Create a clean data object for ESP32 (without ServerValue.TIMESTAMP)
        const esp32Data = {
            ...simulator.state,
            machine_id: simulator.id,
            industry: simulator.industry,
            condition: condition,
            iteration: iteration,
            timestamp: Date.now()
        };

        try {
            // Send to Firebase
            await db.ref(collectionName).push(data);
            console.log(`  [${iteration}] ${industry} - ${condition}`);

            // Send to ESP32 if connected
            sendToEsp32(esp32Data);

        } catch (error) {
            console.error(`  Error on iteration ${iteration}:`, error.message);
        }

        // Wait between iterations
        await new Promise(resolve => setTimeout(resolve, UPDATE_INTERVAL_MS));
    }

    console.log(`\n>>> Stopped after ${iteration} iterations. Waiting for next start...\n`);
    isRunning = false;
}

function stopSimulation() {
    if (isRunning) {
        console.log("\n>>> Stop signal received...");
        shouldStop = true;
    }
}

// --- WATCH FOR BUTTON CLICKS ---
console.log("===========================================");
console.log("  HARMONY AURA OS - Industry Simulation");
console.log("  CONTINUOUS MODE - With Stop Support");
console.log("===========================================");
console.log(`Interval: ${UPDATE_INTERVAL_MS}ms`);
console.log("Waiting for button clicks in the dashboard...\n");

db.ref('simulation/state').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // Check if this is a stop command
    if (data.running === false && isRunning) {
        stopSimulation();
        return;
    }

    // Check if this is a start command (new timestamp + running = true)
    if (data.running === true && data.timestamp && data.timestamp > lastTimestamp) {
        lastTimestamp = data.timestamp;
        const industry = data.industry || 'oil_gas';
        const condition = data.condition || 'normal';

        runSimulation(industry, condition);
    }
});
