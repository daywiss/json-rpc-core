var EmitterRPC = require('../examples/emitter-rpc')
var Emitter = require('events')
var lodash = require('lodash')
var Promise = require('bluebird')

var methods = {
  slowEcho:function(msg){
    return Promise.delay(1000).then(function(){
      return JSON.stringify({
        msg:"Uses util.inspect() on obj and prints the resulting string to stdout. This function bypasses any custom inspect() function defined on obj. An optional options object may be passed to alter certain aspects of the formatted string: showHidden - if true then the object's non-enumerable and symbol properties will be shown too. Defaults to false.  depth - tells util.inspect() how many times to recurse while formatting the object. This is useful for inspecting large complicated objects. Defaults to 2. To make it recurse indefinitely, pass null.  colors - if true, then the output will be styled with ANSI color codes. Defaults to false. Colors are customizable; see customizing util.inspect() colors.  console.error([data][, ...args])",
        a:"Uses util.inspect() on obj and prints the resulting string to stdout. This function bypasses any custom inspect() function defined on obj. An optional options object may be passed to alter certain aspects of the formatted string: showHidden - if true then the object's non-enumerable and symbol properties will be shown too. Defaults to false.  depth - tells util.inspect() how many times to recurse while formatting the object. This is useful for inspecting large complicated objects. Defaults to 2. To make it recurse indefinitely, pass null.  colors - if true, then the output will be styled with ANSI color codes. Defaults to false. Colors are customizable; see customizing util.inspect() colors.  console.error([data][, ...args])",
        b:"Uses util.inspect() on obj and prints the resulting string to stdout. This function bypasses any custom inspect() function defined on obj. An optional options object may be passed to alter certain aspects of the formatted string: showHidden - if true then the object's non-enumerable and symbol properties will be shown too. Defaults to false.  depth - tells util.inspect() how many times to recurse while formatting the object. This is useful for inspecting large complicated objects. Defaults to 2. To make it recurse indefinitely, pass null.  colors - if true, then the output will be styled with ANSI color codes. Defaults to false. Colors are customizable; see customizing util.inspect() colors.  console.error([data][, ...args])",
      })
    })
  },
}

var emitter = new Emitter()
var client = EmitterRPC.client('test',emitter,methods)
var server = EmitterRPC.server('test',emitter,methods)

var sends = 1000

module.exports = function(test){
  test('stress test',function(t){
    t.test('send a bunch',function(t){
      t.plan(sends)

      send(0)
      function send(sent){
        if(sent >= sends) return 
        var str = 'call: '+sent
        console.time(str)
        client.call('slowEcho',str).then(function(result){
          console.timeEnd(str)
          // t.equal(str,result)
          t.ok(result)
        }).catch(t.end)

        setTimeout(function(){ send(sent+1) })
      }
    })
    t.test('end',function(t){
      client.end()
      server.end()
      t.end()
    })
  })
}

// setInterval(function(){
//   sent+=2

//   server.call('slowEcho','server'+sent)
//   .then(function(){
//     complete++
//   })
//   .catch(function(err){
//     console.log(err)
//   }) 
//   print()
// },1)

// var print = lodash.throttle(function(){
//   console.log(sent,complete)
// },1000)
