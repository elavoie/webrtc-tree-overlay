[ ] Fix bug:
/Users/erick/Documents/Recherche/Pando/pando-computing/node_modules/webrtc-tree-overlay/src/index.js:205
      var storedRequests = self._storedRequests[childIdx].slice(0)
                                                         ^

TypeError: Cannot read property 'slice' of undefined
    at Channel.<anonymous> (/Users/erick/Documents/Recherche/Pando/pando-computing/node_modules/webrtc-tree-overlay/src/index.js:205:58)
    at Channel.emit (/Users/erick/Documents/Recherche/Pando/pando-computing/node_modules/event-emitter/index.js:97:9)
    at Peer.<anonymous> (/Users/erick/Documents/Recherche/Pando/pando-computing/node_modules/webrtc-tree-overlay/src/index.js:28:12)
    at emitNone (events.js:91:20)
    at Peer.emit (events.js:185:7)
    at /Users/erick/Documents/Recherche/Pando/pando-computing/node_modules/simple-peer/index.js:603:10
    at /Users/erick/Documents/Recherche/Pando/pando-computing/node_modules/simple-peer/index.js:486:7
    at _callRemote (/Users/erick/Documents/Recherche/Pando/pando-computing/node_modules/electron-webrtc/src/RTCPeerConnection.js:260:9)
    at Daemon.daemon.once (/Users/erick/Documents/Recherche/Pando/pando-computing/node_modules/electron-webrtc/src/RTCPeerConnection.js:277:11)
    at Object.onceWrapper (events.js:290:19)
