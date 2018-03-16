var fs = require('fs-extra');
var path = require('path');
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/hci-api');

var collection = db.get('course_content');
var collection_list = db.get('course_list');


var current_semester = 's18';

var content_directory = path.join(__dirname, 'content/');

/**

 "course_id": <string>,        # unique id for each course
 "course_number": <string>,    # "cse250"
 "semester": <string>,         # "s18" 'u' for summer courses
 "title": <string>,            # "Data Structures"

 */

var to_process = [
	{
		'directory': content_directory + 's18/cse115',
		'course_id': "cse115-s18",
		'course_number': 'cse115',
		'semester': 's18',
		'title': 'Computer Science 1'
	},
	{
		'directory': content_directory + 'f17/cse115',
		'course_id': "cse115-f17",
		'course_number': 'cse115',
		'semester': 'f17',
		'title': 'Computer Science 1'
	}
];

var semesters = ['f17', 's18'];

collection.remove({}, function () {
	collection_list.remove({}, function (err) {
		if (err) {
			console.log(err);
		} else {
			console.log("all courses removed");
			console.log("adding all courses");
			var courses_processed = 0;
			for (var index in to_process) {
				var course = to_process[index];
				var directory = course.directory;
				delete course.directory;
				course.semester_index = semesters.indexOf(course.semester);
				course.all_content = [];
				//collection_list.insert(course);
				var list = fs.readdirSync(directory);
				for (var j in list) {
					var sub_directory = list[j];
					switch (sub_directory) {
						case "options":
							var course_content = fs.readFileSync(directory + "/options/course.json");
							var course_settings = JSON.parse(course_content);
							course.modules = {name:"artifact", settings:course_settings};
							break;
						default:
							read_directory(course, directory + "/" + sub_directory + "/", sub_directory);
							break;
					}

				}
				console.log('adding: ' + course.course);
				collection.insert(course, function () {
					courses_processed++;
					console.log(courses_processed + ' courses processed');
					if (courses_processed === to_process.length) {
						console.log('all courses processed');
						shut_it_down();
					}
				});
				console.log(JSON.stringify(course, null, 4));
			}
		}
	});
});


function read_directory(course, directory, type) {

	var ordered = false;
	var all_content = [];
	var list = fs.readdirSync(directory);
	for (var i in list) {
		var file = list[i];

		var content = fs.readFileSync(directory + file);
		var variables = {};
		variables.type = type;
		var sections = [];

		var lines = content.toString().split('\n');
		var state = 'normal';
		var section_title = "";
		var section_content = "";

		for (var j in lines) {
			var line = lines[j];
			if (state === 'normal') {
				if (line.trim() === '---') {
					state = 'variables';
				}
				else if (line.startsWith('==')) {
					if (section_title !== "") {
						sections.push({
							'section_title': section_title,
							'section_id': title_to_id(section_title),
							'section_content': section_content
						});
						section_content = "";
					}
					section_title = line.slice(2).trim();
				} else if (section_title !== "") {
					section_content += line + '\n';
				}

			} else if (state === 'variables') {
				if (line.trim() === '---') {
					state = 'normal';
					continue;
				}
				parse_variable_line(line, variables);
			}
		}

		if (section_title !== "" && section_content !== "") {
			sections.push({
				'section_title': title_to_id(section_title),
				'section_content': section_content
			});
		}

		if (variables.hasOwnProperty("next_content_short")) {
			ordered = true;
		}
		if (variables.hasOwnProperty("page_type")) {
			variables.type = variables.page_type;
			delete variables.page_type;
		}
		if (variables.hasOwnProperty("short_title")) {
			variables.content_id = variables.short_title;
		} else {
			variables.content_id = file.split(".")[0]; // meh
		}

		all_content.push(Object.assign(variables, {'sections': sections, referenced_sections:[]}));
	}

	var result = [];
	if (ordered) {
		order_list(all_content, 'none', result);
		for(var p=0; p<result.length; p++){
			delete result[p].short_title;
			delete result[p].next_content_short;
			delete result[p].previous_content_short;
		}
		//course[type] = result;
	} else {
		for (var index = 0; index < all_content.length; index++) {
			var topic = all_content[index];
			result.push(topic);
			//for (var k=0; k<topic.sections.length; k++) {
			//	var section = topic.sections[k];
			//	result[topic.short_title][section.title.toLowerCase().trim().replace(/\s+/g, '-')] = {
			//		'title': section.title,
			//		'content': section.content
			//	}
			//}
		}
	}
	course.all_content.push({"type": type, "content": result});
}

function order_list(content, previous, result) {

	console.log(result);
	for (var i in content) {
		var this_content = content[i];
		if (this_content.previous_content_short === previous) {
			var new_previous = this_content.short_title;
			result.push(this_content);
			if (this_content.next_content_short === 'none') {
				return;
			}
			break;
		}
	}
	order_list(content, new_previous, result);
}

function title_to_id(title){
	return title.toLowerCase().replace(/\s+/g, '-');
}

function parse_variable_line(line, variables) {
	var colon_index = line.indexOf(':');
	if (colon_index === -1) {
		console.log('error parsing variable: ' + line);
		return;
	}
	variables[line.slice(0, colon_index).trim()] = line.slice(colon_index + 1).trim();
}


function shut_it_down() {
	db.close();
}

