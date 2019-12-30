// Written by Mike Frysinger <vapier@gmail.com>.
// Released into the public domain.

function $(s) { return document.querySelector(s); }
function get_css_var(key) { return getComputedStyle(document.documentElement).getPropertyValue(`--${key}`); }

import {sockets} from './js/socket.js';
import {NetClient} from './js/net-client.js';
import {NetServer} from './js/net-server.js';
import {list as net_error_list} from './js/net_error_list.js';

/* Globals to allow easy manipulation via javascript console. */
let netclient;
let netserver;

// The element that contains all output elements/content.
let output_frame;
// The element that contains user visible text.
let output_window;
function output_window_clear() {
  output_window.innerText = '';
}
/** @param {string} data */
function recv(data) {
  output_window.innerText += data;
  output_frame.scrollTop = output_frame.scrollHeight
  output_window.scrollTop = output_window.scrollHeight
}
/** @param {number} resultCode */
function onerror(resultCode) {
  disconnect(net_error(resultCode));
}

function status_window_hide() {
  $('div[class=status]').hidden = true;
}
let timeout_id = undefined;
/**
 * @param {string} msg
 * @param {number=} hide_timeout
 */
function status(msg, hide_timeout) {
  const status_window = $('div[class=status]');
  status_window.hidden = false;
  $('[name=status]').innerText = msg;

  if (hide_timeout) {
    timeout_id = setTimeout(status_window_hide, hide_timeout);
  } else {
    clearTimeout(timeout_id);
  }
}
/** @param {number} resultCode */
function net_error(resultCode) {
  return `error ${resultCode}: ${net_error_list[resultCode]}`;
}

function notice_window_hide() {
  $('div[class=notice]').hidden = true;
}
/**
 * @param {string} msg
 * @param {number=} hide_timeout
 */
function notice(msg, hide_timeout) {
  const notice_window = $('div[class=notice]');
  notice_window.hidden = false;
  notice_window.innerText = msg;

  if (hide_timeout) {
    setTimeout(notice_window_hide, hide_timeout);
  }
}

function connect() {
  status('initializing');

  notice_window_hide();
  connect_window_hide();

  const form = $('form[name=connect]');
  let host = form.host.value;
  const port = parseInt(form.port.value, 10);
  const proto = form.proto[0 + form.proto[1].checked].value;
  const listen = form.listen.checked;

  chrome.storage.local.set({
    'host': host,
    'port': port,
    'proto': proto,
    'listen': listen,
    'clear': form.clear.checked,
  });

  if (form.clear.checked) {
    output_window_clear();
  }
  if (output_window.clear_once) {
    output_window.clear_once = false;
    output_window_clear();
  }

  // Catch common issues that Chrome itself prevents from working.
  if (listen) {
    // Chrome doesn't like hostnames.
    if (host == 'localhost') {
      host = '127.0.0.1';
    }

    const warnings = [];
    if (!host.match(/^([0-9]{1,3}\.){3}[0-9]{1,3}$/) && host.indexOf(':') == -1) {
      warnings.push('Chrome wants IP addresses when listening.');
    }
    if (port < 1024) {
      warnings.push('The OS usually does not allow listening on ports <1024.');
    }
    if (proto == 'udp') {
      warnings.push('UDP listening not supported currently.');
    }
    if (warnings.length) {
      notice(warnings.join('\n'));
    }

    let newclient = (info) => {
      netclient = new NetClient(proto, info.peerAddress, info.peerPort);
      window.netclient = netclient;
      netclient.fromSocket(info.socketId);
      status(`connected to ${netclient.toURI()}`, 3000);
      netclient.addErrorListener((code) => {
        disconnect(`${net_error(code)}\nwaiting for another client to connect ...`);
        netserver.setPaused(false);
      });
      netclient.addResponseListener(recv);
    };

    netserver = new NetServer(proto, host, port);
    window.netserver = netserver;
    netserver.listen()
      .then(() => {
        document.title = `listening at ${netserver.toURI()}`;
        status(`${document.title}\nwaiting for a client to connect ...`);
        netserver.addAcceptListener(newclient);
      })
      .catch(shutdown);
  } else {
    netclient = new NetClient(proto, host, port);
    window.netclient = netclient;
    netclient.connect()
      .then(() => {
        document.title = `connected to ${netclient.toURI()}`;
        status(document.title, 3000);
        netclient.addErrorListener(onerror);
        netclient.addResponseListener(recv);
      })
      .catch(disconnect);
  }

  // Auto focus on the main text window.
  $('[name=output]').focus();

  return false;
}

/** @param {string} msg */
function disconnect(msg) {
  // If we've already disconnected, ignore further requests.
  if (netclient) {
    netclient.destroy();
    netclient = undefined;
    delete window.netclient;
    status(msg);
  }
}

/** @param {string} msg */
function shutdown(msg) {
  disconnect(msg);
  // If we've already shutdown, ignore further requests.
  if (netserver) {
    netserver.destroy();
    netserver = undefined;
    delete window.netserver;
    status(msg);
  }
}

function status_window_disconnect() {
  shutdown('disconnected');
  connect_window_show();
}

function output_window_keypress(e) {
  if (netclient === undefined) {
    return;
  }

  // The enter key will normally generate \r when we want \n.
  let keyCode = e.keyCode;
  switch (keyCode) {
  case 13:
    keyCode = 10;
    break;
  }
  const c = String.fromCharCode(keyCode);
  recv(c);
  netclient.sendMessage(c).catch(status);
}

function output_window_keyup(e) {
  switch (e.key) {
    case 'Escape':
      output_window_contextmenu();
      break;

    case 'Tab':
      // Hack for ignoring Alt-Tab for focus.
      if (!e.altKey) {
        user_input_show(1);
        user_input.focus();
      }
      break;
  }
}

/** @param {Object=} e */
function output_window_contextmenu(e) {
  if (netclient === undefined && netserver === undefined) {
    connect_window_show();
  } else {
    state_window_show();
  }
}

function output_window_paste(e) {
  if (netclient === undefined) {
    return;
  }

  const data = e.clipboardData.getData('text/plain');
  if (data) {
    recv(data);
    netclient.sendMessage(data);
  }
}

function connect_form_keyup(e) {
  switch (e.key) {
    case 'Escape':
      // If escape is hit, hide the window.
      connect_window_hide();
      break;
  }
}

function connect_form_proto_helper() {
  this.children[0].checked = true;
}

function connect_window_hide() {
  $('div[class=connect]').hidden = true;
}

function connect_window_show() {
  $('div[class=state]').hidden = true;
  $('div[class=connect]').hidden = false;

  // Auto focus on the host field.
  const focus = $('form[name=connect]').host;
  focus.focus();
  focus.setSelectionRange(focus.value.length, focus.value.length);
}

function state_window_hide() {
  $('div[class=state]').hidden = true;
}

function state_window_show() {
  $('div[class=connect]').hidden = true;
  $('div[class=state]').hidden = false;

  // Auto focus on the disconnect button.
  const focus = $('input[name=disconnect]');
  focus.focus();
}

function state_window_keyup(e) {
  switch (e.key) {
    case 'Escape':
      // If escape is hit, hide the window.
      state_window_hide();
      break;
  }
}

// The text field for entering content before sending.
let user_input;

function user_input_hide() {
  output_frame.style.height = '';
  user_input.style.display = 'none';
}

/** @param {number} rows */
function user_input_show(rows) {
  output_frame.style.height = `calc(100% - ${rows}.5em)`;
  user_input.rows = rows;
  user_input.style.display = 'block';
}

function user_input_onkeyup(e) {
  if (e.isComposing) {
    return;
  }

  /** @param {string} ins */
  const insert = (ins) => {
    const start = user_input.selectionStart;
    const end = user_input.selectionEnd;
    let text = user_input.value;
    user_input.value = text.slice(0, start) + ins + text.slice(end);
    user_input.selectionStart = user_input.selectionEnd = start + 1;
  };

  switch (e.key) {
    case 'Enter':
      if (e.ctrlKey) {
        insert('\n');
        user_input_show(2);
        output_frame.scrollTop = output_frame.scrollHeight
        user_input.scrollTop = user_input.scrollHeight;
      } else {
        user_input_show(1);
        if (!e.altKey) {
          user_input.value += '\n';
        }
        recv(user_input.value);
        netclient.sendMessage(user_input.value);
        user_input.value = '';
        return false;
      }
      break;

    case 'Tab':
      // Hack for ignoring Alt-Tab for focus.
      if (!e.altKey) {
        insert('\t');
      }
      e.stopPropagation();
      break;

    case 'Escape':
      user_input_hide();
      break;
  }
}

function toggle_theme() {
  const theme = get_css_var('theme') == 'light' ? 'dark' : 'light';
  const css = $('link#theme-override');
  css.href = `css/${theme}.css`;
  chrome.storage.sync.set({theme});
  return false;
}

/**
 * Select a specific interface for the host.
 */
function interface_select() {
  const hostinput = $('input[name=host]');
  const ifaceui = $('#interface-selector');

  hostinput.value = this.value;
  ifaceui.style.display = 'none';

  // Disable form submission.
  return false;
}

/**
 * Automatically hide selector when focus is lost.
 *
 * @param {FocusEvent} e
 */
function interface_selector_hide(e) {
  const ifaceui = $('#interface-selector');

  // If the entire window is losing focus, ignore it.
  if (!e.relatedTarget) {
    return;
  }

  // If a child element is focused, ignore it.
  if (e.relatedTarget.parentElement == ifaceui) {
    return;
  }

  // Pathological case: user is going to hide us :).  Let that toggle logic
  // run rather than hiding ourselves.
  if (e.relatedTarget == $('button[name=interfaces]')) {
    return;
  }

  ifaceui.style.display = 'none';
}

/**
 * Display the interface UI selection screen.
 */
function interface_selector_toggle() {
  const ifaceui = $('#interface-selector');

  if (ifaceui.style.display == 'block') {
    ifaceui.style.display = 'none';
    return false;
  }

  // Clear all existing entries.  We refresh on every display in case the
  // system changed settings.  The query logic is fast enough.
  while (ifaceui.firstChild) {
    ifaceui.removeChild(ifaceui.firstChild);
  }

  /**
    * Helper to add a new entry to the form.
    *
    * @param {string} addr
    * @param {string} iface
    * @param {string=} text
    */
  const add_entry = (addr, iface, text) => {
    const button = document.createElement('button');
    button.value = addr;
    button.innerText = `${text || addr} (${iface})`;
    button.className = 'interface-entry';
    button.onclick = interface_select;
    ifaceui.appendChild(button);
  }

  // Add the localhost entry first.  This should (hopefully) always work.
  add_entry('127.0.0.1', 'lo', 'localhost IPv4');
  add_entry('::1', 'lo', 'localhost IPv6');

  // Add all the known interfaces.
  // NB: We could use RTCPeerConnection, but that doesn't enumerate IPv6
  // link local addresses.  And we're always going to be a Chrome app, so...
  chrome.socket.getNetworkList((interfaces) => {
    interfaces.forEach(({name, address}) => add_entry(address, name));

    // Now that we're done, show the UI.
    ifaceui.style.display = 'block';
    ifaceui.firstChild.focus();
  });

  // Disable form submission.
  return false;
}

window.onload = function() {
  output_frame = $('#output-frame');
  output_frame.oncontextmenu = output_window_contextmenu;
  output_window = $('[name=output]');
  output_window.onpaste = output_window_paste;
  output_window.clear_once = true;

  user_input = $('#user-input');
  user_input.onkeyup = user_input_onkeyup;

  const form = $('form[name=connect]');
  form.onkeyup = connect_form_keyup;
  form.onsubmit = connect;
  $('span[name=proto-tcp]').onclick = connect_form_proto_helper;
  $('span[name=proto-udp]').onclick = connect_form_proto_helper;

  $('div[class=state]').onkeyup = state_window_keyup;
  $('[name=disconnect]').onclick = status_window_disconnect;

  $('div[class=status]').onclick = status_window_hide;
  $('div[class=notice]').onclick = notice_window_hide;

  form.theme.onclick = toggle_theme;

  $('#interface-selector').addEventListener('focusout', interface_selector_hide);
  form.interfaces.onclick = interface_selector_toggle;

  chrome.storage.local.get(null, (items) => {
    items = Object.assign({
      'host': 'localhost',
      'port': '80',
      'proto': 'tcp',
      'listen': false,
      'clear': true,
    }, items);

    form.host.value = items.host;
    form.port.value = items.port;
    form.proto.value = items.proto;
    form.listen.checked = items.listen;
    form.clear.checked = items.clear;

    connect_window_show();
  });
};

window.onkeypress = function(e) {
  if (e.target != document.body) {
    /* Only allow the shortcuts when the focus is on the body.
       Otherwise you can't type these numbers into text fields. */
    return;
  }

  output_window_keypress(e);
};

window.onkeyup = function(e) {
  if (e.target != document.body) {
    /* Only allow the shortcuts when the focus is on the body.
       Otherwise you can't type these numbers into text fields. */
    return;
  }

  output_window_keyup(e);
};
