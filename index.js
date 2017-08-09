var _ = require('highland')
var Promise = require('bluebird')
var jrs = require('jsonrpc-serializer')
var shortid = require('shortid')
var lodash = require('lodash')
var assert = require('assert')


function RPC(methods,timeoutMS){
  methods = methods || {}
  //map of pending requests
  var requests = { }
  //stream to write remote calls to
  var outstream = _()
  //timeout length to wait for response
  timeoutMS = timeoutMS || 10000

  //json rpc system extensions to allow for meta requests
  //these will be tacked on after any methods passed in
  var extensions = {}

  extensions.rpc_discover = function(){
    return lodash.keys(methods)
  }

  extensions.rpc_echo = function(params){
    return params
  }

  var instream =  _.pipeline(function(s){
    return s.map(function(message){
      return jrs.deserialize(message)
    }).consume(function(err,message,push,next){
      if(message === _.nil){
        return push(null,message)
      }
      switch(message.type){
        case 'request':
          handleRequest(message.payload).then(function(result){
            push(null,result)
          }).catch(push)
          break
        case 'notification':
          handleNotify(message.payload)
          break
        case 'error':
          handleError(message.payload)
          break
        case 'success':
          handleSuccess(message.payload)
          break 
        default:
          push(err,message)
      }
      next()
    }).errors(function(err,next){
      console.log('JSON-RPC-CORE', err.toString())
      next(err)
    }).pipe(outstream)
  })

  function callMethod(method,params,context){
    if(lodash.isFunction(method)){
      return method.apply(context,params)
    }
    return method
  }

  function callFromRequest(method,params){
    return Promise.try(function(){
      if(lodash.has(methods,method)){
        var func = lodash.get(methods,method)
        return callMethod(func,params,methods)
      }
      if(lodash.has(extensions,method)){
        var func = lodash.get(extensions,method)
        return callMethod(func,params,extensions)
      }
      throw new jrs.err.MethodNotFoundError(method)
    }).catch(function(err){
      if(err instanceof jrs.err.MethodNotFoundError){
        throw err
      }
      if(lodash.isError(err)){
        throw new jrs.err.JsonRpcError(err.message || '',method,err.stack) 
      }else{
        throw new jrs.err.JsonRpcError(err || '',method)
      }
    })
  }

  //on the server end, handle a method call from client
  function handleRequest(message){
    var method = message.method
    var id = message.id
    var params = message.params
    return callFromRequest(method,params).then(function(result){
      //empty response not allowed. stupid
      var result = jrs.success(id,result || '')
      if(result instanceof jrs.err.MethodNotFoundError){
        throw result
      }
      if(result instanceof jrs.err.ParseError){
        throw result
      }
      if(result instanceof jrs.err.InvalidRequestError){
        throw result
      }
      if(result instanceof jrs.err.InvalidParamsError){
        throw result
      }
      return result
    }).catch(function(err){
      return jrs.error(id,err)
    })
  }

  function handleNotify(message){
    var method = message.method
    var params = message.params
    instream.emit.bind(instream,method).apply(instream,params)
  }

  function handleError(message){
    var request = getRequest(message.id)
    if(request == null) return 
    var err = new Error(lodash.get(message,'error.message',null))
    err.stack = lodash.get(message,'error.data[1]',null)
    request.reject(err)
    removeRequest(message.id)
  }

  function handleSuccess(message){
    var request = getRequest(message.id)
    if(request == null) return
    request.resolve(message.result)
    removeRequest(message.id)
  }

  function handleDiscover(message){
    return lodash.keys(methods)
  }

  function addRequest(id){
    return new Promise(function(res,rej){
      lodash.set(requests,id,{
        id:id,
        resolve:res,
        reject:rej,
        expires:Date.now() + timeoutMS
      })
    })
  }

  function removeRequest(id){
    return lodash.unset(requests,id)
  }

  function getRequest(id){
    return lodash.get(requests,id,null)
  }

  function timeout(request){
    if(request == null) return
    request.reject(new Error('request timed out'))
    removeRequest(request.id)
  }

  function checkTimeouts(ts){
    return new Promise(function(res,rej){
      _.values(requests).filter(function(request){
        return request.expires < ts
      }).doto(timeout).errors(rej).toArray(res)
    })
  }

  function timeoutLoop(){
    checkTimeouts(Date.now()).then(function(expired){
      setTimeout(timeoutLoop,100)
    })
  }


  function call(method){
    var id = shortid.generate()
    var argumentList = Array.prototype.slice.call(arguments,1)
    if(lodash.isArray(method)){
      method = method.join('.')
    }
    message = jrs.request(id,method,argumentList)
    outstream.write(message)
    return addRequest(id)
  }

  function notify(channel){
    var argumentList = Array.prototype.slice.call(arguments,1)
    message = jrs.notification(channel,argumentList)
    outstream.write(message)
  }

  function discover(){
    return call('rpc_discover')
  }

  function echo(params){
    return call('rpc_echo',params)
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

  //start message timeout loop
  timeoutLoop()

  //make some methods public
  instream.discover = discover
  instream.echo = echo
  instream.call = call
  instream.notify = notify
  instream.createRemoteCalls = wrapMethods
  return instream
}

module.exports = RPC
