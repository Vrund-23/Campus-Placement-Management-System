import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { PlacementStats, BranchPlacement } from "@/types";
import { api } from "@/lib/api";

import { useAcademicYear } from "./AcademicYearContext";

interface PlacementData {
    stats: PlacementStats;
    branchPlacements: BranchPlacement[];
}

interface PlacementStatsContextType {
    data: PlacementData;
    loading: boolean;
    refresh: () => void;
}

const EMPTY_DATA: PlacementData = {
    stats: { totalStudents: 0, placedStudents: 0, activeJobs: 0, companiesVisited: 0 },
    branchPlacements: [],
};

const PlacementStatsContext = createContext<PlacementStatsContextType | undefined>(undefined);

export const PlacementStatsProvider = ({ children }: { children: ReactNode }) => {
    const [data, setData] = useState<PlacementData>(EMPTY_DATA);
    const [loading, setLoading] = useState(true);
    const { selectedYear } = useAcademicYear();

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/stats/overview?academicYear=${selectedYear}`);
            setData({
                stats: res.stats,
                branchPlacements: res.branchPlacements,
            });
        } catch (err) {
            console.error("[PlacementStatsContext] Failed to fetch stats:", err);
            // Keep empty zeros on error — never show stale mock data
            setData(EMPTY_DATA);
        } finally {
            setLoading(false);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return (
        <PlacementStatsContext.Provider value={{ data, loading, refresh: fetchStats }}>
            {children}
        </PlacementStatsContext.Provider>
    );
};

export const usePlacementStats = () => {
    const context = useContext(PlacementStatsContext);
    if (context === undefined) {
        throw new Error("usePlacementStats must be used within a PlacementStatsProvider");
    }
    return context;
};
