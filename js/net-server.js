// Written by Mike Frysinger <vapier@gmail.com>.
// Released into the public domain.

import {sockets} from './socket.js';

export class NetServer {
  /**
   * Creates an instance of the server
   *
   * @param {string} proto The protocol; tcp or udp.
   * @param {string} host The remote host to connect to
   * @param {number} port The port to connect to at the remote host
   */
  constructor(proto, host, port) {
    this.proto = proto;
    this.host = host;
    this.port = port;

    if (proto == 'tcp') {
      this._api = sockets.tcpServer;
    } else if (proto == 'udp') {
      this._api = sockets.udp;
    } else {
      throw Error(`Unknown proto '${proto}'`);
    }

    // Called when a new client connects.
    this._onaccept = null;
    // Called when an error occurs.
    this._onerr = null;

    // Socket.
    this.socketId = null;

    log(`initialized net server for ${this.toURI()}`);
  }

  toURI() {
    return `${this.proto}://${this.host}:${this.port}`;
  }

  listen() {
    return this._api.create(null)
      .then(this._onCreate.bind(this));
  }

  setPaused(pause) {
    return this._api.setPaused(this.socketId, pause);
  }

  /**
   * Sets the callback for when a client connects.
   *
   * @param {function(Object)} callback The function to call.
   */
  addAcceptListener(callback) {
    if (this.proto == 'udp') {
      return;
    }

    if (this._onaccept) {
      this._api.onAccept.removeListener(this._onaccept);
    }

    // Register callback.
    this._onaccept = this._onAccept.bind(this, callback);
    this._api.onAccept.addListener(this._onaccept);
  }

  /**
   * Sets the callback for when an error occurs.
   *
   * @param {function(number)} callback The function to call.
   */
  addErrorListener(callback) {
    if (this.proto == 'udp') {
      return;
    }

    if (this._onerr) {
      this._api.onAcceptError.removeListener(this._onerr);
    }

    // Register callback.
    this._onerr = this._onAcceptError.bind(this, callback);
    this._api.onAcceptError.addListener(this._onerr);
  }

  /**
   * Disconnects from the remote side
   *
   * @see http://developer.chrome.com/apps/socket.html#method-disconnect
   */
  disconnect() {
    if (this.proto == 'tcp') {
      this._api.disconnect(this.socketId);
    }
  }

  /**
   * Destroy the socket.
   *
   * @see http://developer.chrome.com/apps/socket.html#method-destroy
   */
  destroy() {
    if (this._onaccept) {
      this._api.onAccept.removeListener(this._onaccept);
      this._onaccept = null;
    }
    if (this._onerr) {
      this._api.onAcceptError.removeListener(this._onerr);
      this._onerr = null;
    }
    if (this.socketId !== null) {
      this.disconnect();
      this._api.close(this.socketId);
    }
  }

 /**
   * The callback function used for when we attempt to have Chrome
   * create a socket. If the socket is successfully created
   * we go ahead and connect to the remote side.
   *
   * @private
   * @see http://developer.chrome.com/apps/socket.html#method-connect
   * @param {Object} createInfo The socket details
   */
  _onCreate({socketId}) {
    this.destroy();
    this.socketId = socketId;

    if (this.proto == 'tcp') {
      return this._api.listen(this.socketId, this.host, this.port);
    } else {
      return this._api.bind(this.socketId, this.host, this.port);
    }
  }

  /**
   * Callback function for when a client connects.
   *
   * @private
   * @param {function(Object)} callback The function to call.
   * @param {Object} info The incoming client.
   */
  _onAccept(callback, info) {
    log('onAccept', info);
    const {socketId, clientSocketId} = info;
    if (socketId == this.socketId) {
      this.setPaused(true)
        .then(() => sockets.tcp.getInfo(clientSocketId))
        .then((info) => {
          info.socketId = clientSocketId;
          callback.call(this, info);
        });
    }
  }

  /**
   * Callback function for when an error occurs.
   *
   * @private
   * @param {function(number)} callback The function to call.
   * @param {Object} info The incoming message
   */
  _onAcceptError(callback, info) {
    log('onAcceptError', info);
    if (info.socketId == this.socketId) {
      callback.call(this, info.resultCode);
    }
  }
}

/**
 * Wrapper function for logging
 */
function log(...args) {
  //console.log('net-server:', ...args);
}

/**
 * Wrapper function for error logging
 */
function error(...args) {
  console.error('net-server:', ...args);
}
