import { ClientMessage } from "@/packages/game/network/generated/client";
import { ServerMessage } from "./generated/server";

export type CaseUnion = { $case: string }

export type CaseName<P extends CaseUnion> = P["$case"]

export type CasePayload<
    P extends CaseUnion,
    K extends CaseName<P>
> = Extract<P, { $case: K }> extends Record<K, infer T> ? T : never

type HandlerMap<P extends CaseUnion, M> = {
    [K in CaseName<P>]?: (data: CasePayload<P, K>, meta: M) => void
}

export class MessageHandler<P extends CaseUnion, M = void> {
    private handlers: HandlerMap<P, M> = {}

    public on<K extends CaseName<P>>(
        action: K,
        cb: (data: CasePayload<P, K>, meta: M) => void
    ) {
        this.handlers[action] = cb as HandlerMap<P, M>[K]
    }

    public emit(payload: P, meta: M) {
        const action = payload.$case as CaseName<P>
        const cb = this.handlers[action]
        if (!cb) return

        cb((payload as any)[action], meta)
    }
}

export type ClientPayload = NonNullable<ClientMessage["payload"]>
export type ServerPayload = NonNullable<ServerMessage["payload"]>