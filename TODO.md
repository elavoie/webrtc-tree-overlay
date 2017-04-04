[ ] Fix bug:

/home/elavoie/pando-computing/node_modules/webrtc-tree-overlay/src/index.js:186      ]
    throw new Error('No space found for adding new child')

Error: No space found for adding new child
    at Node._addChild (/home/elavoie/pando-computing/node_modules/webrtc-tree-overlay/src/index.js:186:11)
    at Channel.<anonymous> (/home/elavoie/pando-computing/node_modules/webrtc-tree-overlay/src/index.js:218:27)
    at Channel.emit (/home/elavoie/pando-computing/node_modules/event-emitter/index.js:97:9)
    at Peer.<anonymous> (/home/elavoie/pando-computing/node_modules/webrtc-tree-overlay/src/index.js:39:12)
    at emitNone (events.js:91:20)
    at Peer.emit (events.js:185:7)
    at /home/elavoie/pando-computing/node_modules/simple-peer/index.js:603:10
    at /home/elavoie/pando-computing/node_modules/simple-peer/index.js:486:7
    at _callRemote (/home/elavoie/pando-computing/node_modules/electron-webrtc/src/RTCPeerConnection.js:260:9)
    at Daemon.daemon.once (/home/elavoie/pando-computing/node_modules/electron-webrtc/src/RTCPeerConnection.js:277:11)
