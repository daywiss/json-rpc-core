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

  emitter.on(localid,function(msg){
    rpc.write(msg)
  })

  rpc.on('data',function(msg){
    emitter.emit(remoteid,msg)
  })

  // //create a stream from events with the localid
  // _(localid,emitter)
  //   //send to json-rpc-core
  //   .pipe(rpc)
  //   //handle results and emit them to remote id
  //   .each(function(message){
  //     emitter.emit(remoteid,message)
  //   })

    //return rpc object which has call and notify functions
    return rpc
}

