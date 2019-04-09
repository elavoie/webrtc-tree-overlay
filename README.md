# webrtc-tree-overlay

Dynamically maintains a tree overlay topology from nodes connected by WebRTC as
they join and leave. Each node accepts a maximum number of new connections after 
which the newer connection requests are delegated to children.

Requires a publicly accessible server for bootstrapping the connections,
provided by [webrtc-bootstrap](https://github.com/elavoie/webrtc-bootstrap).

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

# Example Application

Server process:
````
  DEBUG='webrtc-tree-overlay*,webrtc-bootstrap*' bin/server
````

Root process:
````
  DEBUG='webrtc-tree-overlay*,webrtc-bootstrap*' bin/root --host localhost:5000
````

Node process(es):
````
  DEBUG='webrtc-tree-overlay*,webrtc-bootstrap*' bin/node --host localhost:5000 --origin nodejs_node
````

Browser process(s):
````
  open http://localhost:5000/#browser_node
````

# API

## Node(bootstrap, [opts])

*bootstrap* is a
[webrtc-bootstrap](https://github.com/elavoie/webrtc-bootstrap) connected
client.

*opts* has the following defaults:

{
  peerOpts: {},
  maxDegree: 10,
  requestTimeoutInMs: 30 * 1000
}

where 
  - `opts.peerOpts` are options passed to [SimplePeer](https://github.com/feross/simple-peer)
  - `opts.maxDegree` is the maximum number of children a node will keep
  - `opts.requestTimeoutInMs` the upper bound on the time a candidate will be considered for joining. If the connection handshake has not been successfully before the end of the interval, the candidate is rejected.

## Node.children

The current dictionary of children channels.

## Node.childrenNb

The current number of children.

## Node.maxDegree

The maximum number of children and candidates that are kept. If a join request arrives while it will either be passed to one of the children, or kept until one a candidate has become a connected child.

## Node.parent

The parent channel, null if the node has not joined yet or is the root.

### Node.becomeRoot(secret[, cb])

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

Abstracts the underlying WebRTC channel to multiplex the tree join protocol with application-level messages. Lightweight messages can be sent on the topology on those channels. However, for any heavy data traffic a dedicated SimplePeer connection should be established. The channel can be used for that purpose.

The constructor is called internally by a Node during the joining process and it is not available publicly.

### Channel.id

Identifier of the channel, different from the Node.id on either side. From the point of view of a child, the id of its parent is always null. From the point of view of a parent, each child has a non-null unique id.

### Channel.destroy()

Closes the channel.

### Channel.isParent()

Return true if the channel is used to communicate with the Node's parent.

### Channel.send(data)

Sends *data* to the neighbour (parent or child) through the channel.


### Channel.on('close', function ())

Fires when the channel has closed.

### Channel.on('data', function (data))

Fires when data has arrived.

### Channel.on('error', function (err))

Fires an error aborted the channel.

### Channel.on('join-request', function (req))

Used internally. Fires when a join request has arrived. An application should not need to bother with those. 

