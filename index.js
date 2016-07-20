var _ = require('highland')
var Promise = require('bluebird')
var jrs = require('jsonrpc-serializer')
var shortid = require('shortid')


function RPC(methods){
  var requests = { }
  var outstream = _()

  var stream =  _.pipeline(function(s){
    return s.map(function(message){
      return jrs.deserialize(message)
    }).flatMap(function(message){
      switch(message.type){
        case 'request':
          return _(handleRequest(message.payload))
        case 'notification':
          return _(handleNotify(message.payload))
        case 'error':
          return _(handleError(message.payload))
        case 'success':
          return _(handleSuccess(message.payload))
        default:
          return _(Promise.resolve(false))
      }
    }).errors(function(err,next){
      console.log(err)
      next()
    }).compact().pipe(outstream)
  })

  function handleRequest(message){
    var method = message.method
    var id = message.id
    var params = message.params

    if(methods[method] == null){
      var err = new jrs.err.MethodNotFoundError()
      return Promise.resolve(jrs.error(id,err))
    }
    return Promise.resolve(methods[method](params)).then(function(result){
      return jrs.success(id,result)
    }).catch(function(err){
      err = new jrs.err.JsonRpcError(err)
      return jrs.error(id,err)
    })
  }

  function handleNotify(message){
    var method = message.method
    var params = message.params
    stream.emit(method,params)
    return Promise.resolve(false)
  }

  function handleError(message){
    var id = message.id
    if(requests[id] == null) return Promise.resolve(false)
    requests[id].reject(message.error.message)
    delete requests[id]
    return Promise.resolve(false)
  }

  function handleSuccess(message){
    var id = message.id
    if(requests[id] == null) return Promise.resolve(false)
    requests[id].resolve(message.result)
    delete requests[id]
    return Promise.resolve(false)
  }

  function timeout(id){
    var request = requests[id]
    if(request == null) return
    request.reject('request timed out')
    delete requests[id]
  }

  function call(method,params){
    var id = shortid.generate()
    message = jrs.request(id,method,params)
    var promise = new Promise(function(resolve,reject){
       requests[id] = {
         resolve:resolve,
         reject:reject,
         timeout:setTimeout(function(){
           timeout(id)
         },5000)
       }
    })
    outstream.write(message)
    return promise
  }

  function notify(channel,data){
    message = jrs.notification(channel,data)
    outstream.write(message)
  }

  stream.call = call
  stream.notify = notify
  return stream
}

module.exports = RPC
