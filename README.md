# json-rpc-core
Transport agnostic JSON RPC message handling API meant for streams.  This library uses highland to wrap callbacks and promises into stream.

#Install
``` npm install --save json-rpc-core```   

#Adding Transport Layer
Example using the json-rpc-core with an event emitter, found in examples folder:

```js
const _ = require('highland')
const RPC = require('../')
const assert = require('assert')

//create an rpc "client" with methods the server can call
module.exports.client = function(id,emitter,methods){
  assert(id)
  assert(emitter)
  var client = id + ' client'
  var server = id + ' server'
  return Emitter(client,server,emitter,methods)
}

//create the rpc "server" with methods client can call
module.exports.server = function(id, emitter,methods){
  assert(id)
  assert(emitter)
  var client = id + ' client'
  var server = id + ' server'
  return Emitter(server,client,emitter,methods)
}

function Emitter(localid,remoteid,emitter,methods){
  var rpc = RPC(methods || {})

  //create a stream from events with the localid
  _(localid,emitter)
    //send to json-rpc-core
    .pipe(rpc)
    //handle results and emit them to remote id
    .on('data',function(message){
      emitter.emit(remoteid,message)
    })

    //return rpc object which has call and notify functions
    return rpc
}

```

#Usage
```js
  var EmitterRPC = require('../examples/emitter-rpc')
  var Emitter = require('events')
  var Promise = require('bluebird')

  //example of methods available through RPC on a server
  var methods = {
    echo:function(msg){
      return msg
    },
    error:function(msg){
      throw new Error(msg)
    },
    promiseError:function(msg){
      return Promise.reject(msg)
    },
    promise:function(msg){
      return Promise.resolve(msg)
    }
  }

  //note normally you would just have methods on server, but server can call client as well
  var client = EmitterRPC.client('test',emitter,methods)
  var server = EmitterRPC.server('test',emitter,methods)

  //rpc calls client to server, but server to client work as well
  client.call('echo','echo').then(function(result){
    //result == 'echo'
  })

  client.call('promise','echo').then(function(result){
    //result == 'echo'
  })

  client.call('error','echo').catch(function(err){
    //err == 'echo'
  })

  client.call('promiseError','echo').catch(function(err){
    //err == 'echo'
  })

  //client and server also can notify each other
  client.on('test',function(result){
    //result == 'test'
  })
  server.notify('test','test')

```

