export interface IChromeDevToolsHelper {
    onSelectionChanged(): Promise<any>;
}
export declare const logger: any;
export interface IChromeDevToolsHelperOptions {
    panelName: string;
    onShown: () => void;
    onHidden: () => void;
    onModelUpdated: (value: any) => void;
}
/**
 * chrome.devtools helper
 */
export declare class ChromeDevToolsHelper implements IChromeDevToolsHelper {
    private options;
    init(options: IChromeDevToolsHelperOptions): void;
    defineObserver(): Promise<any>;
    onSelectionChanged(): Promise<any>;
}
export declare const chromeDevToolsHelper: ChromeDevToolsHelper;
