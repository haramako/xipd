module.exports = {
	// Global Setting
	debug: true,
	db: "xipd.db",
	expire: 60*60*24, // expire [sec]
	special: 'special.js',

	// DNS Setting
	dnsPort: 5300,
	domain: "l.net",
	rootAddress: "127.0.0.1",
	mname: "ns.l.net",
	rname: "hostmaster.l.net",
	dns_expire: 3600, // DNS TTL [sec]
	fixedAddr: {
		"": "127.0.0.1",
		www: "127.0.0.1",
		mail: "127.0.0.1",
		ns: "127.0.0.1",
		dev: "127.0.0.1",
		me: "127.0.0.1",
	},
	MX: "127.0.0.1",

	// HTTP Setting
	httpPort: 8000,
};
