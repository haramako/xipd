(function() {
  var EncodedSubdomain, IPAddressSubdomain, PATTERN, Server, Subdomain, decode, dirty, dnsserver, encode, express,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  dnsserver = require("dnsserver");

  express = require("express");

  dirty = require('dirty');

  exports.initDatabase = function(filename, callback) {
    var db;
    if (filename == null) filename = './dns.db';
    db = dirty(filename);
    return callback(db);
  };

  exports.createWebServer = function(db) {
    var app;
    app = express();
    app.use(express.static('./public'));
    app.get('/update', function(req, res) {
      var address, name, row;
      name = req.param('subdomain');
      address = req.param('address');
      res.contentType('json');
      console.log(name, address);
      row = db.get(name);
      if (row) {
        if (row.address === address) {
          row.expire_at = Date.now();
          db.set(name, row);
          return res.send({
            err: 'ok',
            msg: 'updated'
          });
        } else {
          return res.send({
            err: 'already exists'
          });
        }
      } else {
        db.set(name, {
          name: name,
          address: address,
          expire_at: Date.now() + 60 * 60
        });
        return res.send({
          err: 'ok'
        });
      }
    });
    return app.listen(3000);
  };

  exports.Server = Server = (function(_super) {
    var NS_C_IN, NS_RCODE_NXDOMAIN, NS_T_A, NS_T_CNAME, NS_T_NS, NS_T_SOA, createSOA, isARequest, isNSRequest;

    __extends(Server, _super);

    NS_T_A = 1;

    NS_T_NS = 2;

    NS_T_CNAME = 5;

    NS_T_SOA = 6;

    NS_C_IN = 1;

    NS_RCODE_NXDOMAIN = 3;

    function Server(domain, rootAddress, db) {
      var _this = this;
      this.rootAddress = rootAddress;
      this.db = db;
      this.handleRequest = __bind(this.handleRequest, this);
      Server.__super__.constructor.apply(this, arguments);
      this._domain = domain.toLowerCase();
      this.soa = createSOA(this.domain);
      this.on("request", this.handleRequest);
      this.on("error", function(err, req, res) {
        console.log(err);
        res.header.rcode = NS_RCODE_NXDOMAIN;
        return res.send();
      });
    }

    Server.prototype.handleRequest = function(req, res) {
      var question, subdomain;
      console.log(req);
      question = req.question;
      subdomain = Subdomain.extract(question.name, this._domain, this.db);
      console.log(subdomain);
      if ((subdomain != null) && isARequest(question) && (subdomain.getAddress() != null)) {
        res.addRR(question.name, NS_T_A, NS_C_IN, 600, subdomain.getAddress());
      } else if ((subdomain != null ? subdomain.isEmpty() : void 0) && isNSRequest(question)) {
        res.addRR(question.name, NS_T_SOA, NS_C_IN, 600, this.soa, true);
      } else {
        res.header.rcode = NS_RCODE_NXDOMAIN;
      }
      return res.send();
    };

    isARequest = function(question) {
      return question.type === NS_T_A && question["class"] === NS_C_IN;
    };

    isNSRequest = function(question) {
      return question.type === NS_T_NS && question["class"] === NS_C_IN;
    };

    createSOA = function(domain) {
      var expire, minimum, mname, refresh, retry, rname, serial;
      mname = "ns-1." + domain;
      rname = "hostmaster." + domain;
      serial = parseInt(new Date().getTime() / 1000);
      refresh = 28800;
      retry = 7200;
      expire = 604800;
      minimum = 3600;
      return dnsserver.createSOA(mname, rname, serial, refresh, retry, expire, minimum);
    };

    return Server;

  })(dnsserver.Server);

  exports.createServer = function(domain, address, db) {
    if (address == null) address = "127.0.0.1";
    return new Server(domain, address, db);
  };

  exports.Subdomain = Subdomain = (function() {

    Subdomain.extract = function(name, domain, db) {
      var constructor, offset, subdomain;
      if (!name) return;
      name = name.toLowerCase();
      offset = name.length - domain.length;
      if (domain === name.slice(offset)) {
        subdomain = 0 >= offset ? null : name.slice(0, offset - 1);
        if (constructor = this["for"](subdomain)) {
          return new constructor(subdomain, db);
        }
      }
    };

    Subdomain["for"] = function(subdomain) {
      if (subdomain == null) subdomain = "";
      if (IPAddressSubdomain.pattern.test(subdomain)) {
        return IPAddressSubdomain;
      } else {
        return Subdomain;
      }
    };

    function Subdomain(subdomain, db) {
      var row, _ref, _ref2;
      this.subdomain = subdomain;
      this.labels = (_ref = (_ref2 = this.subdomain) != null ? _ref2.split(".") : void 0) != null ? _ref : [];
      this.length = this.labels.length;
      row = db.get(this.subdomain);
      console.log(row);
      if (row) {
        this.address = row.address;
      } else {
        this.address = null;
      }
    }

    Subdomain.prototype.isEmpty = function() {
      return this.length === 0;
    };

    Subdomain.prototype.getAddress = function() {
      return this.address;
    };

    return Subdomain;

  })();

  IPAddressSubdomain = (function(_super) {

    __extends(IPAddressSubdomain, _super);

    function IPAddressSubdomain() {
      IPAddressSubdomain.__super__.constructor.apply(this, arguments);
    }

    IPAddressSubdomain.pattern = /(^|\.)((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    IPAddressSubdomain.prototype.getAddress = function() {
      return this.labels.slice(-4).join(".");
    };

    return IPAddressSubdomain;

  })(Subdomain);

  EncodedSubdomain = (function(_super) {

    __extends(EncodedSubdomain, _super);

    function EncodedSubdomain() {
      EncodedSubdomain.__super__.constructor.apply(this, arguments);
    }

    EncodedSubdomain.pattern = /(^|\.)[a-z0-9]{1,7}$/;

    EncodedSubdomain.prototype.getAddress = function() {
      return decode(this.labels[this.length - 1]);
    };

    return EncodedSubdomain;

  })(Subdomain);

  exports.encode = encode = function(ip) {
    var byte, index, value, _len, _ref;
    value = 0;
    _ref = ip.split(".");
    for (index = 0, _len = _ref.length; index < _len; index++) {
      byte = _ref[index];
      value += parseInt(byte, 10) << (index * 8);
    }
    return (value >>> 0).toString(36);
  };

  PATTERN = /^[a-z0-9]{1,7}$/;

  exports.decode = decode = function(string) {
    var i, ip, value;
    if (!PATTERN.test(string)) return;
    value = parseInt(string, 36);
    ip = [];
    for (i = 1; i <= 4; i++) {
      ip.push(value & 0xFF);
      value >>= 8;
    }
    return ip.join(".");
  };

}).call(this);
