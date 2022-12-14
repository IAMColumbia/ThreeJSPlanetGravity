import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import * as CANNON from "cannon-es"
import { DstColorFactor, Vector3 } from "three";
import { ConvexPolyhedron, Vec3 } from "cannon-es";
import gsap from "gsap"
import dat from "dat.gui"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'


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
renderer.autoClearColor = false;
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

const leftImage = require("/static/images/sky_stars_01_left.png");
const rightImage = require("/static/images/sky_stars_01_right.png");
const upImage = require("/static/images/sky_stars_01_up.png");
const downImage = require("/static/images/sky_stars_01_down.png");
const frontImage = require("/static/images/sky_stars_01_front.png");
const backImage = require("/static/images/sky_stars_01_back.png");

{
const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    leftImage,
    rightImage,
    upImage,
    downImage,
    frontImage,
    backImage,
  ]);
  scene.background = texture;
}

// {
//     const loader = new THREE.CubeTextureLoader();
//     const texture = loader.load([
//       'https://r105.threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/pos-x.jpg',
//       'https://r105.threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/neg-x.jpg',
//       'https://r105.threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/pos-y.jpg',
//       'https://r105.threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/neg-y.jpg',
//       'https://r105.threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/pos-z.jpg',
//       'https://r105.threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/neg-z.jpg',
//     ]);
//     scene.background = texture;
//   }

const orbit = new OrbitControls(camera, renderer.domElement);

const gridhelper = new THREE.GridHelper();
scene.add(gridhelper);

const ambientLight = new THREE.AmbientLight("#fafcd7", 0.5);
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
//interactive click
//background

var controls = new function() {
    this.planetsAmount = 128;
    this.planetSizeMin = 0.2;
    this.planetSizeMax = 1;
    this.planetDistanceMin = 20;
    this.planetDistanceMax = 80;
    this.spawnSun = true;
    this.monkeyPlanets = false;
    this.monkeyShooterMode = false;
}

const gui = new dat.GUI();
gui.add({Restart} , "Restart");
gui.add(controls, "planetsAmount");
gui.add(controls, "planetSizeMin");
gui.add(controls, "planetSizeMax");
gui.add(controls, "planetDistanceMin");
gui.add(controls, "planetDistanceMax");
gui.add(controls, "spawnSun");
gui.add(controls, "monkeyPlanets");
gui.add(controls, "monkeyShooterMode");

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

    if(controls.spawnSun)
    { CreatePlanet(new Vec3(0, 0, 0), 8, controls.monkeyPlanets); }

    for (let i = 0; i < controls.planetsAmount; i++) {
        var randAngle = Math.random() * Math.PI * 2;
        var distance = randomRange(controls.planetDistanceMin, controls.planetDistanceMax);
        CreatePlanet(new Vec3(Math.sin(randAngle) * distance, Math.random(), Math.cos(randAngle) * distance), randomRange(controls.planetSizeMin, controls.planetSizeMax), controls.monkeyPlanets);
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

function CreatePlanet(pos, radius) { CreatePlanet(pos, radius, true); }
function CreatePlanet(pos, radius, monkeyMode = true)
{
    var planet;
    if (!monkeyMode) {
        const sphereGeo = new THREE.SphereGeometry(radius);
        var sphereMat = new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() });
        if (radius >= 8) {
            sphereMat = new THREE.MeshBasicMaterial({ color: 0xf5e598 })
        }
        planet = new THREE.Mesh(sphereGeo, sphereMat);
        planet.scale.set(0, 0, 0);
        scene.add(planet);
        gsap.to(planet.scale, { x: 1, y: 1, z: 1, duration: 1 });
        if (radius >= 8) {
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

        world.addBody(body);
        body.applyImpulse(new Vec3(randomRange(-10, 10), Math.random() * 2, randomRange(-10, 10)));

        sphereMeshes.push(planet);
        sphereBodies.push(body);
    }
    else
    {
        const monkeyURL = new URL("../monkey.glb", import.meta.url);
        const assetLoader = new GLTFLoader();
        assetLoader.load
            (
                monkeyURL.href,
                function (gltf) {
                    //planet = new THREE.Mesh(gltf.scene.children[0]);
                    planet = gltf.scene;
                    var newMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() });
                    planet.traverse((o) => {
                        if (o.isMesh) o.material = newMaterial;
                    });
                    planet.scale.set(0, 0, 0);
                    scene.add(planet);
                    gsap.to(planet.scale, { x: radius, y: radius, z: radius, duration: 1 });
                    planet.position.set(pos.x, pos.y, pos.z);
                    const body = new CANNON.Body(
                        {
                            type: CANNON.Body.DYNAMIC,
                            shape: new CANNON.Sphere(radius),
                            mass: radius * radius,
                            position: new CANNON.Vec3(pos.x, pos.y, pos.z),
                            material: planetPMat
                        });
                    world.addBody(body);

                    body.applyImpulse(new Vec3(randomRange(-10, 10), Math.random() * 2, randomRange(-10, 10)));

                    sphereMeshes.push(planet);
                    sphereBodies.push(body);
                },
                undefined,
                function (error) {
                    console.error(error);
                    return;
                }
            );
    }
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

window.addEventListener("mousedown", function () {
    if(!controls.monkeyShooterMode)
    { return; }

    CreatePlanet(camera.position, 1, true);
    //ALMOST, just gotta add force in the right direcgion
});

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