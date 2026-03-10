import { ClientMessage } from "@/packages/game/network/generated/client";

type Payload = NonNullable<ClientMessage['payload']>
type ClientMessageCase = Payload['$case']
type ClientMessageCasePayload<T extends ClientMessageCase> =
    Extract<Payload, { $case: T }> extends Record<T, infer P> ? P : never
type HandlerMap = {
    [K in ClientMessageCase]?: (data: ClientMessageCasePayload<K>) => void
}

function getPayload<T extends Payload>(p: T): ClientMessageCasePayload<T["$case"]> {
    const caseKey = p.$case;
    return p[caseKey as keyof T] as ClientMessageCasePayload<T["$case"]>
}

export class MessageHandler {
    private handlers: HandlerMap = {}

    public on<T extends ClientMessageCase>(
        action: T,
        cb: (data: ClientMessageCasePayload<T>) => void
    ): void {
        if (this.handlers[action])
            throw new Error(`Action ${action} already has a handler!`)

        this.handlers[action] = cb as HandlerMap[T]
    }

    public emit(msg: ClientMessage) {
        this.handleMessage(msg);
    }

    private handleMessage(msg: ClientMessage): void {
        const payload = msg.payload
        if (!payload) return

        const cb = this.handlers[payload.$case]
        if (!cb) return
        const p = getPayload(payload);
        cb(p)
    }
}