const _ = require('highland')
const RPC = require('../')
const assert = require('assert')
const lodash = require('lodash')

module.exports.client = function(id,methods,timeout){
  assert(id)
  var client = id + ' client'
  var server = id + ' server'
  return rpc(client,server,process,methods,timeout)
}

module.exports.server = function(id,methods,timeout){
  assert(id)
  assert(methods)
  var client = id + ' client'
  var server = id + ' server'
  return rpc(server,client,process,methods,timeout)
}


//the cluster master needs to pass messages between workers
//this wires up connections.
//worker ids must be known to the workers, this is how they identify
//their RPC targets
module.exports.master = function(cluster){
  var workers = {}
  var maxRetry = 10
  var retryWait = 500

  var msgQueue = _()

  msgQueue
    .map(handleRPC)
    .compact()
    .each(retry)

  cluster.on('online',addWorker)


  function handleRegister(worker,message){
    console.log('worker registered',message.id)
    workers[message.id] = worker
  }
  function retry(message){
    message.attempts = message.attempts || 0
    message.attempts ++
    if(message.attempts <= maxRetry){
      setTimeout(function(){
        msgQueue.write(message)
      },retryWait)
    }
  }

  function handleRPC(message){
    if(message == null) return
    var worker = workers[message.to]
    if(worker == null) return message
    worker.send(message)
    return null
  }


  function addWorker(worker){
    worker.on('message',function(message){
      if(message == null) return
      if(message.type == null) return
      switch(message.type){
        case 'register':
          handleRegister(worker,message)
          break
        case 'rpc':
          msgQueue.write(message)
          break
        default:
          return
      }
    })
  }

}

function rpc(localid,remoteid,messenger,methods,timeout){
  var rpc = RPC(methods || {},timeout)

      
  _('message',messenger)
    .filter(function(data){
      return data.to == localid && data.from == remoteid
    })
    .map(function(data){
      return data.payload
    })
    .pipe(rpc)
    .on('data',function(payload){
      messenger.send({
        type:'rpc',
        to:remoteid,
        from:localid,
        payload
      })
    })

    messenger.send({
      type:'register',id:localid
    })
    messenger.setMaxListeners(50)

    return rpc
}

