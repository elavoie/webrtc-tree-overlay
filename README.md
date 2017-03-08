# webrtc-tree-overlay

Dynamically maintain a tree overlay topology from nodes connected by WebRTC as
they join and leave. Each node accepts a maximum number of new connections after which the newer connection requests are delegated to children.

Requires a publicly accessible server for bootstrapping the connections,
provided by [webrtc-bootstrap-server](https://github.com/elavoie/webrtc-bootstrap-server).

# Usage

    // On the root node

    var bootstrap = require('webrtc-bootstrap')('server hostname or ip:port')
    var Node = require('webrtc-tree-overlay')

    var root = new Node(bootstrap).becomeRoot('secret')
    root.on('child-connect', function (channel) {
      channel.send('ping')        
      channel.on('data', function (data) {
        console.log(data)
      })
    })


    // On a child node

    var boostrap = ...
    var Node = ...
 
    var node = new Node(bootstrap).join()
    node.on('parent-connect', function (channel) {
      channel.on('data', function (data) {
        console.log(data)
        channel.send('pong')      
      })
    })
    node.on('child-connect', function (channel) {
      channel.send('ping')        
    })


# API

## Node(bootstrap, [opts])

*bootstrap* is a
[webrtc-bootstrap](https://github.com/elavoie/webrtc-bootstrap) connected
client.

*opts* has the following defaults:

{
  peerOpts: {},
  maxDegree: 10
}

where 
  - `opts.peerOpts` are options passed to [SimplePeer](https://github.com/feross/simple-peer)
  - `opts.maxDegree` is the maximum number of children a node will keep

## Node.children

The current list of children channels.

## Node.parent

The parent channel, null if the node has not joined yet or is the root.

### Node.becomeRoot(secret)

Become root (through the bootstrap client), after which the node will automatically handle join requests.

### Node.join()

Join an existing tree (through the bootstrap client).

### Node.close()

Close the node and all associated channels.

### Node.on('data', function (data, channel, isParent))
- *data* received from of the direct neighbours, either parent or children;
- *channel*: on which it was received;
- *isParent* whether the channel is from our parent (`true`) or one of our children (`false`).

### Node.on('parent-connect', function (channel))

When the node is ready to communicate with its parent through *channel*.

### Node.on('parent-close', function (channel))

When the parent *channel* has closed. 

### Node.on('parent-error', function (channel, err))

When the parent *channel* has failed become of an error *err*.

### Node.on('child-connect', function (channel))

When the node is ready to communicate with new child through *channel*.

### Node.on('child-close', function (channel))

When the child *channel* has closed. 

### Node.on('child-error', function (channel, err))

When then child *channel* has failed because of *err*.


## Channel

Abstracts the underlying WebRTC channel to multiplex the tree join protocol with application-level messages. Lightweight messages can be sent on the topology channels. However, for any heavy data traffic a dedicated SimplePeer connection should be established, possibly through the channel.

The constructor is only called internally by the Node.

### Channel.send(data)

Sends *data* to the neighbour through the channel.

### Channel.destroy()

### Channel.on('data', function (data))

When data has been received.
