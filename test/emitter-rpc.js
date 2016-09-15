var EmitterRPC = require('../examples/emitter-rpc')
var Emitter = require('events')
var Promise = require('bluebird')

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

module.exports = function(test){
  var emitter = new Emitter()
  var client, server
  test('testing emitter rpc',function(t){
    t.test('init',function(t){
      client = EmitterRPC.client('test',emitter,methods)
      server = EmitterRPC.server('test',emitter,methods)
      t.ok(client)
      t.ok(server) 
      t.end()
    })
    t.test('echo',function(t){
      var str = 'test'
      var obj = {
        message:'test'
      }
      var arr = ['test']

      t.plan(6)
      client.call('echo',str).then(function(result){
        t.equal(result,str)
      })
      server.call('echo',str).then(function(result){
        t.equal(result,str)
      })
      client.call('echo',obj).then(function(result){
        t.deepEqual(result,obj)
      })
      server.call('echo',obj).then(function(result){
        t.deepEqual(result,obj)
      })
      client.call('echo',arr).then(function(result){
        t.deepEqual(result,arr)
      })
      server.call('echo',arr).then(function(result){
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
      client.call('promise',str).then(function(result){
        t.equal(result,str)
      })
      server.call('promise',str).then(function(result){
        t.equal(result,str)
      })
      client.call('promise',obj).then(function(result){
        t.deepEqual(result,obj)
      })
      server.call('promise',obj).then(function(result){
        t.deepEqual(result,obj)
      })
      client.call('promise',arr).then(function(result){
        t.deepEqual(result,arr)
      })
      server.call('promise',arr).then(function(result){
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
        client.call('error',str).catch(function(err){
          t.equal(str,err)
        })
        server.call('error',str).catch(function(err){
          t.equal(str,err)
        })
    })
    t.test('promise error',function(t){
        var str = 'test'
        t.plan(2)
        client.call('promiseError',str).catch(function(err){
          t.equal(str,err)
        })
        server.call('promiseError',str).catch(function(err){
          t.equal(str,err)
        })
    })
  })
}
