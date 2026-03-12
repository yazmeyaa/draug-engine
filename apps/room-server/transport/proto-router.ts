import { MessageHandler } from "@/packages/game/network/message-handler"
import { MessageFns } from "@/packages/game/network/shared"
import { RawData } from "ws"

function decodeWsMessage<T extends object>(data: RawData, decoder: MessageFns<T>): T {
    if (Array.isArray(data)) {
        const buffer = Buffer.concat(data);
        return decoder.decode(buffer);
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
    ) {}

    public handle(raw: RawData, ctx: C) {
        const msg = decodeWsMessage(raw, this.decoder)
        const payload = msg.payload as P | undefined
        if (!payload) return

        this.handler.emit(payload, ctx)
    }
}