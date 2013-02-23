module.exports = {
	// Global Setting
	debug: true,
	db: 'xipd.db',
	expire: 60*60*24, // expire [sec]
	special: 'special.js',

	// DNS Setting
	dnsPort: 53,
	domain: "l-o-cal.net",
	rootAddress: "49.212.3.54",
	mname: "dorubako.ddo.jp",
	rname: "haramako.gmail.com",
	dns_expire: 60*60,
	fixedAddr: {
		"": "49.212.3.54",
		www: "49.212.3.54",
		mail: "49.212.3.54",
		ns: "49.212.3.54",
		me: "127.0.0.1",
		dev: "127.0.0.1",
	},
	MX: "49.212.3.54",

	// HTTP Setting
	httpPort: 8000,
};
