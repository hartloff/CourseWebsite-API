var express = require('express');
var router = express.Router();

var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/hci-api');

var collection = db.get('course_content');


/**
 [
 {
  "course_id": <string>,        # unique id for each course
  "course_number": <string>,    # "cse250"
  "semester": <string>,         # "s18" 'u' for summer courses
  "title": <string>,            # "Data Structures"
 },
 ...
 ]
 */
router.get('/course-list', function (req, res) {
	var to_send = [];

	collection.find({}, {sort: {semester_index: -1, number: 1}}, function (err, data) {
		if (err || !data) {
			var message = "Error getting course-list: " + JSON.stringify(err);
			console.log(message);
			res.send(message)
		} else {
			//console.log(JSON.stringify(data, null, 2));

			for (var i = 0; i < data.length; i++) {
				var raw_course = data[i];
				var course = {};

				copy_course_fields(course, raw_course);

				to_send.push(course);
			}

			res.send(JSON.stringify(to_send));
		}
	});

});


function copy_course_fields(destination, raw_course) {
	destination.course_id = raw_course.course_id;
	destination.course_number = raw_course.course_number;
	destination.semester = raw_course.semester;
	destination.title = raw_course.title;
}

/**
 {
  "course_id": <string>,        # unique id for each course
  "course_number": <string>,    # "cse250"
  "semester": <string>,         # "s18" 'u' for summer courses
  "title": <string>,            # "Data Structures"
  "all_content":
  [
   {
	"type": <string>,               # ex. "assignments", "lectures", "labs", "slides", "syllabus"
	"content":
	 [
	  {
	   "content_id": <string>,     # unique within the course. ex. "hw2", "arrays_lecture"
	   "content_title": <string>,  # ex. "Homework 2: Arrays in Practice"
	   "due_date": <string>,       # [optional] if this doesn't exists then no due date should be displayed
	   "section_id": <string>,      # [optional] present if the content only applies to a particular section
	   "section_group_id": <string> # [optional] present if the content only applies to a particular subsection
	  },
	  ...
	 ]
   },
   ...
  ],
  "modules":
  [
   {},...
   # Custom modules that can be added to the course. Might be future tech. Previously implemented with flags as seen below
   # "use_student_account": true,
   # "student_options": false,
   # "has_project": false,
   # "use_autolab": true,
   # "questions_enabled": true,
   # "message": ""
  ]
 }
 */
router.get('/course/:course_id', function (req, res) {
	collection.findOne({course_id: req.params.course_id}, {_id:0, semester_index:0}, function (err, raw_course) {
		if (err || !raw_course) {
			var message = "Error getting data for course " + req.params.course_id + ": " + JSON.stringify(err);
			console.log(message);
			res.send(message);
		} else {
			for (var content_type_index = 0; content_type_index < raw_course.all_content.length; content_type_index++) {
				var type_content = raw_course.all_content[content_type_index].content;
				for (var content_index = 0; content_index < type_content.length; content_index++) {
					var content = type_content[content_index];
					delete content.sections;
				}
			}
			res.send(JSON.stringify(raw_course));
		}
	});
});


/**
 {
  "type": <string>,              # ex. "assignments", "lectures", "labs", "slides", "syllabus"
  "content_id": <string>,        # unique within the course. ex. "hw2", "arrays_lecture"
  "content_title": <string>,     # ex. "Homework 2: Arrays in Practice"
  "due_date": <string>,          # [optional] if this doesn't exists then no due date should be displayed
	   "section_id": <string>,      # [optional] present if the content only applies to a particular section
	   "section_group_id": <string> # [optional] present if the content only applies to a particular subsection
  "sections":
  [
   {
	"section_id": <string>,
	"section_title": <string>,
	"section_content": <string>,  # The HTML to be displayed for this section
	"referenced_sections": [{"course_id": <string>, "content_id": <string>, "section_id": <string>}]
   },
   ...
  ]
 }
 */
router.get('/course/:course_id/:content_id', function (req, res) {
	var course_id = req.params.course_id;
	var content_id = req.params.content_id;

	if (!course_id || !content_id) {
		var message = "Bad usage: " + JSON.stringify(req.params);
		console.log(message);
		res.send(message);
	} else {
		collection.findOne({course_id: course_id}, {_id: 0}, function (err, data) {
			if (err || !data) {
				var message = "Error getting data for course " + req.params.course_id + ": " + JSON.stringify(err);
				console.log(message);
				res.send(message);
			} else {
				for (var content_type_index = 0; content_type_index < data.all_content.length; content_type_index++) {
					var type_content = data.all_content[content_type_index].content;
					for (var content_index = 0; content_index < type_content.length; content_index++) {
						var content = type_content[content_index];
						if (content.content_id === content_id) {
							res.send(JSON.stringify(content));
							return;

						}
					}
				}
				res.send(JSON.stringify("Did not find content"));
			}
		});
	}
});


/**
 {
  "section_id": <string>,
  "section_title": <string>,
  "section_content": <string>,  # The HTML to be displayed for this section
  "referenced_sections": [{"course_id": <string>, "content_id": <string>, "section_id": <string>}]
 }
 */

router.get('/course/:course_id/:content_id/:section_id', function (req, res) {
	var course_id = req.params.course_id;
	var content_id = req.params.content_id;
	var section_id = req.params.section_id;

	if (!course_id || !content_id || !section_id) {
		var message = "Bad usage: " + JSON.stringify(req.params);
		console.log(message);
		res.send(message);
	} else {
		collection.findOne({course_id: course_id}, {_id: 0}, function (err, data) {
			if (err || !data) {
				var message = "Error getting data for course " + req.params.course_id + ": " + JSON.stringify(err);
				console.log(message);
				res.send(message);
			} else {
				for (var content_type_index = 0; content_type_index < data.all_content.length; content_type_index++) {
					var type_content = data.all_content[content_type_index].content;
					for (var content_index = 0; content_index < type_content.length; content_index++) {
						var content = type_content[content_index];
						if (content.content_id !== content_id) {
							continue;
						}
						for (var section_index = 0; section_index < content.sections.length; section_index++) {
							var section = content.sections[section_index];
							if (section.section_id === section_id) {
								// we made it bois!
								res.send(JSON.stringify(section));
								return;
							}
						}
					}
				}

				res.send(JSON.stringify("Did not find section"));
			}
		});
	}
});


/**
 {
  "course_id": <string>,
  "course_number": <string>,
  "semester": <string>,
  "title": <string>,
  "all_content":
  [
   {
   "type": <string>,              # ex. "assignments", "lectures", "labs", "slides", "syllabus"
   "content":
	[
	 {
	  "type": <string>,              # ex. "assignments", "lectures", "labs", "slides", "syllabus"
	  "content_id": <string>,        # unique within the course. ex. "hw2", "arrays_lecture"
	  "content_title": <string>,     # ex. "Homework 2: Arrays in Practice"
	  "due_date": <string>,          # [optional] if this doesn't exists then no due date should be displayed
	  "sections":
	  [
	   {
		"section_id": <string>,
		"section_title": <string>,
		"section_content": <string>,  # The HTML to be displayed for this section
		"referenced_sections": [{"course_id": <string>, "content_id": <string>, "section_id": <string>}]
	   },
	   ...
	  ]
	 },
	 ...
	],
	...
   },
   ...
  ],
  "modules":
  [
   {},...
  ]
 }
 */
router.get('/course-object/:course_id', function (req, res) {
	collection.findOne({course_id: req.params.course_id}, {_id: 0}, function (err, data) {
		if (err || !data) {
			var message = "Error getting data for course " + req.params.course_id + ": " + JSON.stringify(err);
			console.log(message);
			res.send(message);
		} else {
			res.send(JSON.stringify(data));
		}
	});
});


router.post('/course/update', function (req, res) {
	if (!req.body.course_object) {
		res.send({"message": "did not find \"course_object\" in request body"})
	} else if (!req.body.api_key || req.body.api_key != "no_hacking") {
		console.log("Invalid API access in update course: " + JSON.stringify(req, null, 2));
		res.send({"message": "Error: invalid API key"})
	} else {
		var message = "";
		var course_object = req.body.course_object;
		collection.find({course_id: course_object.course_id}, {}, function (err, course) {
			if (err) {
				message = "Error updating course " + course_object.course_id + ": " + JSON.stringify(err);
				console.log(message);
				res.send({"message": message});
			} else if (!course) {
				message = "Error. Could not find course: " + course_object.course_id;
				console.log(message);
				res.send({"message": message});
			} else {
				collection.update({course_id: course_object.course_id}, function (err) {
					res.send({"message": "success"});
				});
			}
		});
	}
});


module.exports = router;
