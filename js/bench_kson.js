KSON = require("./kson.js");
fs = require("fs");
Benchmark = require("benchmark").Benchmark;

fb_photos_json = fs.readFileSync("test_data/fb_photos.json", 'utf-8');
fb_photos_kson = fs.readFileSync("test_data/fb_photos.kson", 'utf-8');
fb_photos_schemas_json = fs.readFileSync("test_data/fb_photo_schemas_plain.json", 'utf-8');
fb_photos_schemas = JSON.parse(fb_photos_schemas_json);
fb_photos = JSON.parse(fb_photos_json);
fb_photos_json = JSON.stringify(fb_photos);
KSON.addSchema(fb_photos_schemas);
fb_photos_kson = KSON.stringify(fb_photos, "fb-photos");

console.log("json size: ", fb_photos_json.length);
console.log("kson size: ", fb_photos_kson.length);

function decode_photos(photos) {
	var photo_data = photos.data, photo, comments, i, j;

	for (i = photo_data.length - 1; i >= 0; i--) {
		photo = photo_data[i];
		photo.created_time = new Date(Date.parse(photo.created_time));
		photo.updated_time = new Date(Date.parse(photo.updated_time));
		comments = photo.comments.data;
		for (j = comments.length - 1; j >= 0; j--) {
			comments[j].created_time = new Date(
				Date.parse(comments[j].created_time
			));
		};
	}
	return photos;
}

function encode_photos (photos) {
	var photo_data = photos.data, photo, comments, i, j;

	for (i = photo_data.length - 1; i >= 0; i--) {
		photo = photo_data[i];
		photo.create_time = photo.created_time.toISOString();
		photo.updated_time = photo.updated_time.toISOString();
		comments = photo.comments.data;
		for (j = comments.length - 1; j >= 0; j--) {
			comments[j].created_time.toISOString();
		};
	}
	return photos;
}


var json_stringify = new Benchmark(
		"fb_photos.json stringify              ",
		function() {JSON.stringify(fb_photos);}
	),
	json_parse = new Benchmark(
		"fb_photos.json parse                  ",
		function() {JSON.parse(fb_photos_json);}
	),
	json_parse_dec = new Benchmark(
		"fb_photos.json parse & decode         ",
		function() {decode_photos(JSON.parse(fb_photos_json));}
	),
	json_dec_enc = new Benchmark(
		"fb_photos.json decode & encode        ",
		function() {encode_photos(decode_photos(fb_photos));}
	),
	json_round_trip = new Benchmark(
		"fb_photos.json round trip             ",
		function() {
			var decoded = decode_photos(JSON.parse(fb_photos_kson));
			JSON.stringify(encode_photos(decoded));
		}
	),
	kson_stringify = new Benchmark(
		"fb_photos.kson stringify              ",
		function() {KSON.stringify(fb_photos, "fb-photos");}
	),
	kson_parse = new Benchmark(
		"fb_photos.kson parse                  ",
		function() {KSON.parse(fb_photos_kson);}
	),
	kson_parse_dec = new Benchmark(
		"fb_photos.kson parse & decode         ",
		function() {decode_photos(KSON.parse(fb_photos_kson));}
	),
	kson_dec_enc = new Benchmark(
		"fb_photos.kson decode & encode        ",
		function() {encode_photos(decode_photos(fb_photos));}
	),
	kson_round_trip = new Benchmark(
		"fb_photos.kson round trip             ",
		function() {
			var decoded = decode_photos(KSON.parse(fb_photos_kson));
			KSON.stringify(encode_photos(decoded), "fb-photos");
		}
	);



json_stringify.run();
console.log(String(json_stringify));

json_parse.run();
console.log(String(json_parse));

json_parse_dec.run();
console.log(String(json_parse_dec));

json_dec_enc.run();
console.log(String(json_dec_enc));

json_round_trip.run();
console.log(String(json_round_trip));

