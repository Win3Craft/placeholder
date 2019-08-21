var objectList = new Map();

var selfID = null;
var selfRotationSpeed = .003;

function addObject(id, type, self, object)
{
	switch(type)
	{
		case 'terrain':
			objectList.set(id, new Terrain(id, object));
			break;
		case 'player':
			objectList.set(id, new Player(id, self, object));
			if(self)
				selfID = id;
			break;
	}
}

function updateObject(id, type, object)
{
	if(objectList.has(id))
	{
		objectList.get(id).update(object);
	}
}

function removeObject(id)
{
	if(objectList.has(id))
	{
		objectList.get(id).remove();
		objectList.delete(id);
	}
}

function Terrain(id, object)
{
	this.update = function(object) {
		this.mesh.position.set(object.x_pos, object.y_pos, object.z_pos);
		this.mesh.quaternion.copy({
			x: object.x_quat,
			y: object.y_quat,
			z: object.z_quat,
			w: object.w_quat
		});
	};

	this.remove = function() {
		global_scene.remove(this.mesh);
	};

	this.colorFace = function(face, biome) {
		if(biome == 0)
		{
			face.color.setStyle("#918679");
			face.color.add(new THREE.Color(THREE.Math.randFloat(-.02,.02),THREE.Math.randFloat(-.02,.02),THREE.Math.randFloat(-.02,.02)));
		}
		else if(biome == 1)
		{
			face.color.setStyle("#ff00ff");
			face.color.add(new THREE.Color(THREE.Math.randFloat(-.02,.02),THREE.Math.randFloat(-.05,.05),THREE.Math.randFloat(-.01,.01)));
		}
		else if(biome == 2)
		{
			face.color.setStyle("#3db020");
			face.color.add(new THREE.Color(THREE.Math.randFloat(-.02,.02),THREE.Math.randFloat(-.05,.05),THREE.Math.randFloat(-.01,.01)));
		}
		else if(biome == 3)
		{

		}
	};

	// actual construction of the terrain object
	this.id = id;

	var three_vertices = [];
	var three_faces = [];

	for(var vertex of object.vertices)
	{
		three_vertices.push(new THREE.Vector3(vertex.x, vertex.y, vertex.z));
	}
	for(var face of object.faces)
	{
		three_faces.push(new THREE.Face3(face.a, face.b, face.c));
		this.colorFace(three_faces[three_faces.length - 1], face.biome);
	}

	this.geometry = new THREE.Geometry();
	this.geometry.vertices = three_vertices;
	this.geometry.faces = three_faces;

	this.material = new THREE.MeshStandardMaterial({
		roughness: .95,
		flatShading: true,
		vertexColors: THREE.FaceColors
	});
	this.mesh = new THREE.Mesh(this.geometry, this.material);
	this.mesh.receiveShadow = true;
	this.mesh.castShadow = true;
	this.update(object);

	global_scene.add(this.mesh); // adds the mesh to the global scene
}

function Player(id, self, object)
{
	this.update = function(object) {
		if(!this.self)
		{
			let convert = new THREE.Euler(0,0,0,'YXZ');
			convert.setFromQuaternion(new THREE.Quaternion(object.x_facing,object.y_facing,object.z_facing,object.w_facing));
			convert.y += Math.PI
			convert.x *= -1;
			this.gameObject.rotation.set(0,convert.y,convert.z);
			this.gameObject.children[2].rotation.set(convert.x,0,0);
			this.head.mesh.quaternion.copy({
				x: object.x_facing,
				y: object.y_facing,
				z: object.z_facing,
				w: object.w_facing
			});
		}
		// later this position will need to be interpolated, not just straight up set
		this.gameObject.position.set(object.x_pos, object.y_pos, object.z_pos);
	};

	this.remove = function() {
		global_scene.remove(this.gameObject);
		global_scene.remove(this.head.mesh);
		global_scene.remove(this.body.mesh);
		global_scene.remove(this.feet.mesh);
	};

	this.getPosition = function() {
		return this.gameObject.position;
	};

	this.getRotation = function() {
		return this.gameObject.rotation;
	};

	this.getQuaternion = function() {
		return this.gameObject.quaternion;
	};

	// function called by inputManager to update the rotation of the self player
	this.updateRotation = function(x, y) {
		var x_rot = this.gameObject.rotation.x + (y * selfRotationSpeed * -1);
		var y_rot = this.gameObject.rotation.y + (x * selfRotationSpeed * -1);
		var z_rot = 0;

		if(x_rot >= Math.PI / 2)
			x_rot = Math.PI / 2;
		else if(x_rot <= Math.PI / -2)
			x_rot = Math.PI / -2;


		this.gameObject.rotation.set(x_rot, y_rot, z_rot, 'YXZ');
	};

	// actual construction of the player object:
	this.id = id;
	this.self = self;
	this.cameraOffset = new THREE.Vector3(0,1,0);

	this.position = new THREE.Vector3(0, 0, 0); // default here
	this.facing = new THREE.Quaternion(0, 0, 0, 0);

	this.material = new THREE.MeshStandardMaterial({
		roughness: .9,
		flatShading: true,
		color: this.self == true ? new THREE.Color(0x0000ff) : new THREE.Color(0xff0000)
	});

	function setMaterial(objects,mat)
	{
		objects.children.forEach((object)=>{
			object.material = mat;
		});
	}

	let model = global_modelLoader.getObject("bigHead");
	setMaterial(model,this.material);
	this.gameObject = model;
	this.update(object);

	if(!this.self)
		global_scene.add(this.gameObject);

	this.head = {
		geometry: new THREE.BoxGeometry(object.head_radius,
			object.head_radius,
			object.head_radius
		),
		offset: new THREE.Vector3(object.head_offset.x,
			object.head_offset.y,
			object.head_offset.z
		)
	};
	this.body = {
		geometry: new THREE.CylinderGeometry(object.body_radiusTop,
			object.body_radiusBot,
			object.body_height,
			object.body_numSegments
		),
		offset: new THREE.Vector3(object.body_offset.x,
			object.body_offset.y,
			object.body_offset.z
		)
	};
	this.feet = {
		geometry: new THREE.SphereGeometry(object.feet_radius, object.body_numSegments, object.body_numSegments),
		offset: new THREE.Vector3(object.feet_offset.x,
			object.feet_offset.y,
			object.feet_offset.z
		)
	};
	this.head.mesh = new THREE.Mesh(this.head.geometry, this.material);
	this.head.mesh.receiveShadow = true;
	this.head.mesh.castShadow = true;
	this.body.mesh = new THREE.Mesh(this.body.geometry, this.material);
	this.body.mesh.receiveShadow = true;
	this.body.mesh.castShadow = true;
	this.feet.mesh = new THREE.Mesh(this.feet.geometry, this.material);
	this.feet.mesh.receiveShadow = true;
	this.feet.mesh.castShadow = true;

	this.update(object); //

	if(!this.self)
	{
		global_scene.add(this.head.mesh);
		global_scene.add(this.body.mesh);
		global_scene.add(this.feet.mesh);
	}
}

function getSelfPosition()
{
	if(selfID != null)
	{
		return objectList.get(selfID).getPosition();
	}
}

function getSelfRotation()
{
	if(selfID != null)
	{
		return objectList.get(selfID).getRotation();
	}
	return null;
}

function getSelfQuaternion()
{
	if(selfID != null)
	{
		return objectList.get(selfID).getQuaternion();
	}
	return null;
}

function updateSelfPosition()
{
	// TO DO
}

function updateSelfRotation(x, y)
{
	if(selfID != null)
	{
		objectList.get(selfID).updateRotation(x, y);
	}
	return null;
}
