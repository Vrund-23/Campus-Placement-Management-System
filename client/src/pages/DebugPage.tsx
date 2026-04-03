import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        // Capture console logs
        const originalLog = console.log;
        const originalError = console.error;

        console.log = (...args) => {
            originalLog(...args);
            setLogs(prev => [...prev, `[LOG] ${args.join(' ')}`]);
        };

        console.error = (...args) => {
            originalError(...args);
            setLogs(prev => [...prev, `[ERROR] ${args.join(' ')}`]);
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
        };
    }, []);

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold">Debug Information</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Auth State</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 font-mono text-sm">
                        <div><strong>isLoading:</strong> {String(isLoading)}</div>
                        <div><strong>isAuthenticated:</strong> {String(isAuthenticated)}</div>
                        <div><strong>user:</strong> {JSON.stringify(user, null, 2)}</div>
                        <div><strong>localStorage token:</strong> {localStorage.getItem('token') ? 'Present' : 'Missing'}</div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Console Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
                        {logs.map((log, i) => (
                            <div key={i} className={log.includes('[ERROR]') ? 'text-red-500' : ''}>{log}</div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>API Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 font-mono text-sm">
                        <div><strong>API_URL:</strong> http://localhost:5000</div>
                        <div><strong>/auth/login:</strong> POST</div>
                        <div><strong>/dashboard:</strong> GET (with jwt_token header)</div>
                        <div><strong>/students/me:</strong> GET (with jwt_token header)</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
