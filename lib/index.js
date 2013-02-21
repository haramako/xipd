(function() {
  var EncodedSubdomain, IPAddressSubdomain, PATTERN, Server, Subdomain, db, decode, dirty, dnsserver, encode, express, log, xip,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  dnsserver = require("dnsserver");

  express = require("express");

  dirty = require('dirty');

  log = function() {
    var _ref;
    if ((_ref = exports.config) != null ? _ref.debug : void 0) {
      return console.log.apply(console, arguments);
    }
  };

  xip = exports;

  db = void 0;

  exports.run = function(config) {
    var dns, http;
    this.config = config;
    log('config=', this.config);
    db = dirty(this.config.db);
    xip.Subdomain.fixedAddr = this.config.fixedAddr || {};
    http = xip.createWebServer(this.config).listen(this.config.httpPort);
    console.log("start http server, port=" + this.config.httpPort);
    dns = xip.createServer(this.config).bind(this.config.dnsPort);
    return console.log("start dns server, port=" + this.config.dnsPort);
  };

  exports.createWebServer = function(config) {
    var app;
    app = express();
    app.use(express.static('./public'));
    return app.get('/update', function(req, res) {
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
  };

  exports.Server = Server = (function(_super) {
    var NS_C_IN, NS_RCODE_NXDOMAIN, NS_T_A, NS_T_CNAME, NS_T_NS, NS_T_SOA, isARequest, isNSRequest;

    __extends(Server, _super);

    NS_T_A = 1;

    NS_T_NS = 2;

    NS_T_CNAME = 5;

    NS_T_SOA = 6;

    NS_C_IN = 1;

    NS_RCODE_NXDOMAIN = 3;

    function Server(config) {
      this.config = config;
      Server.__super__.constructor.apply(this, arguments);
      this.mname = this.config.mname || (function() {
        throw 'config.mname not found';
      })();
      this.rname = this.config.mname || (function() {
        throw 'config.rname not found';
      })();
      this.expire = this.config.expire || 3600;
      this._domain = config.domain.toLowerCase();
      this.on("request", this.handleRequest);
      this.on("error", this.handleError);
    }

    Server.prototype.handleError = function(err, req, res) {
      console.log(err);
      res.header.rcode = NS_RCODE_NXDOMAIN;
      return res.send();
    };

    Server.prototype.handleRequest = function(req, res) {
      var question, subdomain;
      question = req.question;
      console.log("request: name=" + question.name + ", type=" + question.type + ", class=" + question["class"] + ", from=", res.rinfo.address);
      subdomain = Subdomain.extract(question.name, this._domain);
      log("subdomain=", subdomain);
      if ((subdomain != null) && isARequest(question) && (subdomain.getAddress() != null)) {
        res.addRR(question.name, NS_T_A, NS_C_IN, 600, subdomain.getAddress());
      } else if ((subdomain != null ? subdomain.isEmpty() : void 0) && isNSRequest(question)) {
        res.addRR(question.name, NS_T_SOA, NS_C_IN, 600, this.createSOA(), true);
      } else {
        res.header.rcode = NS_RCODE_NXDOMAIN;
      }
      res.send();
      return log("sent");
    };

    isARequest = function(question) {
      return question.type === NS_T_A && question["class"] === NS_C_IN;
    };

    isNSRequest = function(question) {
      return question.type === NS_T_NS && question["class"] === NS_C_IN;
    };

    Server.prototype.createSOA = function() {
      var expire, minimum, mname, refresh, retry, rname, serial;
      mname = this.mname;
      rname = this.rname;
      serial = parseInt(new Date().getTime() / 1000);
      refresh = 28800;
      retry = 7200;
      expire = this.expire;
      minimum = 3600;
      return dnsserver.createSOA(mname, rname, serial, refresh, retry, expire, minimum);
    };

    return Server;

  })(dnsserver.Server);

  exports.createServer = function(domain, address) {
    return new Server(domain, address);
  };

  exports.Subdomain = Subdomain = (function() {

    Subdomain.fixedAddr = void 0;

    Subdomain.extract = function(name, domain) {
      var constructor, offset, subdomain;
      if (!name) return;
      name = name.toLowerCase();
      offset = name.length - domain.length;
      if (domain === name.slice(offset)) {
        subdomain = 0 >= offset ? '' : name.slice(0, offset - 1);
        if (constructor = this["for"](subdomain)) {
          return new constructor(subdomain);
        }
      }
    };

    Subdomain["for"] = function(subdomain) {
      if (IPAddressSubdomain.pattern.test(subdomain)) {
        return IPAddressSubdomain;
      } else {
        return Subdomain;
      }
    };

    function Subdomain(subdomain) {
      var row, _ref, _ref2;
      this.subdomain = subdomain;
      this.labels = (_ref = (_ref2 = this.subdomain) != null ? _ref2.split(".") : void 0) != null ? _ref : [];
      this.length = this.labels.length;
      if (xip.Subdomain.fixedAddr[this.subdomain]) {
        this.address = xip.Subdomain.fixedAddr[this.subdomain];
      } else {
        row = db.get(this.subdomain);
        if (row) {
          this.address = row.address;
        } else {
          this.address = null;
        }
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
