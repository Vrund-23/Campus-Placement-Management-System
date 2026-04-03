import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export const ACADEMIC_YEARS = ['2023-24', '2024-25', '2025-26'] as const;
export type AcademicYear = (typeof ACADEMIC_YEARS)[number];

export const CURRENT_ACADEMIC_YEAR = '2025-26';

interface AcademicYearContextType {
    selectedYear: AcademicYear;
    setSelectedYear: (year: AcademicYear) => void;
    isPastYear: (year: string) => boolean;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export const AcademicYearProvider = ({ children }: { children: ReactNode }) => {
    const isPastYear = (year: string) => year !== CURRENT_ACADEMIC_YEAR;
    const [selectedYear, setSelectedYear] = useState<AcademicYear>(() => {
        const saved = localStorage.getItem('selectedAcademicYear');
        return (saved as AcademicYear) || CURRENT_ACADEMIC_YEAR;
    });

    useEffect(() => {
        localStorage.setItem('selectedAcademicYear', selectedYear);
    }, [selectedYear]);

    return (
        <AcademicYearContext.Provider value={{ selectedYear, setSelectedYear, isPastYear }}>
            {children}
        </AcademicYearContext.Provider>
    );
};

export const useAcademicYear = () => {
    const context = useContext(AcademicYearContext);
    if (!context) {
        throw new Error("useAcademicYear must be used within an AcademicYearProvider");
    }
    return context;
};
