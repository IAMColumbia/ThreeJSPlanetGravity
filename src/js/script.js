import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import * as CANNON from "cannon-es"
import { DstColorFactor, Vector3 } from "three";
import { Vec3 } from "cannon-es";

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
const sphereMeshes = [];
const sphereBodies = [];

const planePMat = new CANNON.Material();
const planeBody = new CANNON.Body(
{
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(5,5,.1)),
    material: planePMat
});
planeBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(planeBody);

CreatePlanet(new Vec3(0,0,0), 8);
CreatePlanet(new Vec3(10,0,0), 1);
CreatePlanet(new Vec3(10,10,0), 1);
CreatePlanet(new Vec3(10,0,10), 1);
CreatePlanet(new Vec3(10,0,-2), 1);

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
    const sphereMat = new THREE.MeshStandardMaterial({color: 0xffffff * Math.random()});
    const planet = new THREE.Mesh(sphereGeo, sphereMat);
    planet.position.set(pos.x, pos.y, pos.z);
    const body = new CANNON.Body(
    {   
        type: CANNON.Body.DYNAMIC,
        shape: new CANNON.Sphere(radius) / 2,
        mass: radius * radius,
        position: new CANNON.Vec3(pos.x, pos.y, pos.z)
    });
    
    scene.add(planet);
    world.addBody(body);

    body.applyImpulse(new Vec3(Math.random() * 8, Math.random() * 8, Math.random() * 8));

    sphereMeshes.push(planet);
    sphereBodies.push(body);
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