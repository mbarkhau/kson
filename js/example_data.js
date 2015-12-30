(function(global) {

var holidays = [
	{"day": "2013-01-01", "fixed": true, "name": "New Year’s Day"},
	{"day": "2013-01-21", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
	{"day": "2013-02-18", "fixed": false, "name": "Washington’s Birthday"},
	{"day": "2013-05-27", "fixed": false, "name": "Memorial Day"},
	{"day": "2013-07-04", "fixed": true, "name": "Independence Day"},
	{"day": "2013-09-02", "fixed": false, "name": "Labor Day"},
	{"day": "2013-10-14", "fixed": false, "name": "Columbus Day"},
	{"day": "2013-11-11", "fixed": true, "name": "Veterans Day"},
	{"day": "2013-11-28", "fixed": false, "name": "Thanksgiving Day"},
	{"day": "2013-12-25", "fixed": true, "name": "Christmas Day"},
	{"day": "2014-01-01", "fixed": true, "name": "New Year’s Day"},
	{"day": "2014-01-20", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
	{"day": "2014-02-17", "fixed": false, "name": "Washington’s Birthday"},
	{"day": "2014-05-26", "fixed": false, "name": "Memorial Day"},
	{"day": "2014-07-04", "fixed": true, "name": "Independence Day"},
	{"day": "2014-09-01", "fixed": false, "name": "Labor Day"},
	{"day": "2014-10-13", "fixed": false, "name": "Columbus Day"},
	{"day": "2014-11-11", "fixed": true, "name": "Veterans Day"},
	{"day": "2014-11-27", "fixed": false, "name": "Thanksgiving Day"},
	{"day": "2014-12-25", "fixed": true, "name": "Christmas Day"},
	{"day": "2015-01-01", "fixed": true, "name": "New Year’s Day"},
	{"day": "2015-01-19", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
	{"day": "2015-02-16", "fixed": false, "name": "Washington’s Birthday"},
	{"day": "2015-05-25", "fixed": false, "name": "Memorial Day"},
	{"day": "2015-07-03", "fixed": true, "name": "Independence Day"},
	{"day": "2015-09-07", "fixed": false, "name": "Labor Day"},
	{"day": "2015-10-12", "fixed": false, "name": "Columbus Day"},
	{"day": "2015-11-11", "fixed": true, "name": "Veterans Day"},
	{"day": "2015-11-26", "fixed": false, "name": "Thanksgiving Day"},
	{"day": "2015-12-25", "fixed": true, "name": "Christmas Day"},
	{"day": "2016-01-01", "fixed": true, "name": "New Year’s Day"},
	{"day": "2016-01-18", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
	{"day": "2016-02-15", "fixed": false, "name": "Washington’s Birthday"},
	{"day": "2016-05-30", "fixed": false, "name": "Memorial Day"},
	{"day": "2016-07-04", "fixed": true, "name": "Independence Day"},
	{"day": "2016-09-05", "fixed": false, "name": "Labor Day"},
	{"day": "2016-10-10", "fixed": false, "name": "Columbus Day"},
	{"day": "2016-11-11", "fixed": true, "name": "Veterans Day"},
	{"day": "2016-11-24", "fixed": false, "name": "Thanksgiving Day"},
	{"day": "2016-12-26", "fixed": true, "name": "Christmas Day"},
	{"day": "2017-01-02", "fixed": true, "name": "New Year’s Day"},
	{"day": "2017-01-18", "fixed": false, "name": "Birthday of Martin Luther King, Jr."},
	{"day": "2017-02-20", "fixed": false, "name": "Washington’s Birthday"},
	{"day": "2017-05-29", "fixed": false, "name": "Memorial Day"},
	{"day": "2017-07-04", "fixed": true, "name": "Independence Day"},
	{"day": "2017-09-04", "fixed": false, "name": "Labor Day"},
	{"day": "2017-10-09", "fixed": false, "name": "Columbus Day"},
	{"day": "2017-11-10", "fixed": true, "name": "Veterans Day"},
	{"day": "2017-11-23", "fixed": false, "name": "Thanksgiving Day"},
	{"day": "2017-12-25", "fixed": true, "name": "Christmas Day"}
];

var holiday_names = [
		"New Year’s Day",
		"Birthday of Martin Luther King, Jr.",
		"Washington’s Birthday",
		"Memorial Day",
		"Independence Day",
		"Labor Day",
		"Columbus Day",
		"Veterans Day",
		"Thanksgiving Day",
		"Christmas Day"
	],
	daynames_enum = "enum:" + holiday_names.join(":");


function date_str_coder() {
	function zpad(n) {return n > 9 ? n : "0" + n};
	return function (val, enc) {
		return (enc ? (
				parseInt(val.slice(0, 5), 10) * 10000 +
				parseInt(val.slice(5, 7), 10) * 100 +
				parseInt(val.slice(8, 10), 10)
			) : (
				Math.floor(val / 10000) + "-" +
				zpad(Math.floor((val % 10000) / 100)) + "-" +
				zpad(Math.floor(val % 100))
			)
		);
	};
}

function date_str_param_coder(args) {
	var year_offset = parseInt(args[0] || 1500),
			year_mul = parseInt(args[1] || 12 * 32),
			month_mul = parseInt(args[2] || 12);

	function zpad(n) {return n > 9 ? n : "0" + n};
	return function (val, enc) {
		if (enc) {
			return (
				(parseInt(val.slice(0, 5), 10) - year_offset) * year_mul +
				parseInt(val.slice(5, 7), 10) * month_mul +
				parseInt(val.slice(8, 10), 10)
			);
		}
		var year = Math.floor(val / year_mul) + year_offset;
		val += year_offset * year_mul;
		return (
			year + "-" +
			zpad(Math.floor((val % year_mul) / month_mul)) + "-" +
			zpad(Math.floor(val % month_mul))
		);
	};
}

global.KSON_EXAMPLES = [
	{
		"description": "Federal US Holidays",
		"schemas": {
			"id": "event-v1",
			"fields": ["day", "fixed", "name"]
		},
		"data": holidays
	},
	{
		"description": [
			"Federal US Holidays",
			"(with encoded fixed attribute)"
		],
		"schemas": {
			"id": "event-v2",
			"fields": ["day", "fixed", "name"],
			"meta": [0, "bool", 0]
		},
		"data": holidays
	},
	{
		"description": [
			"Federal US Holidays",
			"(with encoded holiday names)"
		],
		"schemas": {
			"id": "event-v3",
			"fields": ["day", "fixed", "name"],
			"meta": [0, "bool", daynames_enum]
		},
		"data": holidays
	},
	{
		"description": [
			"Federal US Holidays ",
			"(with dates using a custom coder)"
		],
		"schemas": {
			"id": "event-v4",
			"fields": ["day", "fixed", "name"],
			"meta": [
				"date-str",
				"bool",
				daynames_enum,
			]
		},
		"coders": [
			{"id": "date-str", "fn": date_str_coder}
		],
		"data": holidays
	},
	{
		"description": [
			"Federal US Holidays ",
			"(with dates using a parameterized custom coder)"
		],
		"schemas": {
			"id": "event-v5",
			"fields": ["day", "fixed", "name"],
			"meta": [
				"date-str:2010",
				"bool",
				daynames_enum
			]
		},
		"coders": [
			{"id": "date-str", "fn": date_str_param_coder}
		],
		"data": holidays
	}
	// TODO: example with codec args in custom codec
	// TODO: example with codec chaining
	// TODO: example with nested schemas
];

})(this);