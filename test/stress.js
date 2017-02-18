var EmitterRPC = require('../examples/emitter-rpc')
var Emitter = require('events')
var lodash = require('lodash')
var Promise = require('bluebird')

var methods = {
  slowEcho:function(msg){
    return Promise.delay(2000).then(function(){
      return msg
    })
  },
}

var emitter = new Emitter()
var client = EmitterRPC.client('test',emitter,methods)
var server = EmitterRPC.server('test',emitter,methods)

var sent = 0
var sends = 1000

module.exports = function(test){
  test('stress test',function(t){
    t.test('send a bunch',function(t){
      t.plan(sends)

      send()
      function send(){
        sent+=1
        var str = 'client'+sent
        client.call('slowEcho',str).then(function(result){
          t.equal(str,result)
        }).catch(t.end)

        if(sent < sends){
          setTimeout(send,1)
        }
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
