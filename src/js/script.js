import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import * as CANNON from "cannon-es"
import { DstColorFactor, Vector3 } from "three";
import { Vec3 } from "cannon-es";
import gsap from "gsap"
import dat from "dat.gui"

var width = window.innerWidth - 20;
var height = window.innerHeight - 50;

const scene = new THREE.Scene();
const world = new CANNON.World({gravity: new CANNON.Vec3(0, 0, 0)});
const camera = new THREE.PerspectiveCamera(50, width / height, .1, 1000);

camera.position.z = 75;
camera.position.y = 30;
camera.position.x = 0;
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setClearColor("#070808");
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);

const gridhelper = new THREE.GridHelper();
scene.add(gridhelper);

const ambientLight = new THREE.AmbientLight("#fafcd7", 0.2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight("#fafcd7", 0.2);
scene.add(directionalLight);

const mousePos = new THREE.Vector2();
const intersectPt = new THREE.Vector3();
const planeNormal = new THREE.Vector3();
const plane = new THREE.Plane();
const raycaster = new THREE.Raycaster();
var sphereMeshes = [];
var sphereBodies = [];

const planetPMat = new CANNON.Material();
world.addContactMaterial(new CANNON.ContactMaterial(
    planetPMat,
    planetPMat
));

//TODO:
//gltf
//interactive click
//background

var controls = new function() {
    this.planetsAmount = 128;
    this.planetSizeMin = 0.2;
    this.planetSizeMax = 1;
    this.planetDistanceMin = 20;
    this.planetDistanceMax = 80;
}

const gui = new dat.GUI();
gui.add({Restart} , "Restart");
gui.add(controls, "planetsAmount");
gui.add(controls, "planetSizeMin");
gui.add(controls, "planetSizeMax");
gui.add(controls, "planetDistanceMin");
gui.add(controls, "planetDistanceMax");

Restart();

function Restart()
{
    if(sphereBodies != null && sphereMeshes != null)
    {
        if(sphereBodies.length > 0 && sphereMeshes.length > 0)
        {
            for(let i = 0; i < sphereBodies.length; i++)
            {
                world.removeBody(sphereBodies[i]);
                scene.remove(sphereMeshes[i]);
            }
        }
    }

    sphereBodies = [];
    sphereMeshes = [];

    CreatePlanet(new Vec3(0, 0, 0), 8);
    for (let i = 0; i < controls.planetsAmount; i++) {
        var randAngle = Math.random() * Math.PI * 2;
        var distance = randomRange(controls.planetDistanceMin, controls.planetDistanceMax);
        CreatePlanet(new Vec3(Math.sin(randAngle) * distance, Math.random(), Math.cos(randAngle) * distance), randomRange(controls.planetSizeMin, controls.planetSizeMax));
    }
}






timeStep = 1/60;
function animate()
{
    world.step(timeStep);
    

    for(let i = 0; i < sphereBodies.length; i++)
    {
        sphereMeshes[i].position.copy(sphereBodies[i].position);
        sphereMeshes[i].quaternion.copy(sphereBodies[i].quaternion);
        for(let x = 0; x < sphereBodies.length; x++)
        {
            if(x != i)
            {
                var force = (sphereBodies[i].mass * sphereBodies[x].mass) / (sphereMeshes[i].position.distanceTo(sphereMeshes[x].position)); //Newton's law of universal gravitation
                var forceVec = new Vec3(sphereBodies[i].position.x - sphereBodies[x].position.x, sphereBodies[i].position.y - sphereBodies[x].position.y, sphereBodies[i].position.z - sphereBodies[x].position.z);
                forceVec.normalize();
                forceVec.x *= -force; forceVec.y *= -force; forceVec.z *= -force;

                //console.log(forceVec);
                sphereBodies[i].applyForce(forceVec);
            }
        }
    }

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener("click", function(e)
{
    
});

function CreatePlanet(pos, radius)
{
    const sphereGeo = new THREE.SphereGeometry(radius);
    var sphereMat = new THREE.MeshStandardMaterial({color: 0xffffff * Math.random()});
    if(radius >= 8)
    {
        sphereMat = new THREE.MeshBasicMaterial({color: 0xf5e598})
    }
    const planet = new THREE.Mesh(sphereGeo, sphereMat);
    planet.scale.set(0, 0, 0);
    gsap.to(planet.scale, { x: 1, y: 1, z: 1, duration: 1 });
    if(radius >= 8)
    {
        var pointLight = new THREE.PointLight(0xf5e598, 5, radius * 8);
        pointLight.position.set(pos.x, pos.y, pos.z);
        planet.add(pointLight);
    }
    planet.position.set(pos.x, pos.y, pos.z);
    const body = new CANNON.Body(
    {   
        type: CANNON.Body.DYNAMIC,
        shape: new CANNON.Sphere(radius),
        mass: radius * radius,
        position: new CANNON.Vec3(pos.x, pos.y, pos.z),
        material: planetPMat
    });

    
    
    scene.add(planet);
    world.addBody(body);

    body.applyImpulse(new Vec3(randomRange(-10, 10), Math.random() * 2, randomRange(-10, 10)));

    sphereMeshes.push(planet);
    sphereBodies.push(body);
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

window.addEventListener("mousemove", function(e)
{
    mousePos.x = (e.clientX / this.window.innerWidth) * 2 - 1;
    mousePos.y = -(e.clientY / this.window.innerHeight) * 2 + 1;

    planeNormal.copy(camera.position).normalize();

    plane.setFromNormalAndCoplanarPoint(planeNormal, scene.position);

    raycaster.setFromCamera(mousePos, camera);
    raycaster.ray.intersectPlane(plane, intersectPt);
});

window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});