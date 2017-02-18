var EmitterRPC = require('../examples/emitter-rpc')
var Emitter = require('events')
var lodash = require('lodash')
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
  fakeError:function(msg){
    throw msg
  },
  runtimeError:function(msg){
    return msgs
  },
  promiseError:function(msg){
    return Promise.reject(msg)
  },
  promise:function(msg){
    return Promise.resolve(msg)
  },
  nested:{
    call:function(){
      return true
    }
  },
  plainObject:{
    array:[1,2,3,],
    string:'hello world'
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
      t.plan(4)
      client.on('test',function(a,b){
        t.equal('test1',a)
        t.equal('test2',b)
      })
      server.on('test',function(a,b){
        t.equal('test1',a)
        t.equal('test2',b)
      })
      client.notify('test','test1','test2')
      server.notify('test','test1','test2')
    })
    t.test('no method',function(t){
      t.plan(2)
      client.call('nomethod').then(t.end).catch(function(err){
        t.ok(err)
        t.ok(err)
      })
    })
    t.test('fake error',function(t){
      t.plan(2)
      client.call('fakeError','fakeError').then(t.end).catch(function(err){
        t.ok(lodash.isError(err))
      })
      server.call('fakeError').then(t.end).catch(function(err){
        t.ok(lodash.isError(err))
      })
    })
    t.test('runtime error',function(t){
      t.plan(2)
      client.call('runtimeError').then(t.end).catch(function(err){
        t.ok(err.stack)
        t.ok(lodash.isError(err))
      })
    })
    t.test('error',function(t){
      var str = 'test'
      t.plan(4)
      clientCalls.error(str).catch(function(err){
        t.ok(err.stack)
        t.equal(str,err.message)
      })
      serverCalls.error(str).catch(function(err){
        t.ok(err.stack)
        t.equal(str,err.message)
      })
    })
    t.test('promise error',function(t){
        var str = 'test'
        t.plan(2)
        clientCalls.promiseError(str).catch(function(err){
          t.equal(str,err.message)
        })
        serverCalls.promiseError(str).catch(function(err){
          t.equal(str,err.message)
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
    t.test('nested call',function(t){
      t.plan(2)
      client.call('nested.call').then(function(result){
        t.ok(result)
      }).catch(t.end)
      client.call(['nested','call']).then(function(result){
        t.ok(result)
      }).catch(t.end)
    })

    t.test('plain object',function(t){
      t.plan(2)
      client.call('plainObject').then(function(result){
        t.deepEqual(result,methods.plainObject)
      })
      client.call('plainObject.array.1').then(function(result){
        t.deepEqual(result,2)
      })
    })
    t.test('discover',function(t){
      t.plan(2)
      client.discover().then(function(result){
        t.deepEqual(lodash.keys(methods),result)
      }).catch(t.end)
      server.discover().then(function(result){
        t.deepEqual(lodash.keys(methods),result)
      }).catch(t.end)
    })
  })
}
