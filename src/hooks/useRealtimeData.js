// Custom hook for real-time Firebase data subscription
import { useState, useEffect, useRef } from 'react';
import { database, ref, onValue } from '../firebase';

/**
 * Subscribe to real-time updates from Firebase Realtime Database
 * @param {string} path - The database path to subscribe to
 * @param {boolean} getLatest - If true, returns only the latest entry (for lists)
 * @returns {{ data: any, loading: boolean, error: Error | null }}
 */
export function useRealtimeData(path, getLatest = false) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const previousPath = useRef(path);

    useEffect(() => {
        // Reset state when path changes
        if (previousPath.current !== path) {
            setData(null);
            setLoading(true);
            setError(null);
            previousPath.current = path;
        }

        if (!path) {
            setLoading(false);
            return;
        }

        const dbRef = ref(database, path);

        const unsubscribe = onValue(
            dbRef,
            (snapshot) => {
                try {
                    const value = snapshot.val();

                    if (getLatest && value && typeof value === 'object') {
                        // For lists, get the most recent entry by timestamp field
                        const entries = Object.entries(value);
                        if (entries.length > 0) {
                            // Sort by actual timestamp field in the data (descending - newest first)
                            entries.sort((a, b) => {
                                const tsA = a[1]?.timestamp || 0;
                                const tsB = b[1]?.timestamp || 0;
                                return tsB - tsA;
                            });
                            setData(entries[0][1]);
                        } else {
                            setData(null);
                        }
                    } else {
                        setData(value);
                    }

                    setLoading(false);
                    setError(null);
                } catch (err) {
                    setError(err);
                    setLoading(false);
                }
            },
            (err) => {
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [path, getLatest]);

    return { data, loading, error };
}

/**
 * Subscribe to the latest N entries from a Firebase path
 * @param {string} path - The database path
 * @param {number} limit - Number of entries to retrieve
 * @returns {{ data: Array, loading: boolean, error: Error | null }}
 */
export function useRealtimeHistory(path, limit = 20) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!path) {
            setLoading(false);
            return;
        }

        const dbRef = ref(database, path);

        const unsubscribe = onValue(
            dbRef,
            (snapshot) => {
                try {
                    const value = snapshot.val();

                    if (value && typeof value === 'object') {
                        const entries = Object.entries(value)
                            .map(([key, val]) => ({ id: key, ...val }))
                            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                            .slice(0, limit);

                        setData(entries);
                    } else {
                        setData([]);
                    }

                    setLoading(false);
                    setError(null);
                } catch (err) {
                    setError(err);
                    setLoading(false);
                }
            },
            (err) => {
                setError(err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [path, limit]);

    return { data, loading, error };
}

export default useRealtimeData;
