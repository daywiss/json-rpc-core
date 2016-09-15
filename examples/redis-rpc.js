var _ = require('highland')
var Promise = require('bluebird')
var RPC = require('../')

function Redis(id,pub,sub,methods,server){

  var rpc = RPC(methods || {})
  
  var sendChannel = [id,'request'].join(':')
  var receiveChannel = [id,'response'].join(':')

  //this is a server
  if(server){
    sendChannel = [id,'response'].join(':')
    receiveChannel = [id,'request'].join(':')
  }

  _('message',sub,['channel','data'])
  .filter(function(data){
    return data.channel == receiveChannel
  }).map(function(data){
    return data.data
  }).pipe(rpc).pipe(_()).each(function(data){
    pub.publish(sendChannel,data)
  })

  sub.setMaxListeners(0)

  return Promise.fromCallback(function(cb){
    return sub.subscribe(receiveChannel,cb)
  }).then(function(){
    return rpc
  })
}

module.exports.client = function(id,pub,sub){
  return Redis(id,pub,sub)
}

module.exports.server = function(id,pub,sub,methods){
  return Redis(id,pub,sub,methods,true)
}

