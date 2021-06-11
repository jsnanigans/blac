/**
 * injectScript - Inject internal script to available access to the `window`
 *
 * @param  {string} file_path Local path of the internal script.
 * @param  {string} tag The tag as string, where the script will be append (default: 'body').
 * @see    {@link http://stackoverflow.com/questions/20499994/access-window-variable-from-content-script}
 */
function injectScript(file_path) {
  var node = document.querySelector('*');
  var script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", file_path);
  node.appendChild(script);
}



injectScript(chrome.extension.getURL("body.js"));

chrome.runtime.sendMessage({type: "notification", options: {
    type: "basic",
    iconUrl: chrome.extension.getURL("icon128.png"),
    title: "Test",
    message: "Test"
  }});