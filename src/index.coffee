dnsserver = require "dnsserver"
express = require "express"
dirty = require 'dirty'

# Initialize database
exports.initDatabase = (filename='./dns.db',callback)->
  db = dirty(filename)
  callback db

# Web Server
exports.createWebServer = (db)->
  app = express()
  app.use express.static( './public')

  app.get '/update', (req,res)->
    name = req.param('subdomain')
    address = req.param('address')
    res.contentType('json')
    console.log( name, address )
    row = db.get(name)
    if row
      if row.address == address
        row.expire_at = Date.now()
        db.set(name,row)
        res.send err:'ok', msg:'updated'
      else
        res.send err:'already exists'
    else
      db.set name, name:name, address:address, expire_at:Date.now()+60*60
      res.send err:'ok'

  app.listen(3000)


# DNS Server

exports.Server = class Server extends dnsserver.Server
  NS_T_A            = 1
  NS_T_NS           = 2
  NS_T_CNAME        = 5
  NS_T_SOA          = 6
  NS_C_IN           = 1
  NS_RCODE_NXDOMAIN = 3

  constructor: (domain, @rootAddress, @db) ->
    super
    @_domain = domain.toLowerCase()
    @soa = createSOA @domain
    @on "request", @handleRequest
    @on "error", (err,req,res)=>
      console.log err
      res.header.rcode = NS_RCODE_NXDOMAIN
      res.send()

  handleRequest: (req, res) =>
    console.log req
    question  = req.question
    subdomain = Subdomain.extract question.name, @_domain, @db
    console.log subdomain

    if subdomain? and isARequest( question ) and subdomain.getAddress()?
      res.addRR question.name, NS_T_A, NS_C_IN, 600, subdomain.getAddress()
    else if subdomain?.isEmpty() and isNSRequest question
      res.addRR question.name, NS_T_SOA, NS_C_IN, 600, @soa, true
    else
      res.header.rcode = NS_RCODE_NXDOMAIN

    res.send()

  isARequest = (question) ->
    question.type is NS_T_A and question.class is NS_C_IN

  isNSRequest = (question) ->
    question.type is NS_T_NS and question.class is NS_C_IN

  createSOA = (domain) ->
    mname   = "ns-1.#{domain}"
    rname   = "hostmaster.#{domain}"
    serial  = parseInt new Date().getTime() / 1000
    refresh = 28800
    retry   = 7200
    expire  = 604800
    minimum = 3600
    dnsserver.createSOA mname, rname, serial, refresh, retry, expire, minimum

exports.createServer = (domain, address = "127.0.0.1", db) ->
  new Server domain, address, db

exports.Subdomain = class Subdomain
  @extract: (name, domain, db) ->
    return unless name
    name = name.toLowerCase()
    offset = name.length - domain.length

    if domain is name.slice offset
      subdomain = if 0 >= offset then null else name.slice 0, offset - 1
      new constructor subdomain, db if constructor = @for subdomain

  @for: (subdomain = "") ->
    if IPAddressSubdomain.pattern.test subdomain
      IPAddressSubdomain
    #else if EncodedSubdomain.pattern.test subdomain
    #  EncodedSubdomain
    else
      Subdomain

  constructor: (@subdomain, db ) ->
    @labels = @subdomain?.split(".") ? []
    @length = @labels.length
    row = db.get( @subdomain )
    console.log(row)
    if row
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

