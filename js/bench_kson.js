KSON = require("./kson.js");
fs = require("fs");
Benchmark = require("benchmark").Benchmark;

fb_photos_json = fs.readFileSync("test_data/fb_photos.json", 'utf-8');
fb_photos = JSON.parse(fb_photos_json);
fb_photos_json = JSON.stringify(fb_photos);

console.log("json size: ", fb_photos_json.length);

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


var 
	stringify = new Benchmark(
		"fb_photos.json stringify              ",
		function() {JSON.stringify(fb_photos);}
	)
	parse = new Benchmark(
		"fb_photos.json parse                  ",
		function() {JSON.parse(fb_photos_json);}
	),
	parse_dec = new Benchmark(
		"fb_photos.json parse & decode         ",
		function() {decode_photos(JSON.parse(fb_photos_json));}
	)
	dec_enc = new Benchmark(
		"fb_photos.json decode & encode        ",
		function() {encode_photos(decode_photos(fb_photos));}
	)
	round_trip = new Benchmark(
		"fb_photos.json round trip             ",
		function() {JSON.stringify(encode_photos(decode_photos(JSON.parse(fb_photos_json))));}
	);

stringify.run();
console.log(String(stringify));

parse.run();
console.log(String(parse));

parse_dec.run();
console.log(String(parse_dec));

dec_enc.run();
console.log(String(dec_enc));

round_trip.run();
console.log(String(round_trip));

