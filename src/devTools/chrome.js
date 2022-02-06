import Observer from "./observer";
// @ts-ignore
var privateChrome = window.chrome;
export var logger = {
    log: function (msg) {
        // TODO: uncomment this code only while debugging/developing. Uncomment before packing extension for deployment
        if (privateChrome &&
            privateChrome.devtools &&
            privateChrome.devtools.inspectedWindow) {
            privateChrome.devtools.inspectedWindow.eval("console.log(\"%c ChromeDevtoolsHelper: ".concat(msg, "\", \"background: black;\");"));
        }
        else {
            console.log("ChromeDevtoolsHelper:", msg);
        }
    }
};
/**
 * chrome.devtools helper
 */
var ChromeDevToolsHelper = /** @class */ (function () {
    function ChromeDevToolsHelper() {
    }
    ChromeDevToolsHelper.prototype.init = function (options) {
        this.options = options;
        var self = this;
        if (privateChrome && privateChrome.devtools) {
            var panels_1 = privateChrome.devtools.panels;
            panels_1.create("BLoC", "", "index.html", function (panel) { return logger.log(panel); });
            logger.log("DEFINE NOW");
            self.defineObserver().then(function () {
                logger.log("he");
                options.onModelUpdated(new Observer());
            });
            panels_1.elements.createSidebarPane(options.panelName, function (sidebar) {
                sidebar.setPage("index.html");
                // add handlers for Panel shown/hidden
                sidebar.onShown.addListener(function () {
                    // things you might have to do when panel is shown
                    //options.onShown()
                });
                sidebar.onHidden.addListener(function () {
                    // things you might have to do when panel is hidden
                    //options.onHidden()
                });
                panels_1.elements.onSelectionChanged.addListener(function () {
                    logger.log("-- panels.elements.onSelectionChanged");
                    self.onSelectionChanged().then(function (value) {
                        options.onModelUpdated(value);
                    });
                });
            });
        }
    };
    ChromeDevToolsHelper.prototype.defineObserver = function () {
        return new Promise(function (resolve, reject) {
            if (!privateChrome) {
                logger.log('failed');
                reject();
            }
            else {
                logger.log("DEF?");
                var invokedMethodExpression = "defineObserver($0);";
                logger.log("onSelectionChanged: invokedMethodExpression ".concat(invokedMethodExpression));
                console.log("LOGGER DONE");
                privateChrome.devtools.inspectedWindow.eval(invokedMethodExpression, {
                    useContentScriptContext: false // run the code in the content-script
                }, function (result) {
                    logger.log("OK?");
                    logger.log(result);
                    resolve(result);
                });
            }
        });
    };
    ChromeDevToolsHelper.prototype.onSelectionChanged = function () {
        return new Promise(function (resolve, reject) {
            if (!privateChrome) {
                reject();
            }
            else {
                var invokedMethodExpression = "saveSelectedElement($0);";
                logger.log("onSelectionChanged: invokedMethodExpression ".concat(invokedMethodExpression));
                privateChrome.devtools.inspectedWindow.eval(invokedMethodExpression, {
                    useContentScriptContext: true // run the code in the content-script
                }, function (result) {
                    resolve(result);
                });
            }
        });
    };
    return ChromeDevToolsHelper;
}());
export { ChromeDevToolsHelper };
export var chromeDevToolsHelper = new ChromeDevToolsHelper();
