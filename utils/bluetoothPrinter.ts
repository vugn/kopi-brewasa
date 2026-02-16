import { MenuItem } from "../types";

// Web Bluetooth API types (since they might not be in standard lib.dom.d.ts yet)
interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(
    service: string | number,
  ): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristic(
    characteristic: string | number,
  ): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(
    characteristic?: string | number,
  ): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
    notify: boolean;
    indicate: boolean;
    read: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  writeValueWithResponse?(value: BufferSource): Promise<void>;
}

interface NavigatorBluetooth {
  bluetooth: {
    requestDevice(options: any): Promise<BluetoothDevice>;
  };
}

// ESC/POS Commands
const ESC = "\x1B";
const GS = "\x1D";
const NL = "\x0A";

const COMMANDS = {
  INIT: ESC + "@",
  ALIGN_LEFT: ESC + "a" + "\x00",
  ALIGN_CENTER: ESC + "a" + "\x01",
  ALIGN_RIGHT: ESC + "a" + "\x02",
  BOLD_ON: ESC + "E" + "\x01",
  BOLD_OFF: ESC + "E" + "\x00",
  TEXT_NORMAL: GS + "!" + "\x00",
  TEXT_DOUBLE_HEIGHT: GS + "!" + "\x01",
  TEXT_DOUBLE_WIDTH: GS + "!" + "\x10",
  TEXT_DOUBLE_SIZE: GS + "!" + "\x11",
  FEED_LINES: (n: number) => ESC + "d" + String.fromCharCode(n),
  CUT: GS + "V" + "\x41" + "\x00", // Partial cut
};

class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  // Common UUIDs for Thermal Printers (Standard BLE or specific vendor UUIDs)
  // 0x18F0 is a common service UUID for some BLE printers, but widely varies.
  // 000018f0-0000-1000-8000-00805f9b34fb
  // Often 49535343-FE7D-4AE5-8FA9-9FAFD205E455 (ISSC) is used for RPP02/generic.
  // We will try a generic filter first or accept all devices.

  async connect(): Promise<boolean> {
    try {
      const nav = navigator as any as NavigatorBluetooth;
      if (!nav.bluetooth) {
        throw new Error("Web Bluetooth API not supported in this browser.");
      }

      console.log("Requesting Bluetooth Device...");
      this.device = await nav.bluetooth
        .requestDevice({
          filters: [
            { services: ["000018f0-0000-1000-8000-00805f9b34fb"] }, // Try standard first
          ],
          optionalServices: [
            "000018f0-0000-1000-8000-00805f9b34fb",
            "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Sometimes used
            "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC (Common for RPP02/BlueBamboo)
          ],
          acceptAllDevices: false,
          // Note: acceptAllDevices: true cannot be used with optionalServices in some implementations,
          // but we need optionalServices to communicate.
          // Let's try a broader filter if specific UUID fails, or ask user to rely on name prefix if possible.
          // For now, let's try pushing the most common UUIDs.
        })
        .catch(async (e) => {
          // Fallback: accept all devices (user must pick carefully)
          console.warn("Specific filter failed, trying acceptAllDevices", e);
          return await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              "000018f0-0000-1000-8000-00805f9b34fb",
              "49535343-fe7d-4ae5-8fa9-9fafd205e455",
            ],
          });
        });

      if (!this.device) return false;

      console.log("Connecting to GATT Server...");
      const server = await this.device.gatt?.connect();

      if (!server) throw new Error("Could not connect to GATT Server");

      // Try to get the primary service
      let service: BluetoothRemoteGATTService | undefined;

      try {
        service = await server.getPrimaryService(
          "000018f0-0000-1000-8000-00805f9b34fb",
        );
      } catch (e) {
        console.log("Standard UUID failed, trying ISSC...");
        try {
          service = await server.getPrimaryService(
            "49535343-fe7d-4ae5-8fa9-9fafd205e455",
          );
        } catch (err) {
          throw new Error("Could not find supported printer service.");
        }
      }

      if (!service) throw new Error("Service not found");

      // Get Characteristic (Write)
      // Standard Write UUID: 00002af1-0000-1000-8000-00805f9b34fb
      // ISSC Write UUID: 49535343-8841-43f4-a8d4-ecbe34729bb3

      // Get all characteristics to find the best one for writing
      const characteristics = await service.getCharacteristics();
      console.log(
        "Found characteristics:",
        characteristics.map((c) => c.uuid),
      );

      // Find a characteristic that supports writing
      this.characteristic =
        characteristics.find((c) => c.properties.writeWithoutResponse) ||
        characteristics.find((c) => c.properties.write) ||
        null;

      if (!this.characteristic) {
        // Fallback to specific known UUIDs
        const candidates = [
          "00002af1-0000-1000-8000-00805f9b34fb",
          "49535343-8841-43f4-a8d4-ecbe34729bb3",
          "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
        ];

        for (const uuid of candidates) {
          try {
            this.characteristic = await service.getCharacteristic(uuid);
            if (this.characteristic) break;
          } catch (e) {
            continue;
          }
        }
      }

      if (!this.characteristic)
        throw new Error("No writable characteristic found");

      console.log("Selected Characteristic:", this.characteristic.uuid);

      console.log("Connected!");

      this.device.addEventListener(
        "gattserverdisconnected",
        this.onDisconnected,
      );

      return true;
    } catch (error) {
      console.error("Connection failed:", error);
      alert("Gagal terkoneksi ke printer: " + (error as any).message);
      return false;
    }
  }

  disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }

  private onDisconnected = () => {
    console.log("Device disconnected");
    this.characteristic = null;
    // Optionally trigger a state update via callback if we implement an event emitter
  };

  isConnected(): boolean {
    return !!this.device?.gatt?.connected && !!this.characteristic;
  }

  async printData(data: Uint8Array) {
    if (!this.characteristic) {
      throw new Error("Printer not connected");
    }

    // BLE has a max MTU (usually 20-512 bytes). Safe to chunk at 20 bytes for compatibility.
    // RPP02 usually handles chunks well, but let's be safe.
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
      // Increased delay to ensure printer buffer doesn't overflow
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  // Helper to encode string
  private encode(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  async printImage(url: string) {
    if (!this.isConnected()) return;

    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("No context");

          // Max width for 58mm printer is usually 384 dots
          const maxWidth = 384;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((maxWidth / width) * height);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          context.drawImage(img, 0, 0, width, height);

          const imageData = context.getImageData(0, 0, width, height);
          const data = imageData.data;

          // Convert to Moncrome Bitmap (Thresholding)
          const threshold = 127;
          // GS v 0 m xL xH yL yH d1...dk
          // density normal (0), width bytes, height dots

          const widthBytes = Math.ceil(width / 8);
          const cmds: number[] = [];

          // Command Header GS v 0
          cmds.push(0x1d, 0x76, 0x30, 0x00);
          // xL, xH (Width in bytes)
          cmds.push(widthBytes % 256, Math.floor(widthBytes / 256));
          // yL, yH (Height in dots)
          cmds.push(height % 256, Math.floor(height / 256));

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < widthBytes; x++) {
              let byte = 0;
              for (let bit = 0; bit < 8; bit++) {
                const pixelX = x * 8 + bit;
                if (pixelX < width) {
                  const offset = (y * width + pixelX) * 4;
                  // Luminance: 0.299R + 0.587G + 0.114B
                  const r = data[offset];
                  const g = data[offset + 1];
                  const b = data[offset + 2];
                  // const a = data[offset + 3];
                  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

                  // 0 = Black (Print), 1 = White (No Print)
                  if (luminance < threshold) {
                    byte |= 1 << (7 - bit);
                  }
                }
              }
              cmds.push(byte);
            }
          }

          await this.printData(new Uint8Array(cmds));
          // Feed separate lines after image
          await this.printData(this.encode(COMMANDS.FEED_LINES(1)));

          resolve();
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  async printReceipt(transaction: any, items: any[]) {
    if (!this.isConnected()) {
      const success = await this.connect();
      if (!success) {
        throw new Error("Printer not connected");
      }
    }

    const cmds: Uint8Array[] = [];
    const push = (str: string) => cmds.push(this.encode(str));
    const pushCmd = (cmd: string) => cmds.push(this.encode(cmd));

    // Format Helper
    const line = (left: string, right: string) => {
      const width = 32; // Standard 58mm printer usually 32 chars width (normal font)
      const space = width - left.length - right.length;
      if (space < 0) return left + " " + right + NL; // Overflow
      return left + " ".repeat(space) + right + NL;
    };

    const divider = "-".repeat(32) + NL;

    // --- RECEIPT CONTENT ---

    // --- RECEIPT CONTENT ---

    // Logo
    // try {
    //   await this.printImage("/logo-text.png");
    // } catch (e) {
    //   console.error("Failed to print logo", e);
    // }

    // Init
    pushCmd(COMMANDS.INIT);
    pushCmd(COMMANDS.ALIGN_CENTER);

    // Header
    pushCmd(COMMANDS.BOLD_ON);
    pushCmd(COMMANDS.TEXT_DOUBLE_HEIGHT);
    push("KOPI BREWASA" + NL);
    pushCmd(COMMANDS.TEXT_NORMAL);
    pushCmd(COMMANDS.BOLD_OFF);
    push("brewasa.com" + NL);
    push(divider);
    pushCmd(COMMANDS.ALIGN_CENTER);
    push("Jl. Jalur I No.5, Surgi Mufti," + NL);
    push("Banjarmasin Utara," + NL);
    push("Kota Banjarmasin, Kalsel 70122" + NL);
    push(divider);

    // Meta
    pushCmd(COMMANDS.ALIGN_LEFT);
    push(`Tgl: ${new Date().toLocaleString("id-ID")}` + NL);
    push(`Cus: ${transaction.customer_name || "Guest"}` + NL);
    push(divider);

    // Items
    items.forEach((item) => {
      push(`${item.item_name}` + NL);
      const qtyPrice = `${item.quantity} x ${item.price.toLocaleString("id-ID")}`;
      const totalItem = (item.quantity * item.price).toLocaleString("id-ID");
      push(line(qtyPrice, totalItem));
    });

    push(divider);

    // Totals
    pushCmd(COMMANDS.BOLD_ON);
    push(line("Subtotal", transaction.subtotal.toLocaleString("id-ID")));

    if (transaction.discount_amount > 0) {
      push(
        line(
          "Diskon",
          `-${transaction.discount_amount.toLocaleString("id-ID")}`,
        ),
      );
    }

    push(COMMANDS.TEXT_DOUBLE_SIZE); // Make total big
    push(line("TOTAL", transaction.total_amount.toLocaleString("id-ID")));
    push(COMMANDS.TEXT_NORMAL);
    pushCmd(COMMANDS.BOLD_OFF);

    push(divider);

    pushCmd(COMMANDS.ALIGN_CENTER);
    pushCmd(COMMANDS.BOLD_ON);
    push("WIFI: Rumah BUMN Banjarmasin" + NL);
    push("PASS: CeoCfo2025@" + NL);
    pushCmd(COMMANDS.BOLD_OFF);
    push(divider);

    pushCmd(COMMANDS.ALIGN_CENTER);
    push("Terima Kasih!" + NL);
    push("Selamat Menikmati" + NL);

    // Feed & Cut (or just feed)
    pushCmd(COMMANDS.FEED_LINES(3));

    // Concatenate all chunks
    const totalLen = cmds.reduce((acc, curr) => acc + curr.length, 0);
    const fullData = new Uint8Array(totalLen);
    let offset = 0;
    cmds.forEach((chunk) => {
      fullData.set(chunk, offset);
      offset += chunk.length;
    });

    await this.printData(fullData);
  }

  async printTest() {
    if (!this.isConnected()) {
      await this.connect();
    }

    const cmds: Uint8Array[] = [];
    const push = (str: string) => cmds.push(this.encode(str));

    // push(COMMANDS.INIT);
    // push(COMMANDS.ALIGN_CENTER);
    push(NL + "TEST PRINT SUCCESS!" + NL);
    push("Kopi Brewasa" + NL);
    push(COMMANDS.FEED_LINES(3));

    const totalLen = cmds.reduce((acc, curr) => acc + curr.length, 0);
    const fullData = new Uint8Array(totalLen);
    let offset = 0;
    cmds.forEach((chunk) => {
      fullData.set(chunk, offset);
      offset += chunk.length;
    });

    await this.printData(fullData);
  }
}

export const bluetoothPrinter = new BluetoothPrinterService();
