const queue_microtask =
  queueMicrotask ||
  (typeof Promise !== 'undefined' &&
    ((cb) =>
      Promise.resolve()
        .then(cb)
        .catch((e) =>
          setTimeout(() => {
            throw e;
          }),
        )));

const queue_macrotask =
  typeof MessageChannel !== 'undefined'
    ? (cb: VoidFunction) => {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = cb;
        port2.postMessage(null);
      }
    : (cb: VoidFunction) => setTimeout(cb);

const task = (pending: boolean, cb: VoidFunction) => {
  // const cb = () => transitions.splice(0, 1).forEach(c => c())
  if (!pending && queue_microtask) {
    // Todo queueMicrotask
    return () => queue_microtask(cb);
  }
  return () => queue_macrotask(cb);
  // if (typeof MessageChannel !== 'undefined') {
  //   const { port1, port2 } = new MessageChannel();
  //   port1.onmessage = cb;
  //   return () => port2.postMessage(null);
  // }
  // return () => setTimeout(cb);
};
