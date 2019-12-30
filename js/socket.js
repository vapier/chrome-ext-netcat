// Written by Mike Frysinger <vapier@gmail.com>.
// Released into the public domain.

/**
 * Wrapper function for logging
 */
function log(...args) {
  //console.log('sockets', ...args);
}

const makePromiseWrapper = (func) => {
  return function(...args) {
    return new Promise((resolve, reject) => {
      // Turn the Chrome callback into a promise fulfiller.
      function callback(...args) {
        const err = chrome.runtime.lastError;
        if (err) {
          reject(err.message);
        } else {
          if (args.length == 0) {
            resolve();
          } else if (args.length == 1) {
            resolve(args[0]);
          } else {
            // Prob not used in these Chrome APIs, but easy enough to handle.
            // Promises only allow one argument to be passed back.
            resolve(args);
          }
        }
      }

      // Call the Chrome API with user's args & our custom callback.
      log(func.name, args);
      args.push(callback);
      func.apply(null, args);
    });
  };
};

export const socket = {
  destroy: chrome.socket.destroy,
  disconnect: chrome.socket.disconnect,
};

['accept', 'bind', 'connect', 'create', 'getInfo', 'getJoinedGroups',
 'getNetworkList', 'joinGroup', 'leaveGroup', 'listen', 'read', 'recvFrom',
 'secure', 'sendTo', 'setKeepAlive', 'setMulticastLoopbackMode',
 'setMulticastTimeToLive', 'setNoDelay', 'write'].forEach((func) => {
  socket[func] = makePromiseWrapper(chrome.socket[func]);
});

export const sockets = {};

sockets.tcp = {
  onReceive: chrome.sockets.tcp.onReceive,
  onReceiveError: chrome.sockets.tcp.onReceiveError,
};

['close', 'connect', 'create', 'disconnect', 'getInfo', 'getSockets', 'secure',
 'send', 'setKeepAlive', 'setNoDelay', 'setPaused', 'update'].forEach((func) => {
  sockets.tcp[func] = makePromiseWrapper(chrome.sockets.tcp[func]);
});

sockets.tcpServer = {
  onAccept: chrome.sockets.tcpServer.onAccept,
  onAcceptError: chrome.sockets.tcpServer.onAcceptError,
};

['close', 'create', 'disconnect', 'getInfo', 'getSockets', 'listen',
 'setPaused', 'update'].forEach((func) => {
  sockets.tcpServer[func] = makePromiseWrapper(chrome.sockets.tcpServer[func]);
});

sockets.udp = {
  onReceive: chrome.sockets.udp.onReceive,
  onReceiveError: chrome.sockets.udp.onReceiveError,
};

['bind', 'close', 'create', 'getInfo', 'getJoinedGroups', 'getSockets',
 'joinGroup', 'leaveGroup', 'send', 'setBroadcast', 'setMulticastLoopbackMode',
 'setMulticastTimeToLive', 'setPaused', 'update'].forEach((func) => {
  sockets.udp[func] = makePromiseWrapper(chrome.sockets.udp[func]);
});
