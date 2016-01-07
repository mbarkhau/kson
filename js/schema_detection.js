(function(global) {
	var example_data = [
		{
			"day": "2013-01-01",
			"fixed": [],
			"name": "New Year’s Day"
		},
		{
			"day": "2013-01-21",
			"fixed": [1,2,3,4],
			"name": "Birthday of Martin Luther King, Jr."
		}
	];
	var example_data = {
		"paging": {
			"cursors": [{
				"after": "MTAxNTAxNDYwNzQyMzE3Mjk=",
				"before": "MTAxNTAxNDYwNzE4MzE3Mjk="
			}],
			"next": "&limit="
		}
	};
[
  {
    "id": "paging-cursors",
    "fields": [
      "after",
      "before"
    ],
    "meta": [
      0,
      0
    ]
  },
  {
    "id": "paging",
    "fields": [
      "[]cursors",
      "next"
    ],
    "meta": [
      "paging-cursors",
      0
    ]
  },
  {
    "id": "root",
    "fields": [
      "paging"
    ],
    "meta": [
      "paging"
    ]
  }
]
	function isValue(val) {
		// bool, null, string, number
		return (
			typeof val == "number" || val instanceof Number ||
			val === true || val === false ||
			val === null ||
			typeof val == "string" || val instanceof String
		);
	}

	global.detect_schemas = function(data, parent_fields) {
		// Normalize to case where we are dealing
		// with an object or value (i.e. not an array).
		if (data instanceof Array) {
			if (data.length == 0) {
				return [];
			}
			return detect_schemas(data[0], parent_fields);
		}
		if (isValue(data)) {
			return [];
		}
		var schema_id;
		if (!parent_fields) {
			parent_fields = [];
			schema_id = 'root';
		} else {
			schema_id = parent_fields.join('-');
		}

		// Detect fields and there schemas
		var fields = [];
		var meta = [];
		var schemas = [];

		for (var field in data) {
			if (!data.hasOwnProperty(field)) {
				continue;
			}
			var val = data[field];
			var field_parent_fields = parent_fields.concat([field]);
			var sub_schemas = detect_schemas(val, field_parent_fields);
			schemas = schemas.concat(sub_schemas);

			var field_meta;
			if (isValue(val)) {
				field_meta = 0;
			} else if (sub_schemas.length > 0) {
				var field_schema = sub_schemas[sub_schemas.length - 1];
				field_meta = field_schema.id;
			}

			if (field_meta && val instanceof Array) {
				field_meta = "[]" + field_meta
			}

			fields.push(field);
			meta.push(field_meta);
		}

		schemas.push({
			'id': schema_id,
			'fields': fields,
			'meta': meta
		});
		return schemas;
	};
	console.log(kson_util.json_str(detect_schemas(example_data)));
}(this));