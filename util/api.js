var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/hci-api');


// deeper dives API
exports.deeper_dive = function deeper_dive(req, res) {
	var db = req.db;
	var collection = db.get('course_content');
	collection.findOne({'course': req.params.course}, {'deep_dives': 1}, function (err, record) {
			if (err) {
				console.log(err);
				res.render('error');
			} else {
				// can move this into the db query. Also, check for errors
				res.end(JSON.stringify(record['deep_dives'][req.params.concept][req.params.topic]));
			}
		}
	)
	;
};

// references API
exports.reference = function reference(req, res) {
	var db = req.db;
	var collection = db.get('course_content');
	collection.findOne({'course': req.params.course}, {'lectures': 1}, function (err, record) {
		if (err) {
			console.log(err);
			res.render('error');
		} else {
			// SHOULD move this into the db query. Also, check for errors
			for (var i in record.lectures) {
				var lecture = record.lectures[i];
				if (lecture.short_title === req.params.lecture) {
					for (var j in lecture.sections) {
						var section = lecture.sections[j];
						if (section.title_lookup === req.params.section) {
							res.end(JSON.stringify(section));
						}
					}
				}
			}
			res.end(JSON.stringify({'title': '', 'content': ''}));
		}
	});
};
