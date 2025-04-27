"use strict";


const util = {
	radians: function(deg) {
		return deg * (Math.PI / 180.0)
	},

	degrees: function(rad) {
		return rad * (180.0 / Math.PI)
	}
}


const vec3 = {};

vec3.lenght = function(v){
	return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
};

vec3.distance = function(v,w){
	return Math.sqrt(
		(v[0]-w[0])**2 +
		(v[1]-w[1])**2 +
		(v[2]-w[2])**2
	);
};

vec3.normalize = function(v) {
	let len = vec3.lenght(v);
	return [
		v[0] / len,
		v[1] / len,
		v[2] / len
	]
}


