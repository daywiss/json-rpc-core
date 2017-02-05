# json-rpc-core
Transport agnostic JSON RPC message handling API meant for streams and promises.  

#Install
``` npm install --save json-rpc-core```   

#Usage  
This library is meant to be used with some transport layer, it can be any type, Redis, TCP, UDP, SocketIO, etc.
All this library does is create a node steam compatible interface to pipe in incoming messages and pipe out outgoing messages.
As long as your server and client classes are syncronous or return promises then you can wrap them with JSON-RPC-Core add a transport layer
and you have a working RPC interface.

```js
//Simple example using an event emitter as our transport layer
var RPC = require('json-rpc-core')
var Emitter = require('events')

//stub for an actual class with functions
//these functions can return promises as well.
//any possible errors will be caught and returned to the caller.
var rpcMethods = {
  echo:function(msg){
    return msg
  }
}

//pretend this emitter is a socket or some transport layer
var emitter = new Emitter()

//this will wire up the emitter into the rpc-core
function makeEmitterRPC(localid,remoteid,methods){

  //instantiate the rpc stream
  var rpc = RPC(methods)
  
  //emitter will fire on the localid when it receives a message
  emitter.on(localid,function(msg){
    //write that message to the rpc stream
    rpc.write(msg)
  })

  //rpc will fire when its emitting a message to the remote, such as a response
  //or a notification
  rpc.on('data',function(msg){
    //emit that message to the remote id
    emitter.emit(remoteid,msg)
  })

  return rpc
}

//these rpc clients can talk to each other using the rpcMethods class
var client = makeEmitterRPC('client','server',rpcMethods)
var server = makeEmitterRPC('server','client',rpcMethods)

//the client calls the echo function and the server responds
client.call('echo','message to echo').then(function(result){
  //result == 'message to echo'
})

//client sends a 'knock knock' event to the server. Notifications dont expect a response.
client.notify('knock knock')

//discover your remote server commands
client.discover().then(function(result){
  //result == ['echo']
})

//server would be able to call these same functions to the client, since the client
//was created with the rpcMethods class as well. 

```
#API

##Initialization
Create the rpc core stream. 

```js
  var RPC = require('json-rpc-core')

  var rpc = RPC(methods,timeoutMS)
```
###Parameters
* methods (optional) - methods which are available to be called over RPC. Functions must be syncronous or use promises.
* timeoutMS (optional) - defaults to 10000, 10 seconds. Milliseconds that messages should timeout when waiting for response. Can be disabled if set to 0, but this is not recommended
as requests will pile up waiting for responses from remote. 

###Returns
A [highland](http://highlandjs.org) stream.

##Call
Call a remote function by name. Allows any number of parameters. Returns a promise which can resolve or reject.
```js
  rpc.call(remoteFunction,param1,param2, etc...)
```

###Parameters
Parameters are variable, they will just be passed through to remote function    
* remoteFunction (required) - the name of the remote function you wish to call
* params_n (optional) - N number of parameters which the remote functions requires

###Returns
Promise with the result from the remote call


##Notify
Notify the remote, essentially cause a specific event to fire. Certain events names are reserved since they conflict
with the node stream api: 'data', 'close', 'drain', 'error', 'finish', 'pipe', 'unpipe', 'end', 'readable'.
The library does not prevent you from emitting these events but the resulting behavior is undefined. 

```js
  rpc.notify(eventName,param1,param2, etc...)
```

###Parameters
Parameters are variable, they will just be passed through to remote function    
* eventName (required) - the name of the event you want to emit on the remote
* params_n (optional) - N number of parameters which get passed into the event callback.

###Returns
Nothing

##Discover
Utility function to discover remote method names. This is implemented as a custom RPC message "rpc_discover". The
JSON RPC protocol allows for custom methods signified by the "rpc" prefix. If a conflict is found with a local method
the local method will override the extension. 

```js
  rpc.discover()
```

###Returns
A promise which resolves to an array of callable remote method names.  Use in conjuction with rpc.createRemoteCalls.

##Create Remote Calls
Produces a new object with functions keyed by the function names you pass into it.
The functions are just shortcuts to the `rpc.call` function.  Use in conjuction
with `rpc.discover` to create an object which mirrors the remote API calls.

```js
  rpc.discover().then(function(methods){
    //server is an object with remote method calls
    var server = rpc.createRemoteCalls(methods)
  })
```

###Parameters
This takes an array of strings, it just creates an object keyed by the strings
* methods (required) - an array of strings which you want to turn into function calls

###Returns
An object keyed by the string names which act as a shortcut to `rpc.call`

##Echo
Utility function which allows you to "ping" the remote with a message, like a connectivity test. This is implemented as a custom RPC message "rpc_echo". The
JSON RPC protocol allows for custom methods signified by the "rpc" prefix. If a conflict is found with a local method
the local method will override the extension. 

```js
  rpc.echo(message)
```

###Parameters
Function takes single paramter
* message (optional) - a message you want echoed back to you.

###Returns
A promise which resolves to your original message.

#Errors
Errors can be thrown from the remote service syncronously or through an asycnronous promise. The RPC library
will wrap all errors in a JSON RPC Error format and provide the error in this form when returned to the client.

```js
rpc.call('functionThatThrowsError').catch(function(err){
  err == {
    name:'JsonRpcError',
    code:-32603,
    message:'your error message',
    data:[]
  }
})

rpc.call('functionThatDoesNotExist').catch(function(err){
  err == {
    name:'MethodNotFoundError',
    code:-32601,
    message:'The JSON-RPC method does not exist, or is an invalid one.',
    data:[]
  }
})
```
You should always add a catch block to your function calls. The message field is typically the most descriptive part
of the error. The data field can contain additial data about the error such as stack trace but currently is unused.


#Previous Versions
Anyone using a version before 1.2 should upgrade, The previous message stream
implementation messages only allowed messages to resolve in order. This would be an issue if there are 
major delays in responding to requests, causing essentially a traffic jam in serving requests. 


