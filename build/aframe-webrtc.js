/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @author Takahiro / https://github.com/takahirox
	 */

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before' +
	                  'AFRAME was available.');
	}

	var Peer = __webpack_require__(1);

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


/***/ },
/* 1 */
/***/ function(module, exports) {

	function Peer(room, wsURL, receiver) {
	  this.room = room;
	  this.peopleInTheRoom = 0;
	  this.ws = new WebSocket(wsURL);
	  this.receiver = receiver;

	  this.pc = null;
	  this.channel = null;

	  var self = this;
	  this.gotSDPFunc = function(sdp) {self._gotSDP(sdp);};
	  this.onIceCandidateFunc = function(event) {self._onIceCandidate(event);};
	  this.onDataChannelFunc = function(event) {self._onDataChannel(event);};
	  this.onMessageFunc = function(event) {self._onMessage(event);};
	  this.onOpenFunc = function(event) {self._onOpen(event);};
	  this.onCloseFunc = function(event) {self._onClose(event);};
	  this.onErrorFunc = function(event) {self._onError(event);};
	  this.dummySendFunc = function() { self._keepSendDummy(); };

	  this.ws.onmessage = function(event) {self._gotSignal(event);};
	  this.ws.onopen = function(event) {self._wsReady(event);};

	  this.interval = null;
	  this.peerConnected = false;
	}

	// must be same as the server side ones.
	Peer.prototype._PEER_ID_DUMMY       = -1;
	Peer.prototype._PEER_ID_NOTICE_ROOM = 0;
	Peer.prototype._PEER_ID_SYNC        = 1;

	Peer.prototype._ICE_SERVERS = [
	{url:'stun:stun01.sipphone.com'},
	{url:'stun:stun.ekiga.net'},
	{url:'stun:stun.fwdnet.net'},
	{url:'stun:stun.ideasip.com'},
	{url:'stun:stun.iptel.org'},
	{url:'stun:stun.rixtelecom.se'},
	{url:'stun:stun.schlund.de'},
	{url:'stun:stun.l.google.com:19302'},
	{url:'stun:stun1.l.google.com:19302'},
	{url:'stun:stun2.l.google.com:19302'},
	{url:'stun:stun3.l.google.com:19302'},
	{url:'stun:stun4.l.google.com:19302'},
	{url:'stun:stunserver.org'},
	{url:'stun:stun.softjoys.com'},
	{url:'stun:stun.voiparound.com'},
	{url:'stun:stun.voipbuster.com'},
	{url:'stun:stun.voipstunt.com'},
	{url:'stun:stun.voxgratia.org'},
	{url:'stun:stun.xten.com'},
	{
		url: 'turn:numb.viagenie.ca',
		credential: 'muazkh',
		username: 'webrtc@live.com'
	},
	{
		url: 'turn:192.158.29.39:3478?transport=udp',
		credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
		username: '28224511:1379330808'
	},
	{
		url: 'turn:192.158.29.39:3478?transport=tcp',
		credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
		username: '28224511:1379330808'
	}
	];

	Peer.prototype._DUMMY_SPAN = 1000 * 20;
	Peer.prototype._DUMMY_DATA = JSON.stringify({_pid: Peer.prototype._PEER_ID_DUMMY});


	Peer.prototype.log = function(data) {
	//  console.log(data);
	};


	Peer.prototype._wsReady = function(event) {
	  if(this.receiver.notifyWsReady !== void 0)
	    this.receiver.notifyWsReady(event);
	  this._noticeRoom();
	  this._keepSendDummy();
	};


	Peer.prototype._noticeRoom = function() {
	  var str = JSON.stringify({_pid: this._PEER_ID_NOTICE_ROOM, room: this.room});
	  this.ws.send(str);
	};


	Peer.prototype.sendSignal = function(params) {
	  var str = JSON.stringify(params);
	  this.ws.send(str);
	  this.log(str);
	};


	Peer.prototype._gotSignal = function(event) {
	  var params = JSON.parse(event.data);

	  if(params._pid === void 0) {
	    switch(params.type) {
	      case 'offer':
	        this._gotOffer(params);
	        break;
	      case 'answer':
	        this._gotAnswer(params);
	        break;
	      case 'candidate':
	        this._gotCandidate(params);
	        break;
	    }
	  } else {
	    if(params._pid == Peer.prototype._PEER_ID_NOTICE_ROOM) {
	      this.peopleInTheRoom = params.num;
	      if(this.receiver.notifyRoomUpdate !== void 0)
	        this.receiver.notifyRoomUpdate(this.peopleInTheRoom);
	    }
	  }
	  this.log(params);
	};


	Peer.prototype.createPeerConnection = function() {
	  var servers = {'iceServers': this._ICE_SERVERS};

	  this.pc = new webkitRTCPeerConnection(servers);
	  this.pc.onicecandidate = this.onIceCandidateFunc;
	};


	Peer.prototype._onIceCandidate = function(event) {
	  if(event.candidate) {
	    var params = {type: 'candidate',
	                  sdpMLineIndex: event.candidate.sdpMLineIndex,
	                  candidate: event.candidate.candidate};
	    this.sendSignal(params);
	  }
	};


	Peer.prototype.offer = function() {
	  this.channel = this.pc.createDataChannel('mychannel',
	                                           {reliable: false});
	  this.channel.onmessage = this.onMessageFunc;
	  this.channel.onopen = this.onOpenFunc;
	  this.channel.onclose = this.onCloseFunc;
	  // TODO: temporal
	  this.channel.onerror = function(e) {
	    window.alert(e);
	    console.log(e);
	  };
	  this.pc.createOffer(this.gotSDPFunc, this.onErrorFunc);
	};


	Peer.prototype._gotSDP = function(sdp) {
	  this.pc.setLocalDescription(sdp);
	  this.sendSignal(sdp);
	};


	Peer.prototype._gotOffer = function(msg) {
	  this.pc.ondatachannel = this.onDataChannelFunc;
	  this._setRemoteDescription(msg);
	  this.pc.createAnswer(this.gotSDPFunc, this.onErrorFunc);
	};


	Peer.prototype._gotAnswer = function(msg) {
	  this._setRemoteDescription(msg);
	};


	Peer.prototype._gotCandidate = function(msg) {
	  var candidate = new RTCIceCandidate(msg);
	  this.pc.addIceCandidate(candidate);
	};


	Peer.prototype._setRemoteDescription = function(msg) {
	  this.pc.setRemoteDescription(new RTCSessionDescription(msg));
	};


	Peer.prototype._onDataChannel = function(event) {
	  this.channel = event.channel;
	  this.channel.onmessage = this.onMessageFunc;
	  this.channel.onopen = this.onOpenFunc;
	  this.channel.onclose = this.onCloseFunc;
	};


	Peer.prototype._onOpen = function(event) {
	  this.peerConnected = true;
	  this.ws.close(1000); // TODO: consider more
	  if(this.receiver.notifyOpenPeer !== void 0)
	    this.receiver.notifyOpenPeer(event);
	};


	Peer.prototype._onClose = function(event) {
	  this.peerConnected = false;
	  if(this.receiver.notifyClosePeer !== void 0)
	    this.receiver.notifyClosePeer(event);
	};


	Peer.prototype._onError = function(event) {
	  window.alert(event);
	};


	Peer.prototype._onMessage = function(event) {
	  this.log(event.data);
	  this.receiver.receiveFromPeer(JSON.parse(event.data));
	};


	Peer.prototype.send = function(data) {
	  this.channel.send(JSON.stringify(data));
	};


	Peer.prototype._keepSendDummy = function() {
	  this.ws.send(this._DUMMY_DATA);
	  this._setIntervalForDummy();
	};


	Peer.prototype._setIntervalForDummy = function() {
	  if(! this.ws || this.peerConnected)
	    return;
	  this.interval = setTimeout(this.dummySendFunc, this._DUMMY_SPAN);
	};


	module.exports = Peer;


/***/ }
/******/ ]);