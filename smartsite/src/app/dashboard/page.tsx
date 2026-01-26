"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertTriangle, RefreshCw, Activity, Zap, Pause } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkerHealthCard, WorkerHealthCardSkeleton } from "@/components/ui/worker-health-card";
import { WorkerDetailModal } from "@/components/ui/worker-detail-modal";
import { useRealtimeWorkers } from "@/lib/realtime";
import type { WorkerVitals } from "@/types/worker";
import { cn } from "@/lib/utils";

// Helper: Clamp value within range
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

// Helper: Apply small drift to a value (realistic gradual change)
function drift(current: number, min: number, max: number, maxDelta: number): number {
    const change = (Math.random() - 0.5) * 2 * maxDelta;
    return clamp(current + change, min, max);
}

// Generate initial simulated worker with varied risk profiles
function generateInitialWorker(id: number): WorkerVitals {
    const riskProfile = id % 4; // 0,1 = low, 2 = medium, 3 = high

    let baseHeartRate: number;
    let baseTemp: number;
    let baseStress: number;
    let baseHrv: number;
    let initialCisScore: number;
    let initialRiskState: "LOW" | "MEDIUM" | "HIGH";

    if (riskProfile === 3) {
        // HIGH RISK worker
        baseHeartRate = 115 + Math.random() * 20;
        baseTemp = 38.0 + Math.random() * 1.2;
        baseStress = 70 + Math.random() * 25;
        baseHrv = 15 + Math.random() * 10;
        initialCisScore = Math.round(10 + Math.random() * 25);
        initialRiskState = "HIGH";
    } else if (riskProfile === 2) {
        // MEDIUM RISK worker
        baseHeartRate = 95 + Math.random() * 15;
        baseTemp = 37.3 + Math.random() * 0.8;
        baseStress = 45 + Math.random() * 25;
        baseHrv = 25 + Math.random() * 15;
        initialCisScore = Math.round(40 + Math.random() * 25);
        initialRiskState = "MEDIUM";
    } else {
        // LOW RISK worker
        baseHeartRate = 65 + Math.random() * 20;
        baseTemp = 36.3 + Math.random() * 0.6;
        baseStress = 15 + Math.random() * 30;
        baseHrv = 40 + Math.random() * 30;
        initialCisScore = Math.round(75 + Math.random() * 25);
        initialRiskState = "LOW";
    }

    return {
        workerId: `WK-${String(1000 + id).padStart(4, "0")}`,
        heartRate: Math.round(baseHeartRate),
        hrv: Math.round(baseHrv),
        temperature: Math.round(baseTemp * 10) / 10,
        jerkCount: riskProfile === 3 ? Math.round(Math.random() * 5) : 0,
        machineStressIndex: Math.round(baseStress),
        vibrationRms: 0.5 + Math.random() * (riskProfile === 3 ? 2 : 1),
        cisScore: initialCisScore,
        riskState: initialRiskState,
        breakFlag: false,
        lastUpdated: new Date().toISOString(),
    };
}

// Apply gradual drift to existing worker
function applyRealisticDrift(worker: WorkerVitals): WorkerVitals {
    const newHeartRate = drift(worker.heartRate, 55, 140, 3);
    const newHrv = drift(worker.hrv, 15, 80, 4);
    const newTemp = drift(worker.temperature, 35.5, 39.5, 0.1);
    const newStress = drift(worker.machineStressIndex, 0, 100, 5);
    const newVibration = drift(worker.vibrationRms, 0.2, 3.5, 0.15);
    const newJerkCount = Math.random() < 0.05 ? worker.jerkCount + 1 : worker.jerkCount;

    let cisScore = 100;
    if (newHeartRate > 120) cisScore -= 30;
    else if (newHeartRate > 100) cisScore -= 15;
    else if (newHeartRate < 55) cisScore -= 20;
    if (newHrv < 20) cisScore -= 25;
    else if (newHrv < 35) cisScore -= 10;
    if (newTemp > 38.5) cisScore -= 30;
    else if (newTemp > 37.8) cisScore -= 15;
    else if (newTemp < 35.8) cisScore -= 15;
    if (newStress > 75) cisScore -= 20;
    else if (newStress > 50) cisScore -= 10;
    cisScore = clamp(cisScore, 0, 100);

    let riskState: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (cisScore <= 35) riskState = "HIGH";
    else if (cisScore <= 65) riskState = "MEDIUM";

    return {
        ...worker,
        heartRate: Math.round(newHeartRate),
        hrv: Math.round(newHrv),
        temperature: Math.round(newTemp * 10) / 10,
        jerkCount: newJerkCount,
        machineStressIndex: Math.round(newStress),
        vibrationRms: Math.round(newVibration * 100) / 100,
        cisScore: Math.round(cisScore),
        riskState,
        lastUpdated: new Date().toISOString(),
    };
}

function generateSimulatedWorkers(count: number): WorkerVitals[] {
    return Array.from({ length: count }, (_, i) => generateInitialWorker(i));
}

/**
 * Main dashboard page with simulation mode
 */
export default function DashboardPage() {
    const { workers: apiWorkers, status, error, issueBreak, reconnect, isLoading } = useRealtimeWorkers({
        updateInterval: 5000,
        initialWorkerCount: 12,
    });

    const [isSimulating, setIsSimulating] = useState(false);
    const [simulatedWorkers, setSimulatedWorkers] = useState<WorkerVitals[]>([]);
    const simulationRef = useRef<NodeJS.Timeout | null>(null);
    const [loadingBreaks, setLoadingBreaks] = useState<Set<string>>(new Set());
    const [selectedWorker, setSelectedWorker] = useState<WorkerVitals | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const workers = isSimulating ? simulatedWorkers : apiWorkers;

    const toggleSimulation = useCallback(() => {
        if (isSimulating) {
            if (simulationRef.current) {
                clearInterval(simulationRef.current);
                simulationRef.current = null;
            }
            setIsSimulating(false);
            toast.info("Simulation Stopped", { description: "Switched back to live ESP32 data" });
        } else {
            setSimulatedWorkers(generateSimulatedWorkers(8));
            simulationRef.current = setInterval(() => {
                setSimulatedWorkers(prev => prev.map(w => applyRealisticDrift(w)));
            }, 2000);
            setIsSimulating(true);
            toast.success("Simulation Started", { description: "Realistic gradual data changes every 2 seconds" });
        }
    }, [isSimulating]);

    useEffect(() => {
        return () => {
            if (simulationRef.current) clearInterval(simulationRef.current);
        };
    }, []);

    const handleCardClick = (worker: WorkerVitals) => {
        setSelectedWorker(worker);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => setSelectedWorker(null), 300);
    };

    const handleIssueBreak = async (workerId: string) => {
        setLoadingBreaks((prev) => new Set(prev).add(workerId));
        const success = await issueBreak(workerId);
        if (success) {
            toast.success("Break Issued", { description: `Break flag set for worker ${workerId}` });
        } else {
            toast.error("Failed to Issue Break", { description: "Please try again or contact support" });
        }
        setLoadingBreaks((prev) => {
            const next = new Set(prev);
            next.delete(workerId);
            return next;
        });
    };

    const highRiskCount = workers.filter((w) => w.riskState === "HIGH").length;
    const mediumRiskCount = workers.filter((w) => w.riskState === "MEDIUM").length;
    const lowRiskCount = workers.filter((w) => w.riskState === "LOW").length;
    const totalWorkers = workers.length;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 border border-white/20">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Worker Monitoring</h1>
                        <p className="text-sm text-gray-400">
                            {isSimulating ? "Running simulation mode" : "Real-time health vitals from ESP32 sensors"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {status === "error" && error && !isSimulating && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            {error}
                        </div>
                    )}
                    <Button
                        variant={isSimulating ? "destructive" : "outline"}
                        size="sm"
                        onClick={toggleSimulation}
                        className={cn(
                            isSimulating
                                ? "bg-purple-600 hover:bg-purple-700 border-purple-500"
                                : "border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                        )}
                    >
                        {isSimulating ? (
                            <><Pause className="h-4 w-4 mr-2" />Stop Simulation</>
                        ) : (
                            <><Zap className="h-4 w-4 mr-2" />Simulate</>
                        )}
                    </Button>
                    {!isSimulating && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={reconnect}
                            disabled={status === "connecting"}
                            className="border-white/20 text-white hover:bg-white/10"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${status === "connecting" ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-white/10 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Active</p>
                            <p className="text-3xl font-bold text-white mt-1">{totalWorkers}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5">
                            <Users className="h-6 w-6 text-gray-400" />
                        </div>
                    </div>
                    {isSimulating && <div className="absolute top-2 right-2"><Activity className="h-3 w-3 text-purple-400 animate-pulse" /></div>}
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-900/30 to-red-950/30 border border-red-500/20 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-red-400/80 uppercase tracking-wider">High Risk</p>
                            <p className="text-3xl font-bold text-red-400 mt-1">{highRiskCount}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10">
                            <AlertTriangle className="h-6 w-6 text-red-400" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500/30">
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${totalWorkers > 0 ? (highRiskCount / totalWorkers) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-900/20 to-yellow-950/20 border border-yellow-500/20 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-yellow-400/80 uppercase tracking-wider">Medium Risk</p>
                            <p className="text-3xl font-bold text-yellow-400 mt-1">{mediumRiskCount}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/10">
                            <Activity className="h-6 w-6 text-yellow-400" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-500/30">
                        <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${totalWorkers > 0 ? (mediumRiskCount / totalWorkers) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-900/20 to-green-950/20 border border-green-500/20 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-green-400/80 uppercase tracking-wider">Low Risk</p>
                            <p className="text-3xl font-bold text-green-400 mt-1">{lowRiskCount}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                            <Activity className="h-6 w-6 text-green-400" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500/30">
                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${totalWorkers > 0 ? (lowRiskCount / totalWorkers) * 100 : 0}%` }} />
                    </div>
                </div>
            </div>

            {isSimulating && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-sm font-medium text-purple-400">Simulation Active</span>
                    </div>
                    <span className="text-sm text-gray-400">Data refreshes every 2 seconds</span>
                </div>
            )}

            {/* Worker Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {isLoading && !isSimulating ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <motion.div key={`skeleton-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <WorkerHealthCardSkeleton />
                            </motion.div>
                        ))
                    ) : (
                        workers.map((worker, index) => (
                            <motion.div
                                key={worker.workerId}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <WorkerHealthCard
                                    worker={worker}
                                    onIssueBreak={handleIssueBreak}
                                    onClick={handleCardClick}
                                    isBreakLoading={loadingBreaks.has(worker.workerId)}
                                />
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {!isLoading && workers.length === 0 && !isSimulating && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-12 w-12 text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-white">No Workers Connected</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-4">Waiting for sensor data from ESP32 devices</p>
                    <Button variant="outline" onClick={toggleSimulation} className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                        <Zap className="h-4 w-4 mr-2" />Start Simulation
                    </Button>
                </div>
            )}

            <WorkerDetailModal worker={selectedWorker} isOpen={isModalOpen} onClose={handleCloseModal} onIssueBreak={handleIssueBreak} />
        </div>
    );
}
