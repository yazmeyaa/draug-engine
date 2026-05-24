import { Resource } from "@draug/engine";
import { Configuration } from "../config/config";

@Resource({ name: "ConfigurationResource" })
export class ConfigurationResource {
    public readonly config = new Configuration();
}
