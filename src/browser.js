var Client = require('webrtc-bootstrap')
var Node = require('..')
var debug = require('debug')
var _log = debug('webrtc-tree-overlay:browser')

function log (s) {
  var text = document.getElementById('log').textContent
  document.getElementById('log').textContent = text + s + '\n'
  _log(s)
}

module.exports = function (host, origin, secure) {
  log('connecting to ' + host + ' from ' + origin)
  var node = new Node(new Client(host, { secure: secure })).join()

  node.on('parent-connect', function (channel) {
    log('connected to root')

    channel.on('data', function (data) {
      log('child received: ' + String(data))
      channel.send(origin)
    })
  })
}
