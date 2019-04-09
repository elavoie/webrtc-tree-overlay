var tape = require('tape')
var Client = require('webrtc-bootstrap')
var Server = require('webrtc-bootstrap').Server
var wrtc = require('wrtc')
var Node = require('..')
var debug = require('debug')
var log = debug('test')
var secret = 'secret'
var port = 5000

tape('Connection test', function (t) {
  t.timeoutAfter(5 * 1000 /* MS */)
  var server = new Server(secret, {
    port: port,
    timeout: 5000
  })
  t.ok(server)
  var bootstrap = new Client('localhost:' + port)
  t.ok(bootstrap)

  var root = new Node(bootstrap, { peerOpts: { wrtc: wrtc } }).becomeRoot(secret)
  var node = new Node(bootstrap, { peerOpts: { wrtc: wrtc } }).join()

  var rootConnected = new Promise(function (resolve, reject) {
    root.on('child-connect', function (channel) {
      log('root connected to child')
      t.ok(channel)
      resolve(channel)
    })
  })

  var nodeConnected = new Promise(function (resolve, reject) {
    node.on('parent-connect', function (channel) {
      log('child connected to root')
      t.ok(channel)
      resolve(channel)
    })
  })

  Promise.all([rootConnected, nodeConnected]).then(function () {
    log('closing root and node')
    node.close()
    root.close()
    server.close()
    bootstrap.close()
    t.end()
  })
})

tape('README example', function (t) {
  t.timeoutAfter(5 * 1000 /* MS */)
  var server = new Server(secret, {
    port: port,
    timeout: 5000
  })
  t.ok(server)
  var bootstrap = new Client('localhost:' + port)
  t.ok(bootstrap)

  var root = new Node(bootstrap, { peerOpts: { wrtc: wrtc } }).becomeRoot(secret)
  var node = new Node(bootstrap, { peerOpts: { wrtc: wrtc } }).join()

  var rootReceivedPong = new Promise(function (resolve, reject) {
    root.on('child-connect', function (channel) {
      log('root connected to child')
      t.ok(channel)

      channel.on('data', function (data) {
        log('root received: ' + data.toString())
        t.equal(data.toString(), 'pong')
        resolve(true)
      })
      channel.send('ping')
    })
  })

  var nodeReceivedPing = new Promise(function (resolve, reject) {
    node.on('parent-connect', function (channel) {
      log('child connected to root')
      t.ok(channel)

      channel.on('data', function (data) {
        log('child received: ' + data.toString())
        t.equal(data.toString(), 'ping')
        channel.send('pong')
        resolve(true)
      })
    })
  })

  Promise.all([rootReceivedPong, nodeReceivedPing]).then(function () {
    log('closing root and node')
    node.close()
    root.close()
    server.close()
    bootstrap.close()
    t.end()
  })
})

tape('Maximum Degree Property', function (t) {
  var server = new Server(secret, {
    port: port,
    timeout: 5000
  })
  t.ok(server)
  var bootstrap = new Client('localhost:' + port)
  t.ok(bootstrap)

  var parentConnections = 0
  function onParentConnect (node) {
    return new Promise(function (resolve, reject) {
      node.on('parent-connect', function (channel) {
        log('connected to parent')
        parentConnections++
        t.ok(channel)
        resolve(true)
      })
    })
  }

  var MAX_DEGREE = 2
  var NB_NODES = 10
  t.timeoutAfter(NB_NODES * 2000 /* MS */)
  var startTime = Date.now()
  var root = new Node(bootstrap, { maxDegree: MAX_DEGREE, peerOpts: { wrtc: wrtc } }).becomeRoot(secret)

  var nodes = []
  for (var i = 0; i < NB_NODES; ++i) {
    nodes.push(
      new Node(bootstrap, { maxDegree: MAX_DEGREE, peerOpts: { wrtc: wrtc } })
        .join())
  }

  var childrenConnections = 0
  var childrenConnected = new Promise(function (resolve, reject) {
    function onChildConnect (node) {
      node.on('child-connect', function (channel) {
        log(++childrenConnections + ' connected child')
        t.ok(channel)

        if (childrenConnections === NB_NODES) {
          resolve(true)
        }
      })
    }

    nodes.map(onChildConnect)
    onChildConnect(root)
  })

  Promise.all([Promise.all(nodes.map(onParentConnect)), childrenConnected])
    .then(function () {
      log('all nodes connected')
      t.equal(parentConnections, NB_NODES)

      log('root has ' + root.childrenNb + ' children, ' +
        root.candidateNb + ' candidate(s), ' +
        root._storedRequests.length + ' stored request(s)')

      for (var i = 0; i < NB_NODES; ++i) {
        log('node(' + nodes[i].id + ') has ' + nodes[i].childrenNb + ' children and ' +
          nodes[i].candidateNb + ' candidate(s), ' +
          nodes[i]._storedRequests.length + ' stored request(s)')
        t.ok(nodes[i].childrenNb <= MAX_DEGREE)
      }

      log('closing root and nodes')
      nodes.map(function (n) { n.close() })
      root.close()
      server.close()
      bootstrap.close()
      console.log('Test took ' + (Date.now() - startTime) + ' ms to execute for ' + NB_NODES + ' nodes of maximum degree ' + MAX_DEGREE)
      t.end()
    })
})
