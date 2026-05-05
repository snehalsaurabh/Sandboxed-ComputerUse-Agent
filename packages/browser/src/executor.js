import { executeAction } from "@sandboxed-agent/core";
import { BrowserToolFamily } from "./tools.js";
export function createBrowserToolExecutor(options) {
    const family = new BrowserToolFamily({
        runId: options.runId,
        policy: options.policy,
        artifactsRootDir: options.artifactsRootDir,
        emit: options.emit
    });
    return {
        async execute(action, config) {
            if (action.tool.startsWith("browser_")) {
                return family.execute(action);
            }
            return executeAction(action, config);
        }
    };
}
//# sourceMappingURL=executor.js.map