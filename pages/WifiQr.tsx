import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const SSID = 'RB Banjarmasin';
const PASSWORD = 'RBBJM123#';
const WIFI_STRING = `WIFI:T:WPA;S:${SSID};P:${PASSWORD};;`;

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const QR_SIZE = 380;
const LOGO_SIZE = 60;

export default function WifiQr() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    generateQr();
  }, []);

  const generateQr = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title: WIFI SCAN HERE
    ctx.fillStyle = '#2D1B0E';
    ctx.font = 'bold 42px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WIFI SCAN HERE', CANVAS_WIDTH / 2, 70);

    // Generate QR to offscreen canvas
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, WIFI_STRING, {
      width: QR_SIZE,
      margin: 2,
      color: {
        dark: '#2D1B0E',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H', // High correction for logo overlay
    });

    // Draw QR centered
    const qrX = (CANVAS_WIDTH - QR_SIZE) / 2;
    const qrY = 110;
    ctx.drawImage(qrCanvas, qrX, qrY, QR_SIZE, QR_SIZE);

    // Draw logo in center of QR
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.onload = () => {
      const logoX = (CANVAS_WIDTH - LOGO_SIZE) / 2;
      const logoY = qrY + (QR_SIZE - LOGO_SIZE) / 2;

      // White circle background for logo
      ctx.beginPath();
      ctx.arc(logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2, LOGO_SIZE / 2 + 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();

      // Draw logo
      ctx.drawImage(logo, logoX, logoY, LOGO_SIZE, LOGO_SIZE);

      // SSID and Password below QR
      const infoY = qrY + QR_SIZE + 50;
      ctx.fillStyle = '#2D1B0E';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`SSID: ${SSID}`, CANVAS_WIDTH / 2, infoY);

      ctx.font = '26px Arial, sans-serif';
      ctx.fillText(`Password: ${PASSWORD}`, CANVAS_WIDTH / 2, infoY + 45);

      // Brewasa branding
      ctx.font = '18px Arial, sans-serif';
      ctx.fillStyle = '#8B6914';
      ctx.fillText('Kopi Brewasa', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

      // Set download URL
      setDownloadUrl(canvas.toDataURL('image/png'));
    };
    logo.src = '/logo-icon.png';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">WiFi QR Code Generator</h1>
      
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded-lg shadow-lg bg-white"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      <div className="mt-6 flex gap-4">
        {downloadUrl && (
          <a
            href={downloadUrl}
            download="wifi-qr-brewasa.png"
            className="px-6 py-3 bg-amber-800 text-white rounded-lg font-medium hover:bg-amber-900 transition-colors"
          >
            Download PNG
          </a>
        )}
        <button
          onClick={() => window.print()}
          className="px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
        >
          Print
        </button>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          canvas, canvas * { visibility: visible; }
          canvas { 
            position: absolute; 
            left: 50%; 
            top: 50%;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}
