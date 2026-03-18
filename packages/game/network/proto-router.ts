// ! Very bad! Need to create safe abstraction

import { RawData } from "@amber-game/types/ws";
import { MessageFns } from "./shared";
import { MessageHandler } from "./message-handler";

function concatArrayBuffers(buffers: ArrayBuffer[]): Uint8Array {
    const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of buffers) {
        result.set(new Uint8Array(b), offset);
        offset += b.byteLength;
    }
    return result;
}

export function decodeWsMessage<T extends object>(
    data: RawData,
    decoder: MessageFns<T>
): T {
    if (Array.isArray(data)) {
        return decoder.decode(concatArrayBuffers(data));
    }

    if (data instanceof ArrayBuffer) {
        return decoder.decode(new Uint8Array(data));
    }

    return decoder.decode(data);
}

export class ProtoMessageRouter<
    M extends { payload?: any },
    P extends { $case: string },
    C
> {
    constructor(
        private decoder: MessageFns<M>,
        private handler: MessageHandler<P, C>
    ) { }

    public handle(raw: RawData, ctx: C) {
        const msg = decodeWsMessage(raw, this.decoder)
        const payload = msg.payload as P | undefined
        if (!payload) return

        this.handler.emit(payload, ctx)
    }
}