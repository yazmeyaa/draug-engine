import { Component } from "@draug/engine";

@Component()
export class NetworkEntity {
    private _isInit = false;
    public get networkId(): number {
        return this._networkId;
    }
    constructor(
        private _networkId: number
    ) { }

    public setNetworkId(id: number): void {
        if(this._isInit) 
            return;
        this._isInit = true;
        this._networkId = id;
    }
};