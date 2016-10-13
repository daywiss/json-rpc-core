var _ = require('highland')
var Promise = require('bluebird')
var jrs = require('jsonrpc-serializer')
var shortid = require('shortid')
var lodash = require('lodash')
var assert = require('assert')


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
      console.log('JSON-RPC-CORE', err.toString())
      next(err)
    }).compact().pipe(outstream)
  })

  //on the server end, handle a method call from client
  function handleRequest(message){
    var method = message.method
    var id = message.id
    var params = message.params

    //method does not exist on server
    if(methods[method] == null){
      var err = new jrs.err.MethodNotFoundError()
      return Promise.resolve(jrs.error(id,err))
    }

    var result = null
    //in case the function throws an error
    try{
      result = methods[method].apply(methods,params)
    }catch(err){
      err = new jrs.err.JsonRpcError(err.message) 
      return Promise.resolve(jrs.error(id,err))
    }

    //wrap result in promise
    return Promise.resolve(result).then(function(result){
      return jrs.success(id,result || '')
    }).catch(function(err){
      //check if actual error object or just a string
      if(lodash.isError(err)){
        err = new jrs.err.JsonRpcError(err.message) 
      }else{
        err = new jrs.err.JsonRpcError(err)
      }
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

  function call(method){
    var id = shortid.generate()
    var argumentList = Array.prototype.slice.call(arguments,1)
    message = jrs.request(id,method,argumentList)
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

  function wrapMethod(methodName){
    return call.bind(null,methodName)
  }

  function wrapMethods(methodNames){
    assert(methodNames,'requires list of method names')
    assert(lodash.isArray(methodNames),'requires list of method names')
    return lodash.reduce(methodNames,function(result,name){
      result[name] = wrapMethod(name)
      return result
    },{})
  }

  stream.call = call
  stream.notify = notify
  stream.createRemoteCalls = wrapMethods
  return stream
}

module.exports = RPC
