let handler = null;
let queue = [];

export function setToastHandler(nextHandler) {
  handler = nextHandler;
  if (handler && queue.length) {
    const pending = queue.splice(0);
    pending.forEach(item => handler(item));
  }
}

export function showToast(type = "success", message = "Done") {
  const item = { type, message: String(message || "Done"), id: Date.now() + Math.random() };
  if (handler) handler(item);
  else queue.push(item);
}

export const toast = {
  success: message => showToast("success", message),
  error: message => showToast("error", message),
  info: message => showToast("info", message),
  warning: message => showToast("warning", message),
};
