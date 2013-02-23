dnsserver = require "dnsserver"
express = require "express"
dirty = require 'dirty'


# , function(db){

# 	var domain = argv[2];
# 	var address = argv[3] || "127.0.0.1";
# 	var server = xip.createServer(domain, address, db);
# 	server.bind(5300);

# 	console.log("xipd listening on port 5300: domain =", domain, "address =", address);

# 	var web = xip.createWebServer(db);

# });

log = ()->
  if exports.config?.debug
    console.log.apply console, arguments

xip = exports
db = undefined

# Run all
exports.run = (@config)->
  log 'config=', @config
  db = dirty( @config.db )
  xip.Subdomain.fixedAddr = @config.fixedAddr || {}

  http = xip.createWebServer( @config ).listen( @config.httpPort )
  console.log "start http server, port=#{@config.httpPort}"

  dns = xip.createServer( @config ).bind( @config.dnsPort )
  console.log "start dns server, port=#{@config.dnsPort}"


validate_address = (address)->
  e = (parseInt(x,10) for x in address.trim().split('.'))
  return null if e.length != 4
  address = (''+x for x in e).join('.')
  if e[0] == 10
    return address
  else if e[0] == 172 and ( e[1] >= 16 and e[1] <= 31 )
    return address
  else if e[0] == 192 and e[1] == 168
    return address
  else if address == '127.0.0.1'
    return address
  else
    return null

# Web Server
exports.createWebServer = (config)->
  app = express()
  app.use express.static( './public')

  app.get '/update', (req,res)->
    res.contentType('json')
    name = req.param('subdomain')
    address = validate_address req.param('address')
    unless address
      res.send err:'invalid address'
      return
    console.log 'update', name, address
    row = db.get(name)
    from_address = req.connection.address().address
    if row and row.expire_at > Date.now()
      if row.owner == from_address
        row.expire_at = Date.now() + config.expire*1000
        db.set name, row
        console.log 'update subdomain', name, address
        res.send err:'ok', msg:'updated'
      else
        res.send err:'you are not owner'
    else
      console.log 'create subdomain', name, address
      db.set name, { name:name, address:address, owner: from_address, expire_at:Date.now()+config.expire*1000 }
      res.send err:'ok'




# DNS Server
exports.Server = class Server extends dnsserver.Server
  NS_T_A            = 1
  NS_T_NS           = 2
  NS_T_CNAME        = 5
  NS_T_SOA          = 6
  NS_C_IN           = 1
  NS_RCODE_NXDOMAIN = 3

  constructor: (@config) ->
    super
    @mname = @config.mname || throw 'config.mname not found'
    @rname = @config.mname || throw 'config.rname not found'
    @expire = @config.expire || 3600

    @_domain = config.domain.toLowerCase()
    @on "request", @handleRequest
    @on "error", @handleError

  handleError: (err, req, res) ->
      console.log err
      res.header.rcode = NS_RCODE_NXDOMAIN
      res.send()

  handleRequest: (req, res) ->
    question  = req.question
    console.log "request: name=#{question.name}, type=#{question.type}, class=#{question.class}, from=", res.rinfo.address
    subdomain = Subdomain.extract question.name, @_domain
    log "subdomain=", subdomain

    if subdomain? and isARequest( question ) and subdomain.getAddress()?
      res.addRR question.name, NS_T_A, NS_C_IN, 600, subdomain.getAddress()
    else if subdomain?.isEmpty() and isNSRequest( question )
      res.addRR question.name, NS_T_SOA, NS_C_IN, 600, @createSOA(), true
    else
      res.header.rcode = NS_RCODE_NXDOMAIN

    res.send()
    log "sent"

  isARequest = (question) ->
    question.type is NS_T_A and question.class is NS_C_IN

  isNSRequest = (question) ->
    question.type is NS_T_NS and question.class is NS_C_IN

  createSOA: ->
    mname   = @mname
    rname   = @rname
    serial  = parseInt new Date().getTime() / 1000
    refresh = 28800
    retry   = 7200
    expire  = @expire / 2
    minimum = 3600
    dnsserver.createSOA mname, rname, serial, refresh, retry, expire, minimum

exports.createServer = (domain, address ) ->
  new Server domain, address

exports.Subdomain = class Subdomain
  @fixedAddr: undefined

  @extract: (name, domain ) ->
    return unless name
    name = name.toLowerCase()
    offset = name.length - domain.length

    if domain is name.slice offset
      subdomain = if 0 >= offset then '' else name.slice 0, offset - 1
      new constructor subdomain if constructor = @for subdomain

  @for: (subdomain) ->
    if IPAddressSubdomain.pattern.test subdomain
      IPAddressSubdomain
    #else if EncodedSubdomain.pattern.test subdomain
    #  EncodedSubdomain
    else
      Subdomain

  constructor: (@subdomain) ->
    @labels = @subdomain?.split(".") ? []
    @length = @labels.length
    if xip.Subdomain.fixedAddr[@subdomain]
      @address = xip.Subdomain.fixedAddr[@subdomain]
    else
      row = db.get( @subdomain )
      if row and row.expire_at > Date.now()
        @address = row.address
      else
        @address = null

  isEmpty: ->
    @length is 0

  getAddress: ->
    @address

class IPAddressSubdomain extends Subdomain
  @pattern = /// (^|\.)
    ((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}
    (25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)
  $ ///

  getAddress: ->
    @labels.slice(-4).join "."

class EncodedSubdomain extends Subdomain
  @pattern = /(^|\.)[a-z0-9]{1,7}$/

  getAddress: ->
    decode @labels[@length - 1]

exports.encode = encode = (ip) ->
  value = 0
  for byte, index in ip.split "."
    value += parseInt(byte, 10) << (index * 8)
  (value >>> 0).toString 36

PATTERN = /^[a-z0-9]{1,7}$/

exports.decode = decode = (string) ->
  return unless PATTERN.test string
  value = parseInt string, 36
  ip = []
  for i in [1..4]
    ip.push value & 0xFF
    value >>= 8
  ip.join "."

