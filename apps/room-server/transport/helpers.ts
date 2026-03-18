import { type RawData } from "@amber-game/types/ws";

export function normalizeWsData(data: any): RawData {
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
        return new Uint8Array(data);
    }

    if (Array.isArray(data) && data.every(d => typeof Buffer !== 'undefined' && Buffer.isBuffer(d))) {
        // Buffer[]
        const totalLength = data.reduce((sum, b) => sum + b.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const b of data) {
            result.set(new Uint8Array(b), offset);
            offset += b.length;
        }
        return result;
    }

    // ArrayBuffer
    if (data instanceof ArrayBuffer) return data;
    if (data instanceof Uint8Array) return data;

    throw new Error("Unsupported WS message type");
}