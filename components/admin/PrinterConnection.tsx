import React, { useState } from 'react';
import { Printer, Check, X, Smartphone } from 'lucide-react';
import { bluetoothPrinter } from '../../utils/bluetoothPrinter';

const PrinterConnection: React.FC = () => {
    const [isConnected, setIsConnected] = useState(bluetoothPrinter.isConnected());
    const [isConnecting, setIsConnecting] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const handleConnect = async () => {
        setIsConnecting(true);
        setStatusMsg('Mencari printer...');
        try {
            const success = await bluetoothPrinter.connect();
            setIsConnected(success);
            if (success) {
                setStatusMsg('Terhubung ke Printer!');
                setTimeout(() => setStatusMsg(''), 3000);
            } else {
                setStatusMsg('Gagal menghubungkan.');
            }
        } catch (err) {
            setStatusMsg('Error: ' + (err as any).message);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleTestPrint = async () => {
        try {
            await bluetoothPrinter.printTest();
            setStatusMsg('Test Print dikirim!');
            setTimeout(() => setStatusMsg(''), 3000);
        } catch (err: any) {
            setStatusMsg('Gagal print: ' + err.message);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <div className={`
                flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
            `}>
                <Printer className="w-5 h-5" />
                <span className="text-sm font-bold hidden md:inline">
                    {isConnected ? 'Printer Ready' : 'Printer Disconnected'}
                </span>
            </div>

            {!isConnected ? (
                <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="p-2 bg-brewasa-dark text-white rounded-lg hover:bg-brewasa-copper transition-colors disabled:opacity-50"
                    title="Connect Bluetooth Printer"
                >
                    {isConnecting ? <span className="animate-spin">⌛</span> : 'Connect'}
                </button>
            ) : (
                <button
                    onClick={handleTestPrint}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    title="Test Print"
                >
                    Test
                </button>
            )}

            {statusMsg && (
                <span className="text-xs text-gray-500 absolute top-full mt-1 right-0 bg-white shadow p-1 rounded border">
                    {statusMsg}
                </span>
            )}
        </div>
    );
};

export default PrinterConnection;
