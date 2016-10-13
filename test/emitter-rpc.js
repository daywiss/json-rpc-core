var EmitterRPC = require('../examples/emitter-rpc')
var Emitter = require('events')
var Promise = require('bluebird')

var methods = {
  echo:function(msg){
    return msg
  },
  nothing:function(){
  },
  nothingPromise:function(){
    return Promise.resolve()
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

module.exports = function(test){
  var emitter = new Emitter()
  var client, server
  var clientCalls, serverCalls
  test('testing emitter rpc',function(t){
    t.test('init',function(t){
      client = EmitterRPC.client('test',emitter,methods)
      server = EmitterRPC.server('test',emitter,methods)
      clientCalls = client.createRemoteCalls(Object.keys(methods))
      serverCalls = server.createRemoteCalls(Object.keys(methods))
      t.ok(client)
      t.ok(server) 
      t.ok(clientCalls)
      t.ok(serverCalls) 
      t.end()
    })
    t.test('echo',function(t){
      var str = 'test'
      var obj = {
        message:'test'
      }
      var arr = ['test']

      t.plan(6)
      clientCalls.echo(str).then(function(result){
        t.equal(result,str)
      })
      serverCalls.echo(str).then(function(result){
        t.equal(result,str)
      })
      clientCalls.echo(obj).then(function(result){
        t.deepEqual(result,obj)
      })
      serverCalls.echo(obj).then(function(result){
        t.deepEqual(result,obj)
      })
      clientCalls.echo(arr).then(function(result){
        t.deepEqual(result,arr)
      })
      serverCalls.echo(arr).then(function(result){
        t.deepEqual(result,arr)
      })
    })
    t.test('promise',function(t){
      var str = 'test'
      var obj = {
        message:'test'
      }
      var arr = ['test']
      t.plan(6)
      clientCalls.promise(str).then(function(result){
        t.equal(result,str)
      })
      serverCalls.promise(str).then(function(result){
        t.equal(result,str)
      })
      clientCalls.promise(obj).then(function(result){
        t.deepEqual(result,obj)
      })
      serverCalls.promise(obj).then(function(result){
        t.deepEqual(result,obj)
      })
      clientCalls.promise(arr).then(function(result){
        t.deepEqual(result,arr)
      })
      serverCalls.promise(arr).then(function(result){
        t.deepEqual(result,arr)
      })
    })
    t.test('notify',function(t){
      t.plan(2)
      client.on('test',function(result){
        t.equal('test',result)
      })
      server.on('test',function(result){
        t.equal('test',result)
      })
      client.notify('test','test')
      server.notify('test','test')
    })
    t.test('error',function(t){
      var str = 'test'
      t.plan(2)
      clientCalls.error(str).catch(function(err){
        t.equal(str,err)
      })
      serverCalls.error(str).catch(function(err){
        t.equal(str,err)
      })
    })
    t.test('promise error',function(t){
        var str = 'test'
        t.plan(2)
        clientCalls.promiseError(str).catch(function(err){
          t.equal(str,err)
        })
        serverCalls.promiseError(str).catch(function(err){
          t.equal(str,err)
        })
    })
    t.test('nothing',function(t){
        t.plan(2)
        clientCalls.nothing().then(function(result){
          t.notOk(result)
        })
        serverCalls.nothing().then(function(result){
          t.notOk(result)
        })
    })
    t.test('nothing promise',function(t){
        t.plan(2)
        clientCalls.nothingPromise().then(function(result){
          t.notOk(result)
        })
        serverCalls.nothingPromise().then(function(result){
          t.notOk(result)
        })
    })
  })
}
