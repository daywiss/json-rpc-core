const _ = require('highland')
const RPC = require('../')
const assert = require('assert')

module.exports.client = function(id,emitter,methods){
  assert(id)
  assert(emitter)
  var client = id + ' client'
  var server = id + ' server'
  return Emitter(client,server,emitter,methods)
}

module.exports.server = function(id, emitter,methods){
  assert(id)
  assert(emitter)
  var client = id + ' client'
  var server = id + ' server'
  return Emitter(server,client,emitter,methods)
}

function Emitter(localid,remoteid,emitter,methods){
  var rpc = RPC(methods || {})

  _(localid,emitter)
    .pipe(rpc)
    .on('data',function(message){
      emitter.emit(remoteid,message)
    })

    return rpc
}

