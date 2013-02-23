module.exports = {
	// Global Setting
	debug: true,
	db: "dns.db",

	// DNS Setting
	dnsPort: 5300,
	domain: "l.net",
	rootAddress: "127.0.0.1",
	mname: "ns.l.net",
	rname: "hostmaster.l.net",
	expire: 10, // 3600, // expire [sec]
	fixedAddr: {
		"": "127.0.0.1",
		www: "127.0.0.1"
	},
	MX: "127.0.0.1",

	// HTTP Setting
	httpPort: 8000,
};
