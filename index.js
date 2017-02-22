/**
 * @author Takahiro / https://github.com/takahirox
 */

if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before' +
                  'AFRAME was available.');
}

var Peer = require('./libs/Peer');

AFRAME.registerComponent('webrtc', {
  schema: {
    room: {type: 'int', default: 5555},
    ws: {type: 'string', default: 'wss://boiling-anchorage-5279.herokuapp.com/'},
  },

  init: function () {
    this.master = false;
    this.connected = false;
    this.senders = [];
    this.receivers = [];

    var data = this.data;
    this.peer = new Peer(data.room, data.ws, this);
    this.peer.createPeerConnection();
  },

  update: function () {
  },

  remove: function () {
  },

  tick: function(time, delta) {
  },

  notifyWsReady: function (e) {
    console.log('Web Socket is Ready');
    console.log(e);
  },

  notifyRoomUpdate: function (num) {
    console.log('Room Updated');
    console.log(num + ' people in the room');
    if (num === 1) {
      this.master = true;
      console.log('You became a master');
    } else if (num === 2) {
      if (this.master) {
        this.peer.offer();
      }
    } else if (num > 2) {
      console.log('Over the capacity');
    }
  },

  notifyOpenPeer: function (e) {
    console.log('Peer Opened');
    console.log(e);
    this.connected = true;
    this.sendConnection('a-entity');
    this.sendConnection('a-camera');
  },

  sendConnection: function (name) {
    var els = this.el.querySelectorAll(name);
    for (var i = 0, il = els.length; i < il; i++) {
       var el = els[i];
       if (el.getAttribute('webrtc-sender')) {
         this.senders.push(el);
         el.emit('connected', {peer: this.peer});
       }
       if (el.getAttribute('webrtc-receiver')) {
         this.receivers.push(el);
         el.emit('connected', {peer: this.peer});
       }
    }
  },

  receiveFromPeer: function (data) {
    for (var i = 0, il = this.receivers.length; i < il; i++) {
      this.receivers[i].emit('received', {data: data});
    }
  }
});


AFRAME.registerComponent('webrtc-sender', {
  schema: {
  },

  init: function () {
    this.peer = null;

    var self = this;
    this.el.addEventListener('connected', function (e) {
      self.connected(e);
    });
  },

  update: function () {
  },

  remove: function () {
  },

  tick: function(time, delta) {
    if (this.peer !== null && this.el.object3D) {
      var object = this.el.object3D;
      this.peer.send({position: object.position.toArray(),
                      quaternion: object.quaternion.toArray()});
    }
  },

  connected: function(e) {
    this.peer = e.detail.peer;
  }
});

AFRAME.registerComponent('webrtc-receiver', {
  schema: {
  },

  init: function () {
    this.peer = null;

    var self = this;
    this.el.addEventListener('connected', function (e) {
      self.connected(e);
    });
    this.el.addEventListener('received', function (e) {
      self.received(e);
    });
  },

  update: function () {
  },

  remove: function () {
  },

  tick: function(time, delta) {
  },

  connected: function(e) {
    this.peer = e.detail.peer;
  },

  received: function(e) {
    if (this.peer !== null && this.el.object3D) {
      var p = e.detail.data.position;
      var q = e.detail.data.quaternion;
      var object = this.el.object3D;
      object.position.fromArray(p);
      object.position.y -= 1.5; // model specific
      object.quaternion.fromArray(q);
      object.rotateY(Math.PI); // model specific
    }
  }
});
