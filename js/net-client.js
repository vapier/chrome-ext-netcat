// Written by Mike Frysinger <vapier@gmail.com>.
// Released into the public domain.

import {sockets} from './socket.js';

export class NetClient {
  /**
   * Creates an instance of the client
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
      this._api = sockets.tcp;
    } else if (proto == 'udp') {
      this._api = sockets.udp;
    } else {
      throw Error(`Unknown proto '${proto}'`);
    }

    // Called when client receives data from server.
    this._onrecv = null;
    // Called when an error occurs.
    this._onerr = null;

    // Socket.
    this.socketId = null;

    // Streaming.
    this._encoder = new TextEncoder();
    this._decoder = null;

    log('initialized net client for ' + this.toURI());
  }

  toURI() {
    return `${this.proto}://${this.host}:${this.port}`;
  }

  /**
   * Connects to socket, and creates an open socket.
   *
   * @see http://developer.chrome.com/apps/socket.html#method-create
   */
  connect() {
    return this._api.create(null)
      .then(this._onCreate.bind(this));
  }

  /**
   * Sends a message down the wire to the remote side
   *
   * @see http://developer.chrome.com/apps/socket.html#method-write
   * @param {string} msg The message to send.
   */
  sendMessage(msg) {
    const data = this._encoder.encode(msg).buffer;
    if (this.proto == 'tcp') {
      return this._api.send(this.socketId, data);
    } else {
      return this._api.send(this.socketId, data, this.host, this.port);
    }
  }

  /**
   * Sets the callback for when a message is received.
   *
   * @param {function(string)} callback The function to call.
   */
  addResponseListener(callback) {
    if (this._onrecv) {
      this._api.onReceive.removeListener(this._onrecv);
    }

    // Register callback.
    this._onrecv = this._onDataRead.bind(this, callback);
    this._api.onReceive.addListener(this._onrecv);
  }

  /**
   * Sets the callback for when an error occurs.
   *
   * @param {function(number)} callback The function to call.
   */
  addErrorListener(callback) {
    if (this._onerr) {
      this._api.onReceiveError.removeListener(this._onerr);
    }

    // Register callback.
    this._onerr = this._onDataError.bind(this, callback);
    this._api.onReceiveError.addListener(this._onerr);
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
    if (this._onrecv) {
      this._api.onReceive.removeListener(this._onrecv);
      this._onrecv = null;
    }
    if (this._onerr) {
      this._api.onReceiveError.removeListener(this._onerr);
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
    this.fromSocket(socketId);

    if (this.proto == 'tcp') {
      return this._api.connect(this.socketId, this.host, this.port);
    } else {
      return this._api.bind(this.socketId, '0.0.0.0', 0);
    }
  }

  /**
   * Create a new client from a socket.
   */
  fromSocket(socketId) {
    this.destroy();
    this.socketId = socketId;
    this._decoder = new TextDecoder();
    this._api.setPaused(socketId, false);
  }

  /**
   * Callback function for when data has been read from the socket.
   * Converts the array buffer that is read in to a string
   * and sends it on for further processing by passing it to
   * the previously assigned callback function.
   *
   * @private
   * @param {function(string)} callback The function to call.
   * @param {Object} info The incoming message.
   */
  _onDataRead(callback, info) {
    log('onDataRead', info);
    if (info.socketId == this.socketId) {
      callback.call(this, this._decoder.decode(info.data, {stream: true}));
    }
  }

  /**
   * Callback function for when an error occurs.
   *
   * @private
   * @param {function(number)} callback The function to call.
   * @param {Object} info The incoming message.
   */
  _onDataError(callback, info) {
    log('onDataError', info);
    if (info.socketId == this.socketId) {
      callback.call(this, info.resultCode);
    }
  }
}

/**
 * Wrapper function for logging
 */
function log(...args) {
  //console.log('net-client:', ...args);
}

/**
 * Wrapper function for error logging
 */
function error(...args) {
  console.error('net-client:', ...args);
}
