var EE = require('event-emitter')
var debug = require('debug')

// Wraps the WebRTC socket inside a channel to encapsulate
// the join-request protocol while allowing application-defined control
// protocols to be multiplexed
function Channel (id, socket) {
  var log = debug('webrtc-tree-overlay:channel(' + id + ')')
  this._log = log
  var self = this
  this.id = id
  this._socket = socket
    .on('data', function (data) {
      log('received data:')
      log(data.toString())
      var message = JSON.parse(data)
      if (message.type === 'DATA') {
        log('data: ' + message.data)
        self.emit('data', message.data)
      } else if (message.type === 'JOIN-REQUEST') {
        log('join-request: ' + JSON.stringify(message))
        self.emit('join-request', message)
      } else {
        throw new Error('Invalid message type on channel(' + id + ')')
      }
    })
    .on('connect', function () {
      self.emit('connect', self)
    })
    .on('close', function () {
      log('closing')
      self.emit('close')
    })
    .on('error', function (err) {
      log(err.message)
      log(err.stack)
    })
}
EE(Channel.prototype)

Channel.prototype.send = function (data) {
  var message = JSON.stringify({
    type: 'DATA',
    data: data
  })
  this._log('sending:')
  this._log(message)
  this._socket.send(message)
}

Channel.prototype._sendJoinRequest = function (req) {
  this._log('sending join request from ' + req.origin)
  if (req.type !== 'JOIN-REQUEST') {
    throw new Error('Invalid join request')
  }

  this._socket.send(JSON.stringify(req))
}

Channel.prototype.isParent = function () {
  return this.id === null
}

Channel.prototype.destroy = function () {
  this._socket.destroy()
}

function Node (bootstrap, opts) {
  if (!bootstrap) {
    throw new Error('Missing bootstrap client argument')
  }
  this.bootstrap = bootstrap

  opts = opts || {}

  this.id = (Math.floor(Math.random() * 1000000).toString() + '000000').slice(0, 6)
  this._log = debug('webrtc-tree-overlay:node(' + this.id + ')')
  this.parent = null
  this.children = {}
  this.childrenNb = 0
  this._candidates = {}
  this._candidateNb = 0
  this.peerOpts = opts.peerOpts || {}
  this.maxDegree = opts.maxDegree || 10
  this._REQUEST_TIMEOUT_IN_MS = opts.requestTimeoutInMs || 30 * 1000

  this._storedRequests = {}
  for (var i = 0; i < this.maxDegree; i++) {
    this._storedRequests[i] = []
  }
}
EE(Node.prototype)

Node.prototype.join = function () {
  var self = this

  self._log('creating a peer connection with options:')
  self._log(this.peerOpts)

  this.parent = new Channel(
    null,
    this.bootstrap.connect(null, {
      peerOpts: this.peerOpts,
      cb: function () {
        // Ignore boostrapping timeout, we use our own here
      }
    }))

  var timeout = setTimeout(function () {
    self._log('connection to parent failed')
    self.parent.destroy()
    self.parent = null
  }, self._REQUEST_TIMEOUT_IN_MS)

  this.parent
    .on('join-request', this._handleJoinRequest.bind(this))
    .on('data', function (data) {
      self.emit('data', data, self.parent, true)
    })
    .on('connect', function () {
      self._log('connected to parent')
      self.emit('parent-connect', self.parent)
      clearTimeout(timeout)
    })
    .on('close', function () {
      self._log('parent closed')
      self.emit('parent-close', self.parent)
      self.parent = null
    })
    .on('error', function (err) {
      self._log('parent error: ' + err)
      self.emit('parent-error', self.parent, err)
      self.parent = null
    })

  return this
}

Node.prototype._handleJoinRequest = function (req) {
  var self = this
  self._log('_handleJoinRequest(' + req.origin + ')')
  self._log(
    'childrenNb: ' + this.childrenNb +
    ', _candidateNb: ' + this._candidateNb +
    ', maxDegree: ' + this.maxDegree)
  if (this._candidates.hasOwnProperty(req.origin)) {
    self._log('forwarding request to one of our candidates (' + req.origin.slice(0, 4) + ')')
    // A candidate is sending us more signal information
    this._candidates[req.origin]._socket.signal(req.signal)
  } else if (this.childrenNb + this._candidateNb < this.maxDegree) {
    self._log('creating a new candidate (' + req.origin + ')')
    // We have connections available for a new candidate
    this.createCandidate(req)
  } else {
    // Let one of our children handle this candidate
    this._delegate(req)
  }
}

Node.prototype._addChild = function (child) {
  this.childrenNb++

  var childIdx = null
  for (var i = 0; i < this.maxDegree; ++i) {
    if (!this.children[i]) {
      childIdx = i
      this.children[i] = child
      break
    }
  }

  if (childIdx === null) {
    this._log('children:')
    this._log(this.children)
    throw new Error('No space found for adding new child')
  }

  this._removeCandidate(child.id)
  return childIdx
}

Node.prototype._removeChild = function (child) {
  this.childrenNb--

  var childIdx = null
  for (var i = 0; i < this.maxDegree; ++i) {
    if (this.children[i] === child) {
      childIdx = i
      delete this.children[i]
    }
  }

  return childIdx
}

Node.prototype.createCandidate = function (req) {
  var self = this
  // Use the ID assigned by the bootstrap server to the originator
  // for routing requests
  var child = new Channel(
    req.origin,
    this.bootstrap.connect(req, { peerOpts: this.peerOpts })
  )
    .on('connect', function () {
      self._log('child (' + JSON.stringify(child.id) + ') connected')
      clearTimeout(timeout)
      var childIdx = self._addChild(child)

      // Process stored requests that belong to this child
      var storedRequests = self._storedRequests[childIdx].slice(0)
      self._storedRequests[childIdx] = []

      storedRequests.forEach(function (req) {
        child._sendJoinRequest(req)
      })
      self.emit('child-connect', child)
    })
    .on('data', function (data) {
      self.emit('data', data, child, false)
    })
    .on('join-request', function (req) {
      self._handleJoinRequest(req)
    })
    .on('close', function () {
      self._log('child (' + JSON.stringify(child.id) + ') closed')
      self._removeChild(child)
      self._removeCandidate(child.id)
      self.emit('child-close', child)
    })
    .on('error', function (err) {
      self._log('child (' + JSON.stringify(child.id) + ') error: ')
      self._log(err)
      self._removeChild(child)
      self._removeCandidate(child.id)
      self.emit('child-error', child, err)
    })

  var timeout = setTimeout(function () {
    self._log('connection to child(' + child.id + ') failed')
    child.destroy()
    self._removeCandidate(child.id)
  }, self._REQUEST_TIMEOUT_IN_MS)

  this._addCandidate(child)
  return child
}

Node.prototype._addCandidate = function (peer) {
  var self = this
  if (this._candidates.hasOwnProperty(peer.id)) {
    if (this._candidates[peer.id] !== peer) {
      throw new Error('Adding a different candidate with the same identifier as an existing one')
    } else {
      self._log('WARNING: re-adding the same candidate ' + peer.id)
    }
  } else {
    self._log('added candidate (' + peer.id + ')')
    this._candidates[peer.id] = peer
    this._candidateNb++
  }
}

Node.prototype._removeCandidate = function (id) {
  var self = this
  if (this._candidates.hasOwnProperty(id)) {
    delete this._candidates[id]
    this._candidateNb--
    self._log('removed candidate (' + id + ')')
  } else {
    self._log('candidate (' + id + ') not found, it may have been removed already')
  }
}

Node.prototype._delegateIndex = function (req) {
  // Deterministically choose one of our children, regardless of whether it is
  // connected or not at the moment.
  //
  // We combine the first bytes of the origin address with the node
  // id to derive the index of the child to use.
  var origin = Number.parseInt(req.origin.slice(0, 6), 16)
  return (origin ^ this.id) % this.maxDegree
}

Node.prototype._delegate = function (req) {
  var self = this
  var childIndex = self._delegateIndex(req)
  self._log('delegating request (' + req.origin + ') to child[' + childIndex + ']')
  var child = this.children[childIndex]
  if (child) {
    self._log('forwarding request (' + req.origin + ') to child (' + child.id + ')')
    child._sendJoinRequest(req)
  } else {
    // Defer until the corresponding candidate
    // has joined
    this._storedRequests[childIndex].push(req)
  }
}

Node.prototype.becomeRoot = function (secret) {
  var self = this
  this.bootstrap.root(secret, function (req) {
    if (!req.type) {
      req.type = 'JOIN-REQUEST'
    } else if (req.type !== 'JOIN-REQUEST') {
      throw new Error('Invalid request type')
    }
    self._handleJoinRequest(req)
  })
  return this
}

Node.prototype.close = function () {
  if (this.parent) {
    this.parent.destroy()
    this.parent = null
  }

  for (var i = 0; i < this.children.length; ++i) {
    this.children[i].destroy()
  }
  this.children = []

  for (var c in this._candidates) {
    this._candidates[c].destroy()
  }
  this._candidates = {}
  this._candidateNb = 0

  this.emit('close')
}

module.exports = Node
